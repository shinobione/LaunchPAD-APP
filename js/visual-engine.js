export function createVisualController({ audio, $, getAccent }) {
  let context;
  let analyser;
  let source;
  let frame;
  let mode = 'circle';

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
      for (let index = 0; index < size; index += 1) {
        data[index] = 34 + 22 * Math.sin(Date.now() / 620 + index * .72);
      }
    }
    return data;
  }

  function drawOrbital(ctx, width, height, data, accent, accent2) {
    const centerX = width / 2;
    const centerY = height / 2 + 3;
    const minSide = Math.min(width, height);
    const baseRadius = minSide * .19;
    const energy = data.reduce((sum, value) => sum + value, 0) / data.length / 255;
    const time = Date.now() / 1000;

    const glow = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, baseRadius * 2.15);
    glow.addColorStop(0, `${accent}45`);
    glow.addColorStop(.38, `${accent2}20`);
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(centerX, centerY, baseRadius * 2.15, 0, Math.PI * 2);
    ctx.fill();

    [1, 1.34, 1.72].forEach((scale, index) => {
      ctx.beginPath();
      ctx.arc(centerX, centerY, baseRadius * scale, 0, Math.PI * 2);
      ctx.strokeStyle = index === 0 ? `${accent}70` : `${accent2}${index === 1 ? '35' : '22'}`;
      ctx.lineWidth = index === 0 ? 1.4 : 1;
      ctx.stroke();
    });

    const samples = Math.min(72, data.length);
    for (let index = 0; index < samples; index += 1) {
      const sourceIndex = Math.floor(index / samples * data.length);
      const value = data[sourceIndex] / 255;
      const angle = index / samples * Math.PI * 2 - Math.PI / 2;
      const inner = baseRadius * 1.08;
      const length = 7 + value * minSide * .14;
      const outer = inner + length;
      const x1 = centerX + Math.cos(angle) * inner;
      const y1 = centerY + Math.sin(angle) * inner;
      const x2 = centerX + Math.cos(angle) * outer;
      const y2 = centerY + Math.sin(angle) * outer;

      const stroke = ctx.createLinearGradient(x1, y1, x2, y2);
      stroke.addColorStop(0, `${accent}55`);
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

    const core = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, baseRadius * .72);
    core.addColorStop(0, 'rgba(255,255,255,.18)');
    core.addColorStop(.18, `${accent}42`);
    core.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = core;
    ctx.beginPath();
    ctx.arc(centerX, centerY, baseRadius * (.72 + energy * .08), 0, Math.PI * 2);
    ctx.fill();
  }

  function drawConstellation(ctx, width, height, data, accent, accent2) {
    const time = Date.now() / 1000;
    const count = 28;
    const points = [];
    const energy = data.reduce((sum, value) => sum + value, 0) / data.length / 255;

    const haze = ctx.createRadialGradient(width * .5, height * .48, 0, width * .5, height * .48, Math.min(width, height) * .55);
    haze.addColorStop(0, `${accent2}20`);
    haze.addColorStop(.45, `${accent}10`);
    haze.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = haze;
    ctx.fillRect(0, 0, width, height);

    for (let index = 0; index < count; index += 1) {
      const value = data[Math.floor(index / count * data.length)] / 255;
      const x = width * (.1 + .8 * ((Math.sin(index * 12.9898) + 1) / 2)) + Math.sin(time * (.18 + index % 5 * .025) + index) * (12 + value * 22);
      const y = height * (.12 + .76 * ((Math.cos(index * 8.233) + 1) / 2)) + Math.cos(time * (.16 + index % 7 * .02) + index * .7) * (10 + value * 18);
      points.push({ x, y, value });
    }

    for (let a = 0; a < points.length; a += 1) {
      for (let b = a + 1; b < points.length; b += 1) {
        const dx = points[a].x - points[b].x;
        const dy = points[a].y - points[b].y;
        const distance = Math.hypot(dx, dy);
        const threshold = Math.min(width, height) * .24;
        if (distance > threshold) continue;
        ctx.strokeStyle = `${a % 2 ? accent2 : accent}${Math.round((1 - distance / threshold) * 44).toString(16).padStart(2, '0')}`;
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

    const data = getData();
    const [accent, accent2] = getAccent();

    if (visualMode === 'orbital' || visualMode === 'circle') {
      drawOrbital(ctx, width, height, data, accent, accent2);
      return;
    }

    if (visualMode === 'constellation') {
      drawConstellation(ctx, width, height, data, accent, accent2);
      return;
    }

    const gradient = ctx.createLinearGradient(0, 0, width, height);
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

  function start() {
    cancelAnimationFrame(frame);
    const loop = () => {
      draw($('#home-visualizer'), 'orbital');
      draw($('#lab-visualizer'), mode);
      frame = requestAnimationFrame(loop);
    };
    loop();
  }

  function startAmbient() {
    const canvas = $('#ambient');
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

  document.querySelectorAll('[data-visual]').forEach(button => {
    button.addEventListener('click', () => {
      mode = button.dataset.visual;
      document.querySelectorAll('[data-visual]').forEach(item => item.classList.toggle('active', item === button));
    });
  });

  start();
  startAmbient();
  return { resume };
}
