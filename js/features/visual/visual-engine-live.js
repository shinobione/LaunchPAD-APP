import { readAudioLabSpectrum, synthesizePlaybackSpectrum } from '../audio-lab-signal.js';
import {
  drawHexReactorMode,
  drawHyperdriveMode,
  drawLiquidChromeMode,
  drawNebulaMode,
  drawNeonShatterMode,
  drawSingularityMode,
  drawSpectrumMode,
  drawTeslaVeinsMode
} from './visual-engine-premium-modes.js';
import {
  drawAuroraGlassMode,
  drawCyberRainMode,
  drawOrbitMode,
  drawPrismTunnelMode,
  drawQuantumGridMode,
  drawWaveCathedralMode
} from './visual-engine-showcase-v2.js';
import { clamp, prepareCanvas } from './visual-engine-utils.js';

const DEFAULT_MODE = 'wave-cathedral';
const STORAGE_KEY = 'shinobi.audioLabMode';

const VISUAL_MODES = [
  { id: 'wave-cathedral', label: 'Wave Cathedral', renderer: drawWaveCathedralMode },
  { id: 'circle', label: 'Orbit', renderer: drawOrbitMode },
  { id: 'bars', label: 'Spectrum', renderer: drawSpectrumMode },
  { id: 'singularity', label: 'Singularity', renderer: drawSingularityMode },
  { id: 'neon-shatter', label: 'Neon Shatter', renderer: drawNeonShatterMode },
  { id: 'hyperdrive', label: 'Hyperdrive', renderer: drawHyperdriveMode },
  { id: 'tesla-veins', label: 'Tesla Veins', renderer: drawTeslaVeinsMode },
  { id: 'liquid-chrome', label: 'Liquid Chrome', renderer: drawLiquidChromeMode },
  { id: 'hex-reactor', label: 'Hex Reactor', renderer: drawHexReactorMode },
  { id: 'nebula', label: 'Nebula', renderer: drawNebulaMode },
  { id: 'prism-tunnel', label: 'Prism Tunnel', renderer: drawPrismTunnelMode },
  { id: 'aurora-glass', label: 'Aurora Glass', renderer: drawAuroraGlassMode },
  { id: 'cyber-rain', label: 'Cyber Rain', renderer: drawCyberRainMode },
  { id: 'quantum-grid', label: 'Quantum Grid', renderer: drawQuantumGridMode }
];

const MODE_RENDERERS = new Map(VISUAL_MODES.map(mode => [mode.id, mode.renderer]));

function averageRange(values, from, to) {
  const start = Math.max(0, Math.min(values.length, Math.floor(from)));
  const end = Math.max(start + 1, Math.min(values.length, Math.ceil(to)));
  let total = 0;
  for (let index = start; index < end; index += 1) total += values[index];
  return total / Math.max(1, end - start);
}

function peakOf(values) {
  let peak = 0;
  for (let index = 0; index < values.length; index += 1) peak = Math.max(peak, values[index]);
  return peak;
}

