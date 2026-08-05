import { synthesizePlaybackSpectrum } from '../audio-lab-signal.js';
import { createVisualController as createBaseVisualController } from './visual-engine-v2.js';

const SHOWCASE_MODES = [
  { id: 'prism-tunnel', label: 'Prism Tunnel' },
  { id: 'aurora-glass', label: 'Aurora Glass' },
  { id: 'cyber-rain', label: 'Cyber Rain' },
  { id: 'wave-cathedral', label: 'Wave Cathedral' },
  { id: 'quantum-grid', label: 'Quantum Grid' }
];

const OVERLAY_MODES = new Set(['circle', ...SHOWCASE_MODES.map(mode => mode.id)]);

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

function audioBands(data) {
  return {
    bass: bandAverage(data, 0, data.length * .16),
    middle: bandAverage(data, data.length * .16, data.length * .58),
    high: bandAverage(data, data.length * .58, data.length),
    energy: bandAverage(data, 0, data.length)
  };
}

export function drawOrbitMode(context, width, height, data, accent, accent2, time) {
  const centerX = width / 2;
  const centerY = height / 2;
  const minSide = Math.min(width, height);
  const { bass, middle, high } = audioBands(data);
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

export function drawPrismTunnelMode(context, width, height, data, accent, accent2, time) {
  const centerX = width / 2;
  const centerY = height / 2;
  const minSide = Math.min(width, height);
  const { bass, middle, high } = audioBands(data);
  const layers = width < 600 ? 24 : 34;

  const backdrop = context.createRadialGradient(centerX, centerY, 0, centerX, centerY, minSide * .62);
  backdrop.addColorStop(0, colorWithAlpha(accent2, .11 + middle * .12));
  backdrop.addColorStop(.42, colorWithAlpha(accent, .045 + bass * .08));
  backdrop.addColorStop(1, 'rgba(0,0,0,0)');
  context.fillStyle = backdrop;
  context.fillRect(0, 0, width, height);

  context.save();
  context.translate(centerX, centerY);
  context.globalCompositeOperation = 'lighter';
  for (let layer = layers - 1; layer >= 0; layer -= 1) {
    const phase = ((layer / layers + time * (.045 + bass * .035)) % 1);
    const depth = phase * phase;
    const sample = data[Math.floor(phase * (data.length - 1))] / 255;
    const radius = minSide * (.045 + depth * .54);
    const sides = layer % 3 === 0 ? 3 : layer % 3 === 1 ? 4 : 6;
    const rotation = time * (layer % 2 ? -.12 : .1) + phase * 1.8;
    context.beginPath();
    for (let side = 0; side <= sides; side += 1) {
      const angle = side / sides * Math.PI * 2 + rotation;
      const squeeze = .58 + middle * .08;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius * squeeze;
      if (!side) context.moveTo(x, y); else context.lineTo(x, y);
    }
    context.closePath();
    const color = layer % 2 ? accent2 : accent;
    context.strokeStyle = colorWithAlpha(color, .07 + (1 - phase) * .38 + sample * .25);
    context.lineWidth = .7 + sample * 2.3 + high * .8;
    context.shadowColor = color;
    context.shadowBlur = 5 + sample * 15;
    context.stroke();
  }

  for (let ray = 0; ray < 10; ray += 1) {
    const angle = ray / 10 * Math.PI * 2 + time * .035;
    const inner = minSide * (.045 + bass * .02);
    const outer = minSide * .56;
    const gradient = context.createLinearGradient(
      Math.cos(angle) * inner,
      Math.sin(angle) * inner,
      Math.cos(angle) * outer,
      Math.sin(angle) * outer
    );
    gradient.addColorStop(0, colorWithAlpha(ray % 2 ? accent2 : accent, .32 + high * .18));
    gradient.addColorStop(1, 'rgba(0,0,0,0)');
    context.strokeStyle = gradient;
    context.lineWidth = .55 + high * .8;
    context.beginPath();
    context.moveTo(Math.cos(angle) * inner, Math.sin(angle) * inner * .58);
    context.lineTo(Math.cos(angle) * outer, Math.sin(angle) * outer * .58);
    context.stroke();
  }
  context.restore();
}

export function drawAuroraGlassMode(context, width, height, data, accent, accent2, time) {
  const { bass, middle, high } = audioBands(data);
  const ribbons = width < 600 ? 6 : 9;
  const horizon = height * (.48 + Math.sin(time * .13) * .025);

  const ambient = context.createLinearGradient(0, 0, 0, height);
  ambient.addColorStop(0, colorWithAlpha(accent2, .035 + high * .04));
  ambient.addColorStop(.5, colorWithAlpha(accent, .08 + middle * .08));
  ambient.addColorStop(1, 'rgba(0,0,0,0)');
  context.fillStyle = ambient;
  context.fillRect(0, 0, width, height);

  context.save();
  context.globalCompositeOperation = 'lighter';
  for (let ribbon = 0; ribbon < ribbons; ribbon += 1) {
    const sample = data[Math.floor(ribbon / ribbons * data.length)] / 255;
    const offset = (ribbon - (ribbons - 1) / 2) * height * .045;
    const amplitude = height * (.05 + sample * .13 + bass * .035);
    const thickness = height * (.018 + middle * .025 + (ribbon % 3) * .004);
    context.beginPath();
    const points = 48;
    for (let point = 0; point <= points; point += 1) {
      const progress = point / points;
      const x = progress * width;
      const wave = Math.sin(progress * Math.PI * (2.2 + ribbon * .12) + time * (.32 + ribbon * .035))
        + Math.sin(progress * Math.PI * 5.2 - time * .21 + ribbon) * .34;
      const y = horizon + offset + wave * amplitude;
      if (!point) context.moveTo(x, y - thickness); else context.lineTo(x, y - thickness);
    }
    for (let point = points; point >= 0; point -= 1) {
      const progress = point / points;
      const x = progress * width;
      const wave = Math.sin(progress * Math.PI * (2.2 + ribbon * .12) + time * (.32 + ribbon * .035))
        + Math.sin(progress * Math.PI * 5.2 - time * .21 + ribbon) * .34;
      const y = horizon + offset + wave * amplitude;
      context.lineTo(x, y + thickness);
    }
    context.closePath();
    const gradient = context.createLinearGradient(0, horizon - amplitude, width, horizon + amplitude);
    gradient.addColorStop(0, colorWithAlpha(ribbon % 2 ? accent : accent2, .02));
    gradient.addColorStop(.28, colorWithAlpha(ribbon % 2 ? accent2 : accent, .16 + sample * .2));
    gradient.addColorStop(.55, colorWithAlpha('#ffffff', .07 + high * .12));
    gradient.addColorStop(.78, colorWithAlpha(ribbon % 2 ? accent : accent2, .14 + middle * .18));
    gradient.addColorStop(1, 'rgba(0,0,0,0)');
    context.fillStyle = gradient;
    context.shadowColor = ribbon % 2 ? accent2 : accent;
    context.shadowBlur = 14 + sample * 26;
    context.fill();
  }
  context.restore();
}

export function drawCyberRainMode(context, width, height, data, accent, accent2, time) {
  const { bass, middle, high } = audioBands(data);
  const columns = width < 600 ? 28 : 46;
  const columnWidth = width / columns;

  const wash = context.createLinearGradient(0, 0, 0, height);
  wash.addColorStop(0, colorWithAlpha(accent2, .035));
  wash.addColorStop(.55, 'rgba(0,0,0,0)');
  wash.addColorStop(1, colorWithAlpha(accent, .06 + bass * .05));
  context.fillStyle = wash;
  context.fillRect(0, 0, width, height);

  context.save();
  context.globalCompositeOperation = 'lighter';
  for (let column = 0; column < columns; column += 1) {
    const sample = data[column % data.length] / 255;
    const speed = .055 + seeded(column, 4) * .12 + bass * .075;
    const head = ((seeded(column, 5) + time * speed) % 1.18 - .09) * height;
    const x = (column + .5) * columnWidth + Math.sin(time * .16 + column) * columnWidth * .08;
    const trail = height * (.07 + sample * .2 + seeded(column, 6) * .08);
    const gradient = context.createLinearGradient(x, head - trail, x, head + 8);
    gradient.addColorStop(0, 'rgba(0,0,0,0)');
    gradient.addColorStop(.72, colorWithAlpha(column % 3 ? accent2 : accent, .08 + sample * .28));
    gradient.addColorStop(1, colorWithAlpha('#ffffff', .28 + high * .32));
    context.strokeStyle = gradient;
    context.lineWidth = .65 + sample * 1.5;
    context.shadowColor = column % 3 ? accent2 : accent;
    context.shadowBlur = 4 + sample * 11;
    context.beginPath();
    context.moveTo(x, head - trail);
    context.lineTo(x, head);
    context.stroke();

    const dashes = 2 + Math.floor(sample * 5);
    for (let dash = 0; dash < dashes; dash += 1) {
      const y = head - trail * (dash + 1) / (dashes + 1);
      const size = 1.2 + middle * 2 + seeded(column * 10 + dash, 7) * 2.4;
      context.fillStyle = colorWithAlpha(column % 2 ? accent : accent2, .1 + sample * .3);
      context.fillRect(x - size * .5, y, size, 1 + high * 1.4);
    }
  }

  context.globalAlpha = .12 + high * .1;
  context.strokeStyle = colorWithAlpha('#ffffff', .16);
  context.lineWidth = .45;
  for (let y = 0; y < height; y += 8) {
    context.beginPath();
    context.moveTo(0, y + Math.sin(time + y * .02) * .7);
    context.lineTo(width, y);
    context.stroke();
  }
  context.restore();
}

export function drawWaveCathedralMode(context, width, height, data, accent, accent2, time) {
  const centerX = width / 2;
  const baseY = height * .9;
  const minSide = Math.min(width, height);
  const { bass, middle, high } = audioBands(data);
  const arches = width < 600 ? 10 : 15;

  const glow = context.createRadialGradient(centerX, height * .56, 0, centerX, height * .56, minSide * .58);
  glow.addColorStop(0, colorWithAlpha(accent, .09 + middle * .08));
  glow.addColorStop(.45, colorWithAlpha(accent2, .035 + bass * .05));
  glow.addColorStop(1, 'rgba(0,0,0,0)');
  context.fillStyle = glow;
  context.fillRect(0, 0, width, height);

  context.save();
  context.globalCompositeOperation = 'lighter';
  for (let arch = 0; arch < arches; arch += 1) {
    const progress = arch / Math.max(1, arches - 1);
    const sample = data[Math.floor(progress * (data.length - 1))] / 255;
    const span = width * (.11 + progress * .39);
    const peak = height * (.16 + progress * .13) + sample * height * .18 + bass * height * .05;
    const sway = Math.sin(time * (.24 + arch * .01) + arch * .6) * width * .008;
    context.beginPath();
    context.moveTo(centerX - span, baseY);
    context.bezierCurveTo(
      centerX - span * .92 + sway,
      baseY - peak * .72,
      centerX - span * .28,
      baseY - peak,
      centerX,
      baseY - peak * (1.08 + middle * .08)
    );
    context.bezierCurveTo(
      centerX + span * .28,
      baseY - peak,
      centerX + span * .92 + sway,
      baseY - peak * .72,
      centerX + span,
      baseY
    );
    const color = arch % 2 ? accent2 : accent;
    context.strokeStyle = colorWithAlpha(color, .055 + sample * .35 + (1 - progress) * .12);
    context.lineWidth = .7 + sample * 2.1 + high * .55;
    context.shadowColor = color;
    context.shadowBlur = 6 + sample * 16;
    context.stroke();
  }

  const columns = width < 600 ? 9 : 13;
  for (let column = 0; column < columns; column += 1) {
    const distance = Math.abs(column - (columns - 1) / 2) / ((columns - 1) / 2);
    const x = centerX + (column - (columns - 1) / 2) * width * .065;
    const sample = data[(column * 5) % data.length] / 255;
    const top = height * (.24 + distance * .16 - sample * .1);
    const gradient = context.createLinearGradient(x, top, x, baseY);
    gradient.addColorStop(0, colorWithAlpha('#ffffff', .2 + high * .18));
    gradient.addColorStop(.35, colorWithAlpha(column % 2 ? accent2 : accent, .13 + sample * .25));
    gradient.addColorStop(1, 'rgba(0,0,0,0)');
    context.strokeStyle = gradient;
    context.lineWidth = .6 + sample * 1.3;
    context.beginPath();
    context.moveTo(x, top);
    context.lineTo(x, baseY);
    context.stroke();
  }
  context.restore();
}

export function drawQuantumGridMode(context, width, height, data, accent, accent2, time) {
  const horizon = height * .52;
  const centerX = width / 2;
  const { bass, middle, high } = audioBands(data);

  const sky = context.createLinearGradient(0, 0, 0, horizon);
  sky.addColorStop(0, colorWithAlpha(accent2, .025));
  sky.addColorStop(1, colorWithAlpha(accent, .09 + middle * .07));
  context.fillStyle = sky;
  context.fillRect(0, 0, width, horizon);

  const ground = context.createLinearGradient(0, horizon, 0, height);
  ground.addColorStop(0, colorWithAlpha(accent, .055 + bass * .045));
  ground.addColorStop(1, 'rgba(0,0,0,0)');
  context.fillStyle = ground;
  context.fillRect(0, horizon, width, height - horizon);

  context.save();
  context.globalCompositeOperation = 'lighter';
  const horizonGlow = context.createLinearGradient(0, horizon - 2, width, horizon + 2);
  horizonGlow.addColorStop(0, 'rgba(0,0,0,0)');
  horizonGlow.addColorStop(.3, colorWithAlpha(accent2, .28 + high * .2));
  horizonGlow.addColorStop(.5, colorWithAlpha('#ffffff', .42 + high * .22));
  horizonGlow.addColorStop(.7, colorWithAlpha(accent, .28 + high * .2));
  horizonGlow.addColorStop(1, 'rgba(0,0,0,0)');
  context.strokeStyle = horizonGlow;
  context.lineWidth = 1.2 + high * 1.4;
  context.beginPath();
  context.moveTo(0, horizon);
  context.lineTo(width, horizon);
  context.stroke();

  const verticals = width < 600 ? 15 : 23;
  for (let line = 0; line < verticals; line += 1) {
    const ratio = line / (verticals - 1) * 2 - 1;
    const sample = data[(line * 3) % data.length] / 255;
    const targetX = centerX + ratio * width * (.62 + bass * .04);
    context.strokeStyle = colorWithAlpha(line % 2 ? accent2 : accent, .08 + sample * .18);
    context.lineWidth = .55 + sample * .75;
    context.beginPath();
    context.moveTo(centerX + ratio * width * .018, horizon);
    const bend = Math.sin(time * .28 + line * .7) * width * .006 * (1 + middle);
    context.quadraticCurveTo(centerX + ratio * width * .26 + bend, height * .72, targetX, height);
    context.stroke();
  }

  const rows = 17;
  for (let row = 0; row < rows; row += 1) {
    const phase = ((row / rows + time * (.045 + bass * .045)) % 1);
    const perspective = phase * phase;
    const y = horizon + perspective * (height - horizon);
    const sample = data[Math.floor(phase * (data.length - 1))] / 255;
    const wave = Math.sin(time * .6 + phase * 9) * bass * height * .012;
    const inset = (1 - perspective) * width * .44;
    context.strokeStyle = colorWithAlpha(row % 2 ? accent2 : accent, .07 + perspective * .24 + sample * .12);
    context.lineWidth = .5 + perspective * 1.25 + high * .35;
    context.beginPath();
    context.moveTo(inset, y + wave);
    context.quadraticCurveTo(centerX, y - bass * height * .025, width - inset, y + wave);
    context.stroke();
  }
  context.restore();
}

function installShowcaseButtons(controls) {
  if (!controls) return;
  controls.querySelector('[data-visual="constellation"]')?.remove();
  controls.style.display = 'flex';
  controls.style.alignItems = 'center';
  controls.style.gap = '8px';
  controls.style.overflowX = 'auto';
  controls.style.overflowY = 'hidden';
  controls.style.flexWrap = 'nowrap';
  controls.style.paddingBottom = '8px';
  controls.style.scrollbarWidth = 'thin';
  controls.style.overscrollBehaviorX = 'contain';

  SHOWCASE_MODES.forEach(({ id, label }) => {
    let button = controls.querySelector(`[data-visual="${id}"]`);
    if (!button) {
      button = document.createElement('button');
      button.className = 'chip';
      button.dataset.visual = id;
      controls.appendChild(button);
    }
    button.textContent = label;
    button.style.flex = '0 0 auto';
  });
}

export function createVisualController(options) {
  const base = createBaseVisualController(options);
  const { audio, $, getAccent } = options;
  const canvas = $('#lab-visualizer');
  const controls = document.querySelector('.lab-controls');
  const data = new Uint8Array(96);
  let mode = 'nebula';
  let frame = 0;

  installShowcaseButtons(controls);

  function selectMode(nextMode, button) {
    mode = nextMode || 'nebula';
    if (canvas) canvas.dataset.visualMode = mode;
    if (button) {
      controls?.querySelectorAll('[data-visual]').forEach(item => item.classList.toggle('active', item === button));
      button.scrollIntoView?.({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  }

  controls?.querySelectorAll('[data-visual]').forEach(button => {
    button.addEventListener('click', () => selectMode(button.dataset.visual, button));
  });
  selectMode(controls?.querySelector('[data-visual].active')?.dataset.visual || 'nebula');

  function render() {
    if (canvas) canvas.dataset.visualMode = mode;
    if (canvas && OVERLAY_MODES.has(mode)) {
      const prepared = prepareCanvas(canvas);
      if (prepared) {
        const playbackTime = Number(audio.currentTime) || 0;
        const animationTime = performance.now() / 1000;
        synthesizePlaybackSpectrum(data, playbackTime + (audio.paused ? animationTime * .08 : 0));
        const [accent, accent2] = getAccent();
        const args = [prepared.context, prepared.width, prepared.height, data, accent, accent2, animationTime];
        switch (mode) {
          case 'circle': drawOrbitMode(...args); break;
          case 'prism-tunnel': drawPrismTunnelMode(...args); break;
          case 'aurora-glass': drawAuroraGlassMode(...args); break;
          case 'cyber-rain': drawCyberRainMode(...args); break;
          case 'wave-cathedral': drawWaveCathedralMode(...args); break;
          case 'quantum-grid': drawQuantumGridMode(...args); break;
          default: break;
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
