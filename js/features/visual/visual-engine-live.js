import { readAudioLabAmplitude, readAudioLabSpectrum, synthesizePlaybackSpectrum } from '../audio-lab-signal.js';
import {
  createAmplitudeDynamicsTracker,
  createAudioReactivityTracker
} from './audio-reactivity.js';
import { createVisualController as createBaseVisualController } from './visual-engine-v2.js';
import {
  drawAuroraGlassMode,
  drawLiquidChromeLiveMode,
  drawNeonShatterAdaptiveMode,
  drawSingularityLiveMode
} from './visual-engine-core-modes.js';

const DEFAULT_MODE = 'neon-shatter';
const CUSTOM_MODES = [
  { id: 'neon-shatter', label: 'Neon Shatter', renderer: drawNeonShatterAdaptiveMode },
  { id: 'aurora-glass', label: 'Aurora Glass', renderer: drawAuroraGlassMode },
  { id: 'liquid-chrome', label: 'Liquid Chrome', renderer: drawLiquidChromeLiveMode },
  { id: 'singularity', label: 'Singularity', renderer: drawSingularityLiveMode }
];
const REQUIRED_BASE_MODES = [
  { id: 'spectrum', label: 'Spectrum' }
];
const CUSTOM_RENDERERS = new Map(CUSTOM_MODES.map(mode => [mode.id, mode.renderer]));
const CUSTOM_MODE_IDS = CUSTOM_MODES.map(mode => mode.id);
const CUSTOM_DESKTOP_FRAME_INTERVAL = 1000 / 60;
const CUSTOM_MOBILE_FRAME_INTERVAL = 1000 / 60;
const TELEMETRY_INTERVAL = 120;

function mobileVisualDevice(width = globalThis.innerWidth || 0) {
  const coarse = globalThis.matchMedia?.('(hover: none), (pointer: coarse)')?.matches === true;
  const touch = Number(globalThis.navigator?.maxTouchPoints || 0) > 0;
  return width <= 760 || (width < 980 && (coarse || touch));
}

