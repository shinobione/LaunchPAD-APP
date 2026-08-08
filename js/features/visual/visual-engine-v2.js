export function createVisualController({ audio, $, getAccent, delegatedModes = [], externalHomeRenderer = false }) {
  let context;
  let analyser;
  let source;
  let frame;
  let mode = 'spectrum';

  const BASE_MODES = [
    { id: 'spectrum', label: 'Spectrum' }
  ];
  const delegatedModeSet = new Set(delegatedModes);

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

  function signalPeak(data) {
    let peak = 0;
    for (let index = 0; index < data.length; index += 1) peak = Math.max(peak, data[index]);
    return peak;
  }

  function readSpectrum(target) {
    if (!target?.length || !analyser) {
      target?.fill?.(0);
      return { available: false, peak: 0, state: context ? 'awaiting-analyser' : 'awaiting-context' };
    }
    analyser.getByteFrequencyData(target);
    const peak = signalPeak(target);
    return {
      available: true,
      peak,
      state: audio.paused || audio.ended ? 'idle' : peak > 2 ? 'live' : 'silent'
    };
  }

  function getData() {
    const size = analyser ? analyser.frequencyBinCount : 64;
    const data = new Uint8Array(size);
    const reading = readSpectrum(data);
    if (!reading.available) {
      const now = Date.now() / 620;
      for (let index = 0; index < size; index += 1) data[index] = 34 + 22 * Math.sin(now + index * .72);
    }
    return data;
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

  function draw(canvas) {
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
    drawSpectrum(ctx, width, height, data, accent, accent2);
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
        if (mode === 'spectrum' && homeActive && !externalHomeRenderer && !delegated) draw($('#home-visualizer'));
        if (mode === 'spectrum' && labActive && !delegated) draw($('#lab-visualizer'));
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
    const allowedModes = new Set([...BASE_MODES.map(item => item.id), ...delegatedModeSet]);
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
    const requested = String(nextMode || '').trim().toLowerCase();
    mode = requested === 'spectrum' || delegatedModeSet.has(requested) ? requested : 'spectrum';
    const controls = document.querySelector('.lab-controls');
    if (button && controls) {
      controls.querySelectorAll('[data-visual]').forEach(item => item.classList.toggle('active', item === button));
    }
  }

  installModeButtons();
  const controls = document.querySelector('.lab-controls');
  controls?.querySelectorAll('[data-visual="spectrum"]').forEach(button => {
    button.classList.toggle('active', button.dataset.visual === mode);
    button.addEventListener('click', () => setMode('spectrum', button));
  });
  start();
  startAmbient();
  return { resume, setMode, readSpectrum };
}
