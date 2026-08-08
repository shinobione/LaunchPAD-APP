import { readAudioLabSpectrum } from '../audio-lab-signal.js';
import { createAudioReactivityTracker } from './audio-reactivity.js';
import { createVisualController as createBaseVisualController } from './visual-engine-v2.js';
import {
  drawLiquidChromeV2Mode,
  drawNeonShatterV2Mode
} from './visual-engine-core-modes.js';

const DEFAULT_MODE = 'neon-shatter';
const CUSTOM_MODES = [
  { id: 'neon-shatter', label: 'Neon Shatter', renderer: drawNeonShatterV2Mode },
  { id: 'liquid-chrome', label: 'Liquid Chrome', renderer: drawLiquidChromeV2Mode }
];
const CONTROL_MODES = [
  { id: 'neon-shatter', label: 'Neon Shatter' },
  { id: 'spectrum', label: 'Spectrum' },
  { id: 'liquid-chrome', label: 'Liquid Chrome' }
];
const CUSTOM_RENDERERS = new Map(CUSTOM_MODES.map(mode => [mode.id, mode.renderer]));
const CUSTOM_MODE_IDS = CUSTOM_MODES.map(mode => mode.id);
const CUSTOM_FRAME_INTERVAL = 1000 / 60;
const TELEMETRY_INTERVAL = 120;

function clamp(value, minimum = 0, maximum = 1) {
  return Math.max(minimum, Math.min(maximum, value));
}

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
  const supported = new Set(CONTROL_MODES.map(mode => mode.id));
  controls.querySelectorAll('[data-visual]').forEach(button => {
    if (!supported.has(button.dataset.visual)) button.remove();
  });

  for (const { id, label } of CONTROL_MODES) {
    let button = controls.querySelector(`[data-visual="${id}"]`);
    if (!button) {
      button = document.createElement('button');
      button.className = 'chip';
      button.dataset.visual = id;
      controls.appendChild(button);
    }
    button.textContent = label;
    button.setAttribute('aria-label', `Use ${label} visualizer`);
    button.style.flex = '0 0 auto';
  }

  CONTROL_MODES.forEach(({ id }) => {
    const button = controls.querySelector(`[data-visual="${id}"]`);
    if (button) controls.appendChild(button);
  });

  controls.style.display = 'flex';
  controls.style.alignItems = 'center';
  controls.style.gap = '8px';
  controls.style.overflowX = 'auto';
  controls.style.overflowY = 'hidden';
  controls.style.flexWrap = 'nowrap';
  controls.style.paddingBottom = '8px';
  controls.style.scrollbarWidth = 'thin';
  controls.style.overscrollBehaviorX = 'contain';
  return controls.querySelector(`[data-visual="${DEFAULT_MODE}"]`);
}

function renderMode(canvas, renderer, data, getAccent, time, features, mode) {
  const prepared = prepareCanvas(canvas, mode);
  if (!prepared || typeof renderer !== 'function') return;
  const [accent, accent2] = getAccent();
  renderer(prepared.context, prepared.width, prepared.height, data, accent, accent2, time, features);
}

