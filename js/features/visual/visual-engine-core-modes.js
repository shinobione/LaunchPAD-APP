import { synthesizePlaybackSpectrum } from '../audio-lab-signal.js';
import { createVisualController as createBaseVisualController } from './visual-engine-v2.js';

const CORE_MODES = new Set(['circle', 'bars', 'constellation']);

function clamp(value, minimum = 0, maximum = 1) {
  return Math.max(minimum, Math.min(maximum, value));
}

function colorWithAlpha(color, alpha) {
  const value = clamp(alpha);
  const six = /^#([0-9a-f]{6})$/i.exec(color);
  if (six) {
    const number = Number.parseInt(six[1], 16);
    return `rgba(${number >> 16},${number >> 8 & 255},${number & 255},${value})`;
  }
  const three = /^#([0-9a-f]{3})$/i.exec(color);
  if (three) {
    const [red, green, blue] = three[1].split('').map(part => Number.parseInt(part + part, 16));
    return `rgba(${red},${green},${blue},${value})`;
  }
  return color;
}

function seeded(index, salt = 0) {
  const value = Math.sin(index * 12.9898 + salt * 78.233) * 43758.5453;
  return value - Math.floor(value);
}

function prepareCanvas(canvas) {
  const rect = canvas.getBoundingClientRect();
  if (!rect.width || !rect.height) return null;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const widthPx = Math.round(rect.width * dpr);
  const heightPx = Math.round(rect.height * dpr);
  if (canvas.width !== widthPx || canvas.height !== heightPx) {
    canvas.width = widthPx;
    canvas.height = heightPx;
  }
  const context = canvas.getContext('2d');
  context.setTransform(dpr, 0, 0, dpr, 0, 0);
  context.clearRect(0, 0, rect.width, rect.height);
  context.globalAlpha = 1;
  context.globalCompositeOperation = 'source-over';
  context.shadowBlur = 0;
  return { context, width: rect.width, height: rect.height };
}

function bandAverage(data, start, end) {
  let total = 0;
  const from = Math.max(0, Math.floor(start));
  const to = Math.min(data.length, Math.ceil(end));
  for (let index = from; index < to; index += 1) total += data[index];
  return total / Math.max(1, to - from) / 255;
}

export function drawOrbitMode(context, width, height, data, accent, accent2, time) {
  const centerX = width / 2;
  const centerY = height / 2;
  const minSide = Math.min(width, height);
  const bass = bandAverage(data, 0, data.length * .16);
  const middle = bandAverage(data, data.length * .16, data.length * .58);
  const high = bandAverage(data, data.length * .58, data.length);
  const spokes = width < 600 ? 52 : 76;

  const glow = context.createRadialGradient(centerX, centerY, 0, centerX, centerY, minSide * .42);
  glow.addColorStop(0, colorWithAlpha(accent, .18 + bass * .2));
  glow.addColorStop(.32, colorWithAlpha(accent2, .07 + middle * .12));
  glow.addColorStop(1, 'rgba(0,0,0,0)');
  context.fillStyle = glow;
  context.fillRect(0, 0, width, height);

  context.save();
  context.translate(centerX, centerY);
  context.rotate(time * .07);
  context.globalCompositeOperation = 'lighter';
  for (let index = 0; index < spokes; index += 1) {
    const sample = data[Math.floor(index / spokes * data.length)] / 255;
    const angle = index / spokes * Math.PI * 2;
    const inner = minSide * (.19 + bass * .025);
    const length = minSide * (.035 + sample * .15 + (index % 4 === 0 ? high * .04 : 0));
    const outer = inner + length;
    context.strokeStyle = colorWithAlpha(index % 3 ? accent : accent2, .16 + sample * .72);
    context.lineWidth = .8 + sample * 2.8;
    context.shadowColor = index % 3 ? accent : accent2;
    context.shadowBlur = 4 + sample * 15;
    context.beginPath();
    context.moveTo(Math.cos(angle) * inner, Math.sin(angle) * inner);
    context.lineTo(Math.cos(angle) * outer, Math.sin(angle) * outer);
    context.stroke();
  }

  for (let ring = 0; ring < 4; ring += 1) {
    const pulse = Math.sin(time * (1.25 + ring * .18) + ring * 1.4) * .5 + .5;
    const radius = minSide * (.18 + ring * .055 + pulse * .012 + bass * .018);
    context.strokeStyle = colorWithAlpha(ring % 2 ? accent2 : accent, .12 + middle * .25 - ring * .012);
    context.lineWidth = 1 + (3 - ring) * .25 + bass * 1.5;
    context.beginPath();
    context.arc(0, 0, radius, 0, Math.PI * 2);
    context.stroke();
  }
  context.restore();
}

