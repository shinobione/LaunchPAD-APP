export function createVisualController({ audio, $, getAccent }) {
  let context;
  let analyser;
  let source;
  let frame;
  let mode = 'bars';

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

    const size = analyser ? analyser.frequencyBinCount : 64;
    const data = new Uint8Array(size);
    if (analyser) analyser.getByteFrequencyData(data);
    else {
      for (let index = 0; index < size; index += 1) {
        data[index] = 35 + 25 * Math.sin(Date.now() / 500 + index);
      }
    }

    const [accent, accent2] = getAccent();
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, accent);
    gradient.addColorStop(1, accent2);
    ctx.strokeStyle = gradient;
    ctx.fillStyle = gradient;
    ctx.lineWidth = 2;

    if (visualMode === 'wave') {
      ctx.beginPath();
      data.forEach((value, index) => {
        const x = index / (data.length - 1) * width;
        const direction = index % 2 ? 1 : -1;
        const y = height / 2 + (value / 255 - .25) * height * .55 * direction;
        if (index) ctx.lineTo(x, y);
        else ctx.moveTo(x, y);
      });
      ctx.stroke();
      return;
    }

    if (visualMode === 'circle') {
      const centerX = width / 2;
      const centerY = height / 2;
      const radius = Math.min(width, height) * .23;
      data.forEach((value, index) => {
        const angle = index / data.length * Math.PI * 2;
        const length = 12 + value / 255 * 55;
        ctx.beginPath();
        ctx.moveTo(centerX + Math.cos(angle) * radius, centerY + Math.sin(angle) * radius);
        ctx.lineTo(centerX + Math.cos(angle) * (radius + length), centerY + Math.sin(angle) * (radius + length));
        ctx.stroke();
      });
      return;
    }

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
      draw($('#home-visualizer'), 'wave');
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