function boostLiveFeatures(features) {
  features.bass = clamp(Math.pow(features.bass, .78) * 1.36);
  features.mid = clamp(Math.pow(features.mid, .82) * 1.24);
  features.high = clamp(Math.pow(features.high, .78) * 1.32);
  features.energy = clamp(Math.pow(features.energy, .82) * 1.24);
  features.kick = clamp(features.kick * 1.82 + features.bass * .12);
  features.rms = clamp(features.rms * 1.2);
  features.peak = clamp(features.peak * 1.18);
  features.dynamics = clamp(features.dynamics * 1.28 + features.kick * .18);
  features.intensity = clamp(features.energy * .52 + features.bass * .4 + features.kick * .48 + features.high * .16);
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
  const tracker = createAudioReactivityTracker({ attack: .82, release: .12, transientDecay: .72 });
  let mode = DEFAULT_MODE;
  let frame = 0;
  let lastFrameAt = 0;
  let lastTelemetryAt = 0;
  let lastTelemetrySignature = '';

  const defaultButton = installControls(controls);
  const homeTitle = document.querySelector('.now-panel .panel-head h3');

  function applyMode(nextMode, button = null) {
    mode = CONTROL_MODES.some(item => item.id === nextMode) ? nextMode : DEFAULT_MODE;
    base.setMode(mode);
    controls?.querySelectorAll('[data-visual]').forEach(item => {
      item.classList.toggle('active', item.dataset.visual === mode);
    });
    const label = CONTROL_MODES.find(item => item.id === mode)?.label || 'Audio Lab';
    if (homeTitle) homeTitle.textContent = label;
    if (labCanvas) {
      labCanvas.dataset.visualMode = mode;
      labCanvas.setAttribute('aria-label', `Live audio-reactive ${label} visualization`);
    }
    if (homeCanvas) {
      homeCanvas.dataset.visualMode = mode;
      homeCanvas.setAttribute('aria-label', `Live audio-reactive ${label} visualization`);
    }
    button?.scrollIntoView?.({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    window.dispatchEvent(new CustomEvent('shinobi:visual-mode', { detail: { mode, label } }));
  }

  controls?.querySelectorAll('[data-visual]').forEach(button => {
    button.classList.toggle('active', button === defaultButton);
    button.addEventListener('click', () => applyMode(button.dataset.visual || DEFAULT_MODE, button));
  });
  applyMode(DEFAULT_MODE, defaultButton);

  document.documentElement.dataset.audioLabRenderer = 'three-core-v1';
  document.documentElement.dataset.audioLabFeed = 'spectrum-shared';
  document.documentElement.dataset.audioLabPresetCount = '3';

  function readReactiveFrame() {
    if (audio.paused || audio.ended) {
      raw.fill(0);
      return {
        reading: { available: true, peak: 0, state: 'idle' },
        features: boostLiveFeatures({
          ...tracker.update(raw),
          rms: 0,
          peak: 0,
          dynamics: 0
        })
      };
    }

    // Neon Shatter and Liquid Chrome now read the exact analyser used by
    // Spectrum. The legacy Audio Lab bridge is fallback-only.
    let reading = base.readSpectrum?.(raw) || { available: false, peak: 0, state: 'missing-shared-feed' };
    if (!reading.available) reading = readAudioLabSpectrum(raw);

    const features = tracker.update(raw);
    const normalizedPeak = clamp((reading.peak || 0) / 255);
    features.rms = clamp(features.energy * .9 + features.bass * .1);
    features.peak = normalizedPeak;
    features.dynamics = clamp(
      Math.abs(features.bass - features.mid) * .7
      + Math.abs(features.mid - features.high) * .42
      + features.kick * .62
      + normalizedPeak * .18
    );
    boostLiveFeatures(features);
    return { reading, features };
  }

  function updateTelemetry(reading, features, now) {
    if (now - lastTelemetryAt < TELEMETRY_INTERVAL) return;
    lastTelemetryAt = now;
    const values = [
      reading.state || (reading.available ? 'live' : 'warming'),
      features.bass.toFixed(3),
      features.mid.toFixed(3),
      features.high.toFixed(3),
      features.kick.toFixed(3),
      features.peak.toFixed(3)
    ];
    const signature = values.join('|');
    if (signature === lastTelemetrySignature) return;
    lastTelemetrySignature = signature;
    const data = document.documentElement.dataset;
    data.audioLabFeed = reading.available ? 'spectrum-shared' : 'fallback';
    data.audioLabSignalState = values[0];
    data.audioLabBass = values[1];
    data.audioLabMid = values[2];
    data.audioLabHigh = values[3];
    data.audioLabKick = values[4];
    data.audioLabPeak = values[5];
  }

  function render(now = performance.now()) {
    const labActive = document.querySelector('#view-lab')?.classList.contains('active') === true;
    const homeActive = document.querySelector('#view-home')?.classList.contains('active') === true;
    const customRenderer = CUSTOM_RENDERERS.get(mode);
    const shouldRender = (labActive || homeActive) && Boolean(customRenderer);

    if (shouldRender && document.visibilityState !== 'hidden' && now - lastFrameAt >= CUSTOM_FRAME_INTERVAL) {
      lastFrameAt = now;
      const time = now / 1000;
      const { reading, features } = readReactiveFrame();
      if (labActive) updateTelemetry(reading, features, now);
      if (labActive) renderMode(labCanvas, customRenderer, raw, getAccent, time, features, mode);
      if (homeActive) renderMode(homeCanvas, customRenderer, raw, getAccent, time, features, mode);
    }

    frame = requestAnimationFrame(render);
  }

  frame = requestAnimationFrame(render);

  return {
    ...base,
    setMode(nextMode) {
      applyMode(nextMode);
    },
    resume() {
      base.resume();
      if (!frame) frame = requestAnimationFrame(render);
    }
  };
}
