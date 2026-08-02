export function createVisualController({ audio, $, getAccent }) {
  let context;
  let analyser;
  let source;
  let frame;
  let mode = 'nebula';

  const EXTRA_MODES = [
    { id: 'vortex', label: 'Vortex' },
    { id: 'pulse', label: 'Pulse' },
    { id: 'nebula', label: 'Nebula' }
  ];

  function setupAudio() {
    if (context) return;
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;

    context = new AudioContextClass();
    analyser = context.createAnalyser();
    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = .82;
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

    if (analyser) {
      analyser.getByteFrequencyData(data);
    } else {
      const now = Date.now() / 620;
      for (let index = 0; index < size; index += 1) {
        data[index] = 34 + 22 * Math.sin(now + index * .72);
      }
    }

    return data;
  }

  function average(data, start = 0, end = data.length) {
    const from = Math.max(0, start);
    const to = Math.min(data.length, end);
    let total = 0;
    for (let index = from; index < to; index += 1) total += data[index];
    return total / Math.max(1, to - from) / 255;
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

  function drawOrbital(ctx, width, height, data, accent, accent2) {
    const centerX = width / 2;
    const centerY = height / 2 + 3;
    const minSide = Math.min(width, height);
    const baseRadius = minSide * .19;
    const energy = average(data);
    const time = performance.now() / 1000;

    const glow = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, baseRadius * 2.15);
    glow.addColorStop(0, colorWithAlpha(accent, .27));
    glow.addColorStop(.38, colorWithAlpha(accent2, .12));
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(centerX, centerY, baseRadius * 2.15, 0, Math.PI * 2);
    ctx.fill();

    [1, 1.34, 1.72].forEach((scale, index) => {
      ctx.beginPath();
      ctx.arc(centerX, centerY, baseRadius * scale, 0, Math.PI * 2);
      ctx.strokeStyle = index === 0
        ? colorWithAlpha(accent, .44)
        : colorWithAlpha(accent2, index === 1 ? .21 : .13);
      ctx.lineWidth = index === 0 ? 1.4 : 1;
      ctx.stroke();
    });

    const samples = Math.min(72, data.length);
    for (let index = 0; index < samples; index += 1) {
      const value = data[Math.floor(index / samples * data.length)] / 255;
      const angle = index / samples * Math.PI * 2 - Math.PI / 2;
      const inner = baseRadius * 1.08;
      const outer = inner + 7 + value * minSide * .14;
      const x1 = centerX + Math.cos(angle) * inner;
      const y1 = centerY + Math.sin(angle) * inner;
      const x2 = centerX + Math.cos(angle) * outer;
      const y2 = centerY + Math.sin(angle) * outer;
      const stroke = ctx.createLinearGradient(x1, y1, x2, y2);
      stroke.addColorStop(0, colorWithAlpha(accent, .32));
      stroke.addColorStop(1, index % 2 ? accent2 : accent);
      ctx.strokeStyle = stroke;
      ctx.globalAlpha = .36 + value * .64;
      ctx.lineWidth = 1.2 + value * 2.1;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    for (let index = 0; index < 5; index += 1) {
      const orbitRadius = baseRadius * (1.38 + index * .11);
      const speed = .18 + index * .035;
      const angle = time * speed * (index % 2 ? -1 : 1) + index * 1.36;
      const dotSize = 1.7 + energy * 2.5 + index * .15;
      const x = centerX + Math.cos(angle) * orbitRadius;
      const y = centerY + Math.sin(angle) * orbitRadius;
      ctx.fillStyle = index % 2 ? accent2 : accent;
      ctx.shadowColor = ctx.fillStyle;
      ctx.shadowBlur = 12 + energy * 18;
      ctx.beginPath();
      ctx.arc(x, y, dotSize, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.shadowBlur = 0;
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

  function drawConstellation(ctx, width, height, data, accent, accent2) {
    const time = performance.now() / 1000;
    const count = Math.min(width < 520 ? 23 : 30, data.length);
    const points = [];
    const energy = average(data);

    const haze = ctx.createRadialGradient(width * .5, height * .48, 0, width * .5, height * .48, Math.min(width, height) * .55);
    haze.addColorStop(0, colorWithAlpha(accent2, .13));
    haze.addColorStop(.45, colorWithAlpha(accent, .065));
    haze.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = haze;
    ctx.fillRect(0, 0, width, height);

    for (let index = 0; index < count; index += 1) {
      const value = data[Math.floor(index / count * data.length)] / 255;
      const x = width * (.1 + .8 * ((Math.sin(index * 12.9898) + 1) / 2))
        + Math.sin(time * (.18 + index % 5 * .025) + index) * (12 + value * 22);
      const y = height * (.12 + .76 * ((Math.cos(index * 8.233) + 1) / 2))
        + Math.cos(time * (.16 + index % 7 * .02) + index * .7) * (10 + value * 18);
      points.push({ x, y, value });
    }

    const threshold = Math.min(width, height) * .24;
    for (let a = 0; a < points.length; a += 1) {
      for (let b = a + 1; b < points.length; b += 1) {
        const distance = Math.hypot(points[a].x - points[b].x, points[a].y - points[b].y);
        if (distance > threshold) continue;
        ctx.strokeStyle = colorWithAlpha(a % 2 ? accent2 : accent, (1 - distance / threshold) * .18);
        ctx.lineWidth = .55 + (points[a].value + points[b].value) * .55;
        ctx.beginPath();
        ctx.moveTo(points[a].x, points[a].y);
        ctx.lineTo(points[b].x, points[b].y);
        ctx.stroke();
      }
    }

    points.forEach((point, index) => {
      const radius = 1.6 + point.value * 4.2 + energy * .8;
      ctx.fillStyle = index % 2 ? accent2 : accent;
      ctx.shadowColor = ctx.fillStyle;
      ctx.shadowBlur = 8 + point.value * 18;
      ctx.globalAlpha = .5 + point.value * .5;
      ctx.beginPath();
      ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
      ctx.fill();
    });

    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
  }

  function drawVortex(ctx, width, height, data, accent, accent2) {
    const centerX = width / 2;
    const centerY = height / 2;
    const minSide = Math.min(width, height);
    const time = performance.now() / 1000;
    const bass = average(data, 0, Math.max(6, data.length * .12));
    const arms = 4;
    const samples = width < 520 ? 48 : 68;

    const haze = ctx.createRadialGradient(centerX, centerY, minSide * .08, centerX, centerY, minSide * .52);
    haze.addColorStop(0, 'rgba(0,0,0,0)');
    haze.addColorStop(.42, colorWithAlpha(accent, .08 + bass * .08));
    haze.addColorStop(.75, colorWithAlpha(accent2, .08));
    haze.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = haze;
    ctx.fillRect(0, 0, width, height);

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let arm = 0; arm < arms; arm += 1) {
      ctx.beginPath();
      for (let index = 0; index < samples; index += 1) {
        const progress = index / (samples - 1);
        const value = data[Math.floor(progress * (data.length - 1))] / 255;
        const radius = minSide * (.18 + progress * .34 + value * .025);
        const angle = arm / arms * Math.PI * 2
          + progress * Math.PI * 3.8
          + time * (.34 + bass * .24);
        const x = centerX + Math.cos(angle) * radius;
        const y = centerY + Math.sin(angle) * radius * .72;
        if (index === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = colorWithAlpha(arm % 2 ? accent2 : accent, .28 + bass * .3);
      ctx.lineWidth = 1.2 + bass * 2.5;
      ctx.shadowColor = arm % 2 ? accent2 : accent;
      ctx.shadowBlur = 12 + bass * 22;
      ctx.stroke();
    }

    for (let index = 0; index < 34; index += 1) {
      const value = data[index % data.length] / 255;
      const progress = (index + 1) / 35;
      const radius = minSide * (.2 + progress * .32);
      const angle = progress * Math.PI * 8 - time * (.24 + value * .2) + index * .43;
      const x = centerX + Math.cos(angle) * radius;
      const y = centerY + Math.sin(angle) * radius * .72;
      ctx.fillStyle = index % 2 ? accent2 : accent;
      ctx.globalAlpha = .22 + value * .68;
      ctx.beginPath();
      ctx.arc(x, y, .8 + value * 2.4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawPulse(ctx, width, height, data, accent, accent2) {
    const centerX = width / 2;
    const centerY = height / 2;
    const minSide = Math.min(width, height);
    const time = performance.now() / 1000;
    const bass = average(data, 0, Math.max(5, data.length * .1));
    const mid = average(data, Math.floor(data.length * .1), Math.floor(data.length * .45));
    const maxRadius = minSide * .53;

    const flash = ctx.createRadialGradient(centerX, centerY, minSide * .12, centerX, centerY, maxRadius);
    flash.addColorStop(0, colorWithAlpha(accent, .04));
    flash.addColorStop(.45, colorWithAlpha(accent2, .06 + bass * .08));
    flash.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = flash;
    ctx.fillRect(0, 0, width, height);

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let index = 0; index < 7; index += 1) {
      const phase = (time * (.34 + bass * .42) + index / 7) % 1;
      const radius = minSide * .18 + phase * minSide * .34;
      const alpha = (1 - phase) * (.12 + bass * .34);
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      ctx.strokeStyle = colorWithAlpha(index % 2 ? accent2 : accent, alpha);
      ctx.lineWidth = 1 + (1 - phase) * (2.2 + bass * 3);
      ctx.shadowColor = index % 2 ? accent2 : accent;
      ctx.shadowBlur = 10 + bass * 22;
      ctx.stroke();
    }

    const samples = Math.min(96, data.length);
    ctx.beginPath();
    for (let index = 0; index <= samples; index += 1) {
      const sourceIndex = index % samples;
      const value = data[Math.floor(sourceIndex / samples * data.length)] / 255;
      const angle = sourceIndex / samples * Math.PI * 2 - Math.PI / 2;
      const radius = minSide * (.27 + value * .07 + mid * .018);
      const x = centerX + Math.cos(angle) * radius;
      const y = centerY + Math.sin(angle) * radius;
      if (index === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.strokeStyle = colorWithAlpha(accent, .5 + mid * .35);
    ctx.lineWidth = 1.4 + bass * 2.2;
    ctx.shadowColor = accent;
    ctx.shadowBlur = 14 + bass * 24;
    ctx.stroke();
    ctx.restore();
  }

  function drawNebula(ctx, width, height, data, accent, accent2) {
    const centerX = width / 2;
    const centerY = height / 2;
    const minSide = Math.min(width, height);
    const time = performance.now() / 1000;
    const energy = average(data);

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    for (let cloud = 0; cloud < 7; cloud += 1) {
      const value = data[Math.floor(cloud / 7 * data.length)] / 255;
      const angle = time * (.035 + cloud * .006) * (cloud % 2 ? -1 : 1) + cloud * 1.73;
      const orbit = minSide * (.18 + cloud * .042);
      const x = centerX + Math.cos(angle) * orbit;
      const y = centerY + Math.sin(angle * 1.27) * orbit * .66;
      const radius = minSide * (.12 + value * .08);
      const cloudGradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
      cloudGradient.addColorStop(0, colorWithAlpha(cloud % 2 ? accent2 : accent, .12 + value * .18));
      cloudGradient.addColorStop(.5, colorWithAlpha(cloud % 2 ? accent : accent2, .045 + energy * .07));
      cloudGradient.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = cloudGradient;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
    }

    const stars = width < 520 ? 34 : 52;
    for (let index = 0; index < stars; index += 1) {
      const value = data[index % data.length] / 255;
      const seed = index * 12.9898;
      const baseAngle = (Math.sin(seed) + 1) * Math.PI;
      const radius = minSide * (.18 + ((Math.cos(seed * .61) + 1) / 2) * .34);
      const angle = baseAngle + time * (.025 + index % 6 * .006) * (index % 2 ? -1 : 1);
      const drift = Math.sin(time * .28 + index) * (3 + value * 9);
      const x = centerX + Math.cos(angle) * (radius + drift);
      const y = centerY + Math.sin(angle) * (radius * .72 + drift * .5);
      const size = .55 + value * 2.2 + (index % 9 === 0 ? 1.2 : 0);
      ctx.fillStyle = index % 3 ? accent2 : accent;
      ctx.globalAlpha = .18 + value * .78;
      ctx.shadowColor = ctx.fillStyle;
      ctx.shadowBlur = index % 9 === 0 ? 16 + value * 18 : 5 + value * 8;
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
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
    const [accent, accent2] = getAccent();

    switch (visualMode) {
      case 'orbital':
      case 'circle':
        drawOrbital(ctx, width, height, data, accent, accent2);
        break;
      case 'constellation':
        drawConstellation(ctx, width, height, data, accent, accent2);
        break;
      case 'vortex':
        drawVortex(ctx, width, height, data, accent, accent2);
        break;
      case 'pulse':
        drawPulse(ctx, width, height, data, accent, accent2);
        break;
      case 'nebula':
        drawNebula(ctx, width, height, data, accent, accent2);
        break;
      default:
        drawSpectrum(ctx, width, height, data, accent, accent2);
    }
  }

  function start() {
    cancelAnimationFrame(frame);
    const loop = () => {
      draw($('#home-visualizer'), 'nebula');
      draw($('#lab-visualizer'), mode);
      frame = requestAnimationFrame(loop);
    };
    loop();
  }

  function startAmbient() {
    const canvas = $('#ambient');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const particles = Array.from({ length: 30 }, (_, index) => ({
      seedX: index * 9,
      seedY: index * 5,
      radius: 2 + index % 3,
      alpha: .025 + (index % 5) * .006
    }));

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

    EXTRA_MODES.forEach(({ id, label }) => {
      if (controls.querySelector(`[data-visual="${id}"]`)) return;
      const button = document.createElement('button');
      button.className = 'chip';
      button.dataset.visual = id;
      button.textContent = label;
      controls.appendChild(button);
    });
  }

  installModeButtons();

  document.querySelectorAll('[data-visual]').forEach(button => {
    button.classList.toggle('active', button.dataset.visual === mode);
    button.addEventListener('click', () => {
      mode = button.dataset.visual;
      document.querySelectorAll('[data-visual]').forEach(item => {
        item.classList.toggle('active', item === button);
      });
    });
  });

  const homeTitle = document.querySelector('.now-panel .panel-head h3');
  if (homeTitle) homeTitle.textContent = 'Nebula spectrum';

  start();
  startAmbient();
  return { resume };
}