function prepareCanvas(canvas, mode) {
  const rect = canvas?.getBoundingClientRect();
  if (!canvas || !rect?.width || !rect?.height) return null;
  const mobile = mobileVisualDevice(rect.width);
  const dprCap = mode === 'neon-shatter' && mobile ? 1 : mobile ? 1.35 : 2;
  const dpr = Math.min(window.devicePixelRatio || 1, dprCap);
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

function installControls(controls) {
  if (!controls) return null;
  const supported = new Set([
    'spectrum',
    'singularity',
    'neon-shatter',
    'liquid-chrome',
    'nebula',
    ...CUSTOM_MODE_IDS
  ]);
  controls.querySelectorAll('[data-visual]').forEach(button => {
    if (!supported.has(button.dataset.visual)) button.remove();
  });

  for (const { id, label } of [...REQUIRED_BASE_MODES, ...CUSTOM_MODES]) {
    let button = controls.querySelector(`[data-visual="${id}"]`);
    if (!button) {
      button = document.createElement('button');
      button.className = 'chip';
      button.dataset.visual = id;
      controls.appendChild(button);
    }
    button.textContent = label;
    button.style.flex = '0 0 auto';
  }

  const defaultButton = controls.querySelector(`[data-visual="${DEFAULT_MODE}"]`);
  if (defaultButton && controls.firstElementChild !== defaultButton) controls.prepend(defaultButton);

  controls.style.display = 'flex';
  controls.style.alignItems = 'center';
  controls.style.gap = '8px';
  controls.style.overflowX = 'auto';
  controls.style.overflowY = 'hidden';
  controls.style.flexWrap = 'nowrap';
  controls.style.paddingBottom = '8px';
  controls.style.scrollbarWidth = 'thin';
  controls.style.overscrollBehaviorX = 'contain';
  return defaultButton;
}

function renderMode(canvas, renderer, data, getAccent, time, features, mode) {
  const prepared = prepareCanvas(canvas, mode);
  if (!prepared || typeof renderer !== 'function') return;
  const [accent, accent2] = getAccent();
  renderer(prepared.context, prepared.width, prepared.height, data, accent, accent2, time, features);
}

function boostLiveFeatures(features) {
  const clamp = value => Math.max(0, Math.min(1, value));
  features.bass = clamp(features.bass * 1.58);
  features.mid = clamp(features.mid * 1.38);
  features.high = clamp(features.high * 1.48);
  features.energy = clamp(features.energy * 1.42);
  features.rms = clamp(features.rms * 1.46);
  features.peak = clamp(features.peak * 1.36);
  features.dynamics = clamp(features.dynamics * 1.5);
  features.kick = clamp(features.kick * 2.05 + features.peak * .16);
  features.presence = clamp(features.mid * .72 + features.high * .4);
  features.sparkle = clamp(features.high * 1.18);
  features.intensity = clamp(features.energy * .6 + features.bass * .4 + features.kick * .44 + features.dynamics * .28);
  return features;
}

export function createVisualController(options) {
  if (document.documentElement.dataset.visualTest === 'true') {
    document.documentElement.dataset.audioLabRenderer = 'disabled-for-visual-test';
    return { resume() {}, setMode() {} };
  }

  const base = createBaseVisualController({
    ...options,
    delegatedModes: CUSTOM_MODE_IDS,
    externalHomeRenderer: false
  });
  const { audio, $, getAccent } = options;
  const labCanvas = $('#lab-visualizer');
  const homeCanvas = $('#home-visualizer');
  const controls = document.querySelector('.lab-controls');
  const raw = new Uint8Array(128);
  const waveform = new Uint8Array(256);
  const tracker = createAudioReactivityTracker({ attack: .84, release: .14, transientDecay: .74 });
  const amplitudeTracker = createAmplitudeDynamicsTracker({ attack: .74, release: .07, peakDecay: .84 });
  let mode = DEFAULT_MODE;
  let frame = 0;
  let lastFrameAt = 0;
  let lastTelemetryAt = 0;
  let lastTelemetrySignature = '';

  const defaultButton = installControls(controls);
  controls?.querySelectorAll('[data-visual]').forEach(button => {
    button.classList.toggle('active', button === defaultButton);
    button.addEventListener('click', () => {
      mode = button.dataset.visual || DEFAULT_MODE;
      base.setMode(mode);
      controls.querySelectorAll('[data-visual]').forEach(item => item.classList.toggle('active', item === button));
      button.scrollIntoView?.({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      if (labCanvas) labCanvas.dataset.visualMode = mode;
      if (homeCanvas) homeCanvas.dataset.visualMode = mode;
      window.dispatchEvent(new CustomEvent('shinobi:visual-mode', {
        detail: { mode, label: button.textContent.trim() }
      }));
    });
  });
  base.setMode(DEFAULT_MODE);

  if (labCanvas) labCanvas.dataset.visualMode = DEFAULT_MODE;
  if (homeCanvas) {
    homeCanvas.dataset.visualMode = DEFAULT_MODE;
    homeCanvas.setAttribute('aria-label', 'Live audio-reactive Neon Shatter visualization');
  }
  const homeTitle = document.querySelector('.now-panel .panel-head h3');
  if (homeTitle) homeTitle.textContent = 'Neon Shatter';
  document.documentElement.dataset.audioLabRenderer = 'signal-first-v9';
  document.documentElement.dataset.audioLabSpectrum = controls?.querySelector('[data-visual="spectrum"]') ? 'restored' : 'missing';

  function readReactiveFrame() {
    let reading;
    if (audio.paused || audio.ended) {
      raw.fill(0);
      reading = { available: true, peak: 0, state: 'idle' };
    } else {
      reading = readAudioLabSpectrum(raw);
      if (!reading.available) synthesizePlaybackSpectrum(raw, Number(audio.currentTime) || 0);
    }

    const features = tracker.update(raw);
    const amplitudeReading = audio.paused || audio.ended
      ? { available: true, rms: 0, peak: 0, state: 'idle' }
      : readAudioLabAmplitude(waveform);
    const amplitude = amplitudeTracker.update(amplitudeReading.available
      ? amplitudeReading
      : {
          rms: features.energy * .2,
          peak: Math.max(features.kick * .72, reading.peak / 255)
        });
    Object.assign(features, amplitude);
    boostLiveFeatures(features);
    return { reading, features };
  }

  function updateTelemetry(reading, features, now) {
    if (now - lastTelemetryAt < TELEMETRY_INTERVAL) return;
    lastTelemetryAt = now;
    const values = [
      reading.state || (reading.available ? 'live' : 'warming'),
      features.kick.toFixed(3),
      features.rms.toFixed(3),
      features.peak.toFixed(3),
      features.dynamics.toFixed(3)
    ];
    const signature = values.join('|');
    if (signature === lastTelemetrySignature) return;
    lastTelemetrySignature = signature;
    const data = document.documentElement.dataset;
    data.audioLabFeed = values[0];
    data.audioLabKick = values[1];
    data.audioLabRms = values[2];
    data.audioLabPeak = values[3];
    data.audioLabDynamics = values[4];
  }

  function render(now = performance.now()) {
    const labActive = document.querySelector('#view-lab')?.classList.contains('active') === true;
    const homeActive = document.querySelector('#view-home')?.classList.contains('active') === true;
    const customRenderer = CUSTOM_RENDERERS.get(mode);
    const shouldRender = (labActive || homeActive) && Boolean(customRenderer);
    const frameInterval = mobileVisualDevice() ? CUSTOM_MOBILE_FRAME_INTERVAL : CUSTOM_DESKTOP_FRAME_INTERVAL;

    if (shouldRender && document.visibilityState !== 'hidden' && now - lastFrameAt >= frameInterval) {
      lastFrameAt = now;
      const time = now / 1000;
      const { reading, features } = readReactiveFrame();
      if (labActive) updateTelemetry(reading, features, now);

      // Build 50: signal-first renderers consume the same raw FFT bins that make
      // Spectrum trustworthy. Time is only a secondary visual drift input.
      if (labActive) renderMode(labCanvas, customRenderer, raw, getAccent, time, features, mode);
      if (homeActive) renderMode(homeCanvas, customRenderer, raw, getAccent, time, features, mode);
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