export function drawConstellationMode(context, width, height, data, accent, accent2, time) {
  const nodeCount = width < 600 ? 34 : 52;
  const nodes = [];
  const energy = bandAverage(data, 0, data.length);
  const high = bandAverage(data, data.length * .55, data.length);

  for (let index = 0; index < nodeCount; index += 1) {
    const sample = data[index % data.length] / 255;
    const driftX = Math.sin(time * (.08 + seeded(index, 2) * .12) + index) * width * .018;
    const driftY = Math.cos(time * (.07 + seeded(index, 3) * .1) + index * .7) * height * .022;
    nodes.push({
      x: seeded(index, 7) * width + driftX,
      y: seeded(index, 11) * height + driftY,
      radius: .8 + sample * 2.7 + (index % 13 === 0 ? 1.4 : 0),
      sample
    });
  }

  context.save();
  context.globalCompositeOperation = 'lighter';
  const linkDistance = Math.min(width, height) * (.19 + energy * .03);
  for (let first = 0; first < nodes.length; first += 1) {
    for (let second = first + 1; second < nodes.length; second += 1) {
      const dx = nodes[first].x - nodes[second].x;
      const dy = nodes[first].y - nodes[second].y;
      const distance = Math.hypot(dx, dy);
      if (distance > linkDistance) continue;
      const strength = 1 - distance / linkDistance;
      context.strokeStyle = colorWithAlpha((first + second) % 2 ? accent2 : accent, strength * (.08 + energy * .24));
      context.lineWidth = .45 + strength * 1.1;
      context.beginPath();
      context.moveTo(nodes[first].x, nodes[first].y);
      context.lineTo(nodes[second].x, nodes[second].y);
      context.stroke();
    }
  }

  nodes.forEach((node, index) => {
    const color = index % 3 ? accent2 : accent;
    context.fillStyle = colorWithAlpha(color, .42 + node.sample * .5);
    context.shadowColor = color;
    context.shadowBlur = 5 + node.sample * 18 + high * 7;
    context.beginPath();
    context.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
    context.fill();
  });
  context.restore();
}

export function createVisualController(options) {
  const base = createBaseVisualController(options);
  const { audio, $, getAccent } = options;
  const canvas = $('#lab-visualizer');
  const data = new Uint8Array(96);
  let mode = document.querySelector('.lab-controls [data-visual].active')?.dataset.visual || 'nebula';
  let frame = 0;

  function selectMode(nextMode) {
    mode = nextMode || 'nebula';
    if (canvas) canvas.dataset.visualMode = mode;
  }

  document.querySelectorAll('.lab-controls [data-visual]').forEach(button => {
    button.addEventListener('click', () => selectMode(button.dataset.visual));
  });
  selectMode(mode);

  function render() {
    if (canvas && CORE_MODES.has(mode)) {
      canvas.dataset.visualMode = mode;
      if (mode !== 'bars') {
        const prepared = prepareCanvas(canvas);
        if (prepared) {
          const playbackTime = Number(audio.currentTime) || 0;
          const animationTime = performance.now() / 1000;
          synthesizePlaybackSpectrum(data, playbackTime + (audio.paused ? animationTime * .08 : 0));
          const [accent, accent2] = getAccent();
          if (mode === 'circle') {
            drawOrbitMode(prepared.context, prepared.width, prepared.height, data, accent, accent2, animationTime);
          } else {
            drawConstellationMode(prepared.context, prepared.width, prepared.height, data, accent, accent2, animationTime);
          }
        }
      }
    }
    frame = requestAnimationFrame(render);
  }

  frame = requestAnimationFrame(render);
  return {
    ...base,
    resume() {
      base.resume();
      if (!frame) frame = requestAnimationFrame(render);
    }
  };
}