function createSignalPipeline({ audio, getSampleRate, getFftSize }) {
  const raw = new Uint8Array(256);
  const smoothed = new Float32Array(256);
  const spectrum = new Uint8Array(256);
  let dynamicCeiling = 92;
  let previousEnergy = 0;
  const fast = { bass: 0, mid: 0, high: 0 };
  const slow = { bass: 0, mid: 0, high: 0 };

  const signal = {
    spectrum,
    bands: {
      sub: 0,
      bass: 0,
      lowMid: 0,
      mid: 0,
      highMid: 0,
      high: 0,
      treble: 0
    },
    transients: { kick: 0, snare: 0, sparkle: 0 },
    energy: 0,
    rms: 0,
    peak: 0,
    beat: 0,
    intensity: 0,
    state: 'idle'
  };

  function averageHz(minimumHz, maximumHz) {
    const sampleRate = getSampleRate() || 48000;
    const fftSize = getFftSize() || raw.length * 2;
    const binHz = sampleRate / fftSize;
    return averageRange(spectrum, minimumHz / binHz, maximumHz / binHz) / 255;
  }

  function updateEnvelope(target, key, value, rate) {
    target[key] += (value - target[key]) * rate;
  }

  function read() {
    const reading = readAudioLabSpectrum(raw);
    if (!reading.available) {
      if (!audio.paused && !audio.ended) synthesizePlaybackSpectrum(raw, Number(audio.currentTime) || 0);
      else raw.fill(0);
    }

    const rawPeak = peakOf(raw);
    dynamicCeiling = Math.max(42, rawPeak, dynamicCeiling * (rawPeak > dynamicCeiling ? .997 : .988));
    const noiseFloor = Math.min(18, averageRange(raw, raw.length * .72, raw.length) * .28 + 3);
    const usableRange = Math.max(24, dynamicCeiling - noiseFloor);
    let squareTotal = 0;

    for (let index = 0; index < raw.length; index += 1) {
      const normalized = clamp((raw[index] - noiseFloor) / usableRange);
      const shaped = Math.pow(normalized, .68) * 255;
      const attack = shaped > smoothed[index] ? .56 : .145;
      smoothed[index] += (shaped - smoothed[index]) * attack;
      spectrum[index] = Math.max(0, Math.min(255, Math.round(smoothed[index])));
      const centered = spectrum[index] / 255;
      squareTotal += centered * centered;
    }

    const bands = signal.bands;
    bands.sub = averageHz(20, 75);
    bands.bass = averageHz(55, 250);
    bands.lowMid = averageHz(180, 620);
    bands.mid = averageHz(500, 2400);
    bands.highMid = averageHz(1800, 6500);
    bands.high = averageHz(4200, 12500);
    bands.treble = averageHz(9000, 18000);

    updateEnvelope(fast, 'bass', bands.bass, .52);
    updateEnvelope(fast, 'mid', bands.mid, .46);
    updateEnvelope(fast, 'high', bands.high, .48);
    updateEnvelope(slow, 'bass', bands.bass, .065);
    updateEnvelope(slow, 'mid', bands.mid, .055);
    updateEnvelope(slow, 'high', bands.high, .06);

    const kick = clamp((fast.bass - slow.bass) * 4.6);
    const snare = clamp((fast.mid - slow.mid) * 4 + (fast.high - slow.high) * 1.35);
    const sparkle = clamp((bands.treble - slow.high * .72) * 3.2);
    const energy = clamp(
      bands.sub * .16
      + bands.bass * .28
      + bands.lowMid * .2
      + bands.mid * .17
      + bands.highMid * .11
      + bands.high * .08
    );
    const energyRise = clamp((energy - previousEnergy) * 7);
    previousEnergy += (energy - previousEnergy) * .24;

    signal.transients.kick = kick;
    signal.transients.snare = snare;
    signal.transients.sparkle = sparkle;
    signal.energy = energy;
    signal.rms = Math.sqrt(squareTotal / spectrum.length);
    signal.peak = peakOf(spectrum) / 255;
    signal.beat = Math.max(kick, energyRise);
    signal.intensity = clamp(.35 + energy * .9 + kick * .52 + snare * .18);
    signal.state = reading.state || (reading.available ? 'live' : 'fallback');
    return signal;
  }

  return { read, signal };
}

function installControls(controls, activeMode, onSelect) {
  if (!controls) return;
  controls.replaceChildren();
  controls.style.display = 'flex';
  controls.style.alignItems = 'center';
  controls.style.gap = '8px';
  controls.style.overflowX = 'auto';
  controls.style.overflowY = 'hidden';
  controls.style.flexWrap = 'nowrap';
  controls.style.paddingBottom = '8px';
  controls.style.scrollbarWidth = 'thin';
  controls.style.overscrollBehaviorX = 'contain';

  for (const mode of VISUAL_MODES) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'chip';
    button.dataset.visual = mode.id;
    button.textContent = mode.label;
    button.style.flex = '0 0 auto';
    button.classList.toggle('active', mode.id === activeMode);
    button.addEventListener('click', () => onSelect(mode.id, button));
    controls.appendChild(button);
  }
}

function renderMode(canvas, renderer, signal, getAccent, time) {
  const prepared = prepareCanvas(canvas);
  if (!prepared || typeof renderer !== 'function') return;
  const [accent, accent2] = getAccent();
  renderer({
    context: prepared.context,
    width: prepared.width,
    height: prepared.height,
    signal,
    accent,
    accent2,
    time
  });
}

