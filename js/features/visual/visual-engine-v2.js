import { createAudioReactivityTracker } from './audio-reactivity.js';

export function createVisualController({ audio, $, getAccent, delegatedModes = [], externalHomeRenderer = false }) {
  let context;
  let analyser;
  let source;
  let frame;
  let mode = 'nebula';

  const BASE_MODES = [
    { id: 'singularity', label: 'Singularity' },
    { id: 'neon-shatter', label: 'Neon Shatter' },
    { id: 'liquid-chrome', label: 'Liquid Chrome' },
    { id: 'nebula', label: 'Nebula' }
  ];
  const delegatedModeSet = new Set(delegatedModes);
  const reactivity = createAudioReactivityTracker();

  function setupAudio() {
    if (context) return;
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    context = new AudioContextClass();
    analyser = context.createAnalyser();
    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = .84;
    source = context.createMediaElementSource(audio);
    source.connect(analyser);
    analyser.connect(context.destination);
  }

  function resume() {
    setupAudio();
    context?.resume();
  }

  function getData() {
    const size = analyser ? analyser.frequencyBinCount : 64;
    const data = new Uint8Array(size);
    if (analyser) analyser.getByteFrequencyData(data);
    else {
      const now = Date.now() / 620;
      for (let index = 0; index < size; index += 1) data[index] = 34 + 22 * Math.sin(now + index * .72);
    }
    return data;
  }

  function average(data, start = 0, end = data.length) {
    const from = Math.max(0, Math.floor(start));
    const to = Math.min(data.length, Math.ceil(end));
    let total = 0;
    for (let index = from; index < to; index += 1) total += data[index];
    return total / Math.max(1, to - from) / 255;
  }

  function bands(data) {
    return {
      bass: average(data, 0, data.length * .13),
      mid: average(data, data.length * .13, data.length * .52),
      high: average(data, data.length * .52),
      energy: average(data)
    };
  }

  function colorWithAlpha(color, alpha) {
    const value = Math.max(0, Math.min(1, alpha));
    const six = /^#([0-9a-f]{6})$/i.exec(color);
    if (six) {
      const number = Number.parseInt(six[1], 16);
      return `rgba(${number >> 16},${number >> 8 & 255},${number & 255},${value})`;
    }
    const three = /^#([0-9a-f]{3})$/i.exec(color);
    if (three) {
      const [r, g, b] = three[1].split('').map(part => Number.parseInt(part + part, 16));
      return `rgba(${r},${g},${b},${value})`;
    }
    return color;
  }

  function seeded(index, salt = 0) {
    const value = Math.sin(index * 12.9898 + salt * 78.233) * 43758.5453;
    return value - Math.floor(value);
  }

  function drawNebula(ctx, width, height, data, accent, accent2, features) {
    const { bass, high, energy, kick, intensity } = features;
    const time = performance.now() / 1000;
    const minSide = Math.min(width, height);
    const spreadX = width * (.27 + intensity * .045);
    const spreadY = height * (.23 + energy * .045);

    const vignette = ctx.createRadialGradient(width / 2, height / 2, minSide * .08, width / 2, height / 2, minSide * .72);
    vignette.addColorStop(0, colorWithAlpha(accent, .018 + energy * .028));
    vignette.addColorStop(.56, 'rgba(3,2,12,.05)');
    vignette.addColorStop(1, 'rgba(0,0,0,.26)');
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, width, height);

    ctx.save();
    ctx.globalCompositeOperation = 'source-over';
    for (let cloud = 0; cloud < 8; cloud += 1) {
      const value = data[Math.floor(cloud / 8 * data.length)] / 255;
      const direction = cloud % 2 ? -1 : 1;
      const angle = time * (.016 + cloud * .0018 + energy * .006) * direction + cloud * 1.63;
      const depth = .58 + seeded(cloud, 21) * .54;
      const x = width / 2
        + Math.cos(angle) * spreadX * depth
        + Math.sin(time * .28 + cloud) * width * (.003 + kick * .004);
      const y = height / 2
        + Math.sin(angle * 1.16) * spreadY * depth
        + Math.cos(time * .24 + cloud) * height * (.003 + kick * .003);
      const radius = minSide * (.12 + value * .08 + bass * .025 + kick * .018) * depth;
      const gradient = ctx.createRadialGradient(x, y, radius * .08, x, y, radius);
      gradient.addColorStop(0, colorWithAlpha(cloud % 2 ? accent2 : accent, .18 + value * .18 + kick * .035));
      gradient.addColorStop(.38, colorWithAlpha(cloud % 2 ? accent : accent2, .085 + energy * .07));
      gradient.addColorStop(.72, colorWithAlpha(cloud % 2 ? accent2 : accent, .022 + high * .025));
      gradient.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.ellipse(x, y, radius * (1.18 + seeded(cloud, 8) * .28), radius * (.72 + seeded(cloud, 9) * .2), angle * .18, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    const stars = width < 520 ? 38 : 58;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let index = 0; index < stars; index += 1) {
      const value = data[index % data.length] / 255;
      const drift = Math.sin(time * (.055 + seeded(index, 23) * .08) + index) * (1 + kick * 1.8);
      const x = seeded(index, 1) * width + drift;
      const y = seeded(index, 2) * height + Math.cos(time * .05 + index) * (.6 + kick * 1.3);
      const size = .45 + value * 1.55 + high * .65 + (index % 13 === 0 ? .8 : 0);
      ctx.globalAlpha = .16 + value * .52 + high * .09;
      ctx.fillStyle = index % 3 ? accent2 : accent;
      ctx.shadowColor = ctx.fillStyle;
      ctx.shadowBlur = 1.5 + value * 5;
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawSingularity(ctx, width, height, data, accent, accent2) {
    const { bass, mid, high } = bands(data);
    const time = performance.now() / 1000;
    const cx = width / 2;
    const cy = height / 2;
    const minSide = Math.min(width, height);
    const horizon = minSide * (.105 + bass * .03);
    const glow = ctx.createRadialGradient(cx, cy, horizon * .75, cx, cy, minSide * .43);
    glow.addColorStop(0, 'rgba(0,0,0,.99)');
    glow.addColorStop(.23, colorWithAlpha(accent, .085 + bass * .11));
    glow.addColorStop(.5, colorWithAlpha(accent2, .035 + mid * .07));
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, width, height);

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(-.16 + Math.sin(time * .1) * .018);
    ctx.scale(1, .34);
    ctx.globalCompositeOperation = 'source-over';
    const rings = width < 520 ? 32 : 46;
    for (let index = 0; index < rings; index += 1) {
      const progress = index / rings;
      const value = data[index % data.length] / 255;
      const radius = horizon * 1.34 + progress * minSide * .335;
      const start = time * (.13 + bass * .16) + index * .245;
      const length = Math.PI * (1.02 + value * .58);
      ctx.beginPath();
      ctx.arc(0, 0, radius, start, start + length);
      ctx.strokeStyle = colorWithAlpha(index % 3 ? accent : accent2, .075 + value * .32);
      ctx.lineWidth = .52 + value * 1.55;
      ctx.shadowColor = index % 3 ? accent : accent2;
      ctx.shadowBlur = 1 + value * 3.8;
      ctx.stroke();

      if (index % 4 === 0) {
        ctx.beginPath();
        ctx.arc(0, 0, radius, start + .025, start + length * .72);
        ctx.strokeStyle = colorWithAlpha('#ffffff', .025 + high * .08 + value * .06);
        ctx.lineWidth = .35 + high * .45;
        ctx.shadowBlur = 0;
        ctx.stroke();
      }
    }
    ctx.restore();

    ctx.save();
    ctx.fillStyle = '#010103';
    ctx.shadowColor = colorWithAlpha(accent, .42);
    ctx.shadowBlur = 5 + bass * 8;
    ctx.beginPath();
    ctx.arc(cx, cy, horizon, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = colorWithAlpha('#ffffff', .12 + high * .14);
    ctx.lineWidth = .75 + high * .65;
    ctx.beginPath();
    ctx.arc(cx, cy, horizon * 1.015, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    const dust = width < 520 ? 42 : 62;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let index = 0; index < dust; index += 1) {
      const value = data[index % data.length] / 255;
      const progress = (seeded(index, 4) + time * (.013 + value * .022)) % 1;
      const radius = horizon * 1.45 + progress * minSide * .385;
      const angle = seeded(index, 5) * Math.PI * 2 - time * (.14 + bass * .28) - progress * 4.8;
      const x = cx + Math.cos(angle) * radius;
      const y = cy + Math.sin(angle) * radius * .42;
      ctx.globalAlpha = .16 + value * .52 + high * .065;
      ctx.fillStyle = index % 2 ? accent2 : accent;
      ctx.shadowColor = ctx.fillStyle;
      ctx.shadowBlur = index % 7 === 0 ? 2.5 : 0;
      ctx.beginPath();
      ctx.arc(x, y, .45 + value * 1.35, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawNeonShatter(ctx, width, height, data, accent, accent2, features) {
    const { bass, mid, high, energy, kick, intensity } = features;
    const time = performance.now() / 1000;
    const cx = width / 2;
    const cy = height / 2;
    const minSide = Math.min(width, height);
    const fragments = width < 520 ? 36 : 54;
    const burst = .34 + bass * .55 + kick * .55;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.globalCompositeOperation = 'lighter';
    for (let index = 0; index < fragments; index += 1) {
      const depth = .35 + seeded(index, 31) * 1.05;
      const angle = seeded(index, 7) * Math.PI * 2
        + time * (seeded(index, 32) - .5) * (.12 + energy * .16)
        + Math.sin(time * .42 + index) * .12;
      const value = data[index % data.length] / 255;
      const distance = minSide * (.07 + seeded(index, 8) * .46 * burst) * depth;
      const spin = time * (index % 2 ? -.32 : .38) * (1.25 - depth * .25) + seeded(index, 9) * Math.PI;
      const perspective = .62 + depth * .52;
      const size = minSide * (.015 + seeded(index, 10) * .042) * (1 + value * .58 + kick * .18) * perspective;
      const x = Math.cos(angle) * distance + Math.sin(time * .75 + index) * minSide * .018 * depth;
      const y = Math.sin(angle) * distance * (.72 + depth * .22) + Math.cos(time * .62 + index * .7) * minSide * .016 * depth;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(spin);
      ctx.scale(perspective, perspective);
      ctx.beginPath();
      ctx.moveTo(-size * .7, size * .45);
      ctx.lineTo(size, 0);
      ctx.lineTo(-size * .25, -size);
      ctx.closePath();
      ctx.fillStyle = colorWithAlpha(index % 2 ? accent2 : accent, .06 + value * .24 + intensity * .08);
      ctx.strokeStyle = colorWithAlpha(index % 2 ? accent : accent2, .3 + value * .55 + kick * .12);
      ctx.lineWidth = .65 + value * 1.7 + high * .45;
      ctx.shadowColor = index % 2 ? accent2 : accent;
      ctx.shadowBlur = 8 + value * 20 + kick * 10;
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
    ctx.restore();

    const core = ctx.createRadialGradient(cx, cy, 0, cx, cy, minSide * (.17 + bass * .05 + kick * .03));
    core.addColorStop(0, colorWithAlpha('#ffffff', .74 + high * .2));
    core.addColorStop(.12, colorWithAlpha(accent, .58 + kick * .14));
    core.addColorStop(.42, colorWithAlpha(accent2, .17 + mid * .2));
    core.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = core;
    ctx.beginPath();
    ctx.arc(cx, cy, minSide * (.18 + bass * .045 + kick * .025), 0, Math.PI * 2);
    ctx.fill();

    const cracks = 16;
    for (let index = 0; index < cracks; index += 1) {
      const angle = index / cracks * Math.PI * 2 + time * (.04 + energy * .05);
      const length = minSide * (.2 + seeded(index, 12) * .32 + bass * .07 + kick * .08);
      ctx.strokeStyle = colorWithAlpha(index % 2 ? accent2 : accent, .23 + high * .48 + kick * .14);
      ctx.lineWidth = .7 + high * 1.9 + kick * .7;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(angle) * minSide * .07, cy + Math.sin(angle) * minSide * .07);
      ctx.lineTo(cx + Math.cos(angle + .08) * length, cy + Math.sin(angle + .08) * length);
      ctx.stroke();
    }
  }

  function drawLiquidChrome(ctx, width, height, data, accent, accent2) {
    const { bass, mid, high } = bands(data);
    const time = performance.now() / 1000;
    const cx = width / 2;
    const cy = height / 2;
    const minSide = Math.min(width, height);
    const points = width < 520 ? 64 : 92;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.beginPath();
    for (let index = 0; index <= points; index += 1) {
      const angle = index / points * Math.PI * 2;
      const sample = data[Math.floor(index % points / points * data.length)] / 255;
      const wave = Math.sin(angle * 3 + time * .55) * (.025 + mid * .045)
        + Math.sin(angle * 7 - time * .83) * (.012 + high * .028);
      const radius = minSide * (.22 + bass * .035 + sample * .06 + wave);
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius * (.82 + Math.sin(time * .2) * .035);
      if (!index) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.closePath();
    const gradient = ctx.createLinearGradient(-minSide * .3, -minSide * .3, minSide * .3, minSide * .3);
    gradient.addColorStop(0, colorWithAlpha('#ffffff', .78));
    gradient.addColorStop(.18, colorWithAlpha(accent, .8));
    gradient.addColorStop(.48, colorWithAlpha('#dce8ff', .4));
    gradient.addColorStop(.72, colorWithAlpha(accent2, .82));
    gradient.addColorStop(1, colorWithAlpha('#05050a', .9));
    ctx.fillStyle = gradient;
    ctx.shadowColor = accent;
    ctx.shadowBlur = 18 + bass * 28;
    ctx.fill();
    ctx.lineWidth = 1.2 + high * 2;
    ctx.strokeStyle = colorWithAlpha('#ffffff', .35 + high * .35);
    ctx.stroke();
    ctx.restore();
  }

  function drawSpectrum(ctx, width, height, data, accent, accent2) {
    const gradient = ctx.createLinearGradient(0, height, width, 0);
    gradient.addColorStop(0, accent);
    gradient.addColorStop(1, accent2);
    ctx.fillStyle = gradient;
    const barWidth = width / data.length * .68;
    data.forEach((value, index) => {
      const barHeight = Math.max(3, value / 255 * height * .75);
      ctx.globalAlpha = .45 + value / 510;
      ctx.fillRect(index / data.length * width, height - barHeight, barWidth, barHeight);
    });
    ctx.globalAlpha = 1;
  }

  function draw(canvas, visualMode) {
    if (!canvas) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const widthPx = Math.round(rect.width * dpr);
    const heightPx = Math.round(rect.height * dpr);
    if (canvas.width !== widthPx || canvas.height !== heightPx) {
      canvas.width = widthPx;
      canvas.height = heightPx;
    }
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const width = rect.width;
    const height = rect.height;
    ctx.clearRect(0, 0, width, height);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    ctx.shadowBlur = 0;
    const data = getData();
    const features = reactivity.update(data);
    const [accent, accent2] = getAccent();
    switch (visualMode) {
      case 'singularity': drawSingularity(ctx, width, height, data, accent, accent2); break;
      case 'neon-shatter': drawNeonShatter(ctx, width, height, data, accent, accent2, features); break;
      case 'liquid-chrome': drawLiquidChrome(ctx, width, height, data, accent, accent2); break;
      case 'nebula': drawNebula(ctx, width, height, data, accent, accent2, features); break;
      default: drawSpectrum(ctx, width, height, data, accent, accent2);
    }
  }

  function start() {
    cancelAnimationFrame(frame);
    const frameInterval = 1000 / 30;
    let lastFrameAt = 0;

    const loop = now => {
      const homeActive = document.querySelector('#view-home')?.classList.contains('active') === true;
      const labActive = document.querySelector('#view-lab')?.classList.contains('active') === true;
      const delegated = delegatedModeSet.has(mode);

      if (document.visibilityState !== 'hidden' && now - lastFrameAt >= frameInterval) {
        lastFrameAt = now;
        if (homeActive && !externalHomeRenderer && !delegated) draw($('#home-visualizer'), mode);
        if (labActive && !delegated) draw($('#lab-visualizer'), mode);
      }

      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
  }

  function startAmbient() {
    const canvas = $('#ambient');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const particles = Array.from({ length: 30 }, (_, index) => ({ seedX: index * 9, seedY: index * 5, radius: 2 + index % 3, alpha: .025 + index % 5 * .006 }));
    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(window.innerWidth * dpr);
      canvas.height = Math.round(window.innerHeight * dpr);
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    function loop() {
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      particles.forEach((particle, index) => {
        const x = (Math.sin(Date.now() / 5000 + particle.seedX) + 1) / 2 * window.innerWidth;
        const y = (Math.cos(Date.now() / 6000 + particle.seedY) + 1) / 2 * window.innerHeight;
        ctx.fillStyle = `rgba(${120 + index * 3},55,255,${particle.alpha})`;
        ctx.beginPath();
        ctx.arc(x, y, particle.radius, 0, Math.PI * 2);
        ctx.fill();
      });
      requestAnimationFrame(loop);
    }
    resize();
    window.addEventListener('resize', resize, { passive: true });
    loop();
  }

  function installModeButtons() {
    const controls = document.querySelector('.lab-controls');
    if (!controls) return;
    const allowedModes = new Set(['bars', ...BASE_MODES.map(item => item.id), ...delegatedModeSet]);
    controls.querySelectorAll('[data-visual]').forEach(button => {
      if (!allowedModes.has(button.dataset.visual)) button.remove();
    });
    BASE_MODES.forEach(({ id, label }) => {
      let button = controls.querySelector(`[data-visual="${id}"]`);
      if (!button) {
        button = document.createElement('button');
        button.className = 'chip';
        button.dataset.visual = id;
        controls.appendChild(button);
      }
      button.textContent = label;
    });
  }

  function setMode(nextMode, button) {
    mode = nextMode || 'nebula';
    const controls = document.querySelector('.lab-controls');
    if (button && controls) {
      controls.querySelectorAll('[data-visual]').forEach(item => item.classList.toggle('active', item === button));
    }
  }

  installModeButtons();
  const controls = document.querySelector('.lab-controls');
  controls?.querySelectorAll('[data-visual]').forEach(button => {
    button.classList.toggle('active', button.dataset.visual === mode);
    button.addEventListener('click', () => setMode(button.dataset.visual, button));
  });
  const homeTitle = document.querySelector('.now-panel .panel-head h3');
  if (homeTitle && !externalHomeRenderer) homeTitle.textContent = 'Nebula spectrum';
  start();
  startAmbient();
  return { resume, setMode };
}