function startAmbient() {
  const canvas = document.querySelector('#ambient');
  if (!canvas || canvas.dataset.visualEngineAmbient === 'true') return;
  canvas.dataset.visualEngineAmbient = 'true';
  const context = canvas.getContext('2d');
  const particles = Array.from({ length: 30 }, (_, index) => ({
    seedX: index * 9,
    seedY: index * 5,
    radius: 2 + index % 3,
    alpha: .025 + index % 5 * .006
  }));

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(window.innerWidth * dpr);
    canvas.height = Math.round(window.innerHeight * dpr);
    canvas.style.width = `${window.innerWidth}px`;
    canvas.style.height = `${window.innerHeight}px`;
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function loop() {
    context.clearRect(0, 0, window.innerWidth, window.innerHeight);
    particles.forEach((particle, index) => {
      const x = (Math.sin(Date.now() / 5000 + particle.seedX) + 1) / 2 * window.innerWidth;
      const y = (Math.cos(Date.now() / 6000 + particle.seedY) + 1) / 2 * window.innerHeight;
      context.fillStyle = `rgba(${120 + index * 3},55,255,${particle.alpha})`;
      context.beginPath();
      context.arc(x, y, particle.radius, 0, Math.PI * 2);
      context.fill();
    });
    requestAnimationFrame(loop);
  }

  resize();
  window.addEventListener('resize', resize, { passive: true });
  loop();
}

export function createVisualController({ audio, $, getAccent }) {
  const labCanvas = $('#lab-visualizer');
  const homeCanvas = $('#home-visualizer');
  const controls = document.querySelector('.lab-controls');
  let context = null;
  let analyser = null;
  let source = null;
  let frame = 0;

  const storedMode = localStorage.getItem(STORAGE_KEY);
  let mode = MODE_RENDERERS.has(storedMode) ? storedMode : DEFAULT_MODE;

  function setupAudio() {
    if (context || !audio) return;
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    try {
      context = new AudioContextClass();
      analyser = context.createAnalyser();
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = .42;
      analyser.minDecibels = -94;
      analyser.maxDecibels = -16;
      source = context.createMediaElementSource(audio);
      source.connect(analyser);
      analyser.connect(context.destination);
    } catch (error) {
      console.warn('Audio Lab analyser could not be initialized; visual fallback remains active.', error);
      context = null;
      analyser = null;
      source = null;
    }
  }

  const pipeline = createSignalPipeline({
    audio,
    getSampleRate: () => context?.sampleRate || 48000,
    getFftSize: () => analyser?.fftSize || 512
  });

  function selectMode(nextMode, button = null) {
    mode = MODE_RENDERERS.has(nextMode) ? nextMode : DEFAULT_MODE;
    localStorage.setItem(STORAGE_KEY, mode);
    if (labCanvas) labCanvas.dataset.visualMode = mode;
    controls?.querySelectorAll('[data-visual]').forEach(item => {
      item.classList.toggle('active', button ? item === button : item.dataset.visual === mode);
    });
    button?.scrollIntoView?.({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  }

  installControls(controls, mode, selectMode);
  selectMode(mode);
  setupAudio();
  startAmbient();

  if (homeCanvas) {
    homeCanvas.dataset.visualMode = 'wave-cathedral';
    homeCanvas.setAttribute('aria-label', 'Live sound-reactive Wave Cathedral visualization');
  }
  const homeTitle = document.querySelector('.now-panel .panel-head h3');
  if (homeTitle) homeTitle.textContent = 'Wave Cathedral';

  document.documentElement.dataset.audioLabRenderer = 'unified-live-v2';
  document.documentElement.dataset.audioLabPipeline = 'frequency-bands-transients';

  function render() {
    const time = performance.now() / 1000;
    const signal = pipeline.read();
    document.documentElement.dataset.audioLabFeed = signal.state;
    document.documentElement.dataset.audioLabMode = mode;

    renderMode(homeCanvas, drawWaveCathedralMode, signal, getAccent, time);
    renderMode(labCanvas, MODE_RENDERERS.get(mode), signal, getAccent, time);
    frame = requestAnimationFrame(render);
  }

  frame = requestAnimationFrame(render);

  return {
    resume() {
      setupAudio();
      if (context?.state === 'suspended' || context?.state === 'interrupted') context.resume().catch(() => {});
      if (!frame) frame = requestAnimationFrame(render);
    },
    registerMode({ id, label, renderer }) {
      if (!id || !label || typeof renderer !== 'function') return false;
      MODE_RENDERERS.set(id, renderer);
      VISUAL_MODES.push({ id, label, renderer });
      installControls(controls, mode, selectMode);
      return true;
    }
  };
}
