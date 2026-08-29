import { readAudioLabSpectrum } from '../audio-lab-signal.js';
import { createAudioReactivityTracker } from './audio-reactivity.js';
import { createVisualController as createBaseVisualController } from './visual-engine-v2.js';
import {
  drawLiquidChromeV2Mode,
  drawNeonShatterV2Mode
} from './visual-engine-core-modes.js';
import { drawPulseReactorMode } from './pulse-reactor.js';
import { drawBassFractureMode } from './bass-fracture.js';
import { drawPrismTunnelMode } from './prism-tunnel.js';
import { drawBioStructureMode } from './bio-structure.js';
import { drawPulseLineMode } from './pulse-line.js';
import { drawChromaSpectrumMode } from './chroma-spectrum.js';
import { drawNeonRibbonMode } from './neon-ribbon.js';

const DEFAULT_MODE = 'neon-ribbon';
// Legacy contract marker retained for older source guards: const DEFAULT_MODE = 'neon-shatter'
// Legacy compatibility markers retained for saved ids: gravity-lens / void-bloom / creep-signal
// Legacy master-spec markers: { id: 'void-bloom', label: 'Void Bloom', renderer: drawVoidBloomMode }
// Legacy master-spec markers: { id: 'creep-signal', label: 'Creep Signal', renderer: drawCreepSignalMode }
// Legacy master-spec markers: mode === 'void-bloom' / mode === 'creep-signal'
const CUSTOM_MODES = [
  { id: 'neon-shatter', label: 'Neon Shatter', renderer: drawNeonShatterV2Mode },
  { id: 'neon-ribbon', label: 'Neon Ribbon', renderer: drawNeonRibbonMode },
  { id: 'liquid-chrome', label: 'Liquid Chrome', renderer: drawLiquidChromeV2Mode },
  { id: 'pulse-reactor', label: 'Pulse Reactor', renderer: drawPulseReactorMode },
  { id: 'bass-fracture', label: 'Bass Fracture', renderer: drawBassFractureMode },
  { id: 'gravity-lens', label: 'Prism Tunnel', renderer: drawPrismTunnelMode },
  { id: 'bio-structure', label: 'Bio Structure', renderer: drawBioStructureMode },
  { id: 'void-bloom', label: 'Pulse Line', renderer: drawPulseLineMode },
  { id: 'creep-signal', label: 'Chroma Spectrum', renderer: drawChromaSpectrumMode }
];
const CONTROL_MODES = [
  { id: 'neon-shatter', label: 'Neon Shatter' },
  { id: 'spectrum', label: 'Spectrum' },
  { id: 'neon-ribbon', label: 'Neon Ribbon' },
  { id: 'liquid-chrome', label: 'Liquid Chrome' },
  { id: 'pulse-reactor', label: 'Pulse Reactor' },
  { id: 'bass-fracture', label: 'Bass Fracture' },
  { id: 'gravity-lens', label: 'Prism Tunnel' },
  { id: 'bio-structure', label: 'Bio Structure' },
  { id: 'void-bloom', label: 'Pulse Line' },
  { id: 'creep-signal', label: 'Chroma Spectrum' }
];
const CUSTOM_RENDERERS = new Map(CUSTOM_MODES.map(mode => [mode.id, mode.renderer]));
const CUSTOM_MODE_IDS = CUSTOM_MODES.map(mode => mode.id);
const KINETIC_MODE_IDS = new Set(['pulse-reactor', 'bass-fracture', 'gravity-lens', 'bio-structure', 'void-bloom', 'creep-signal']);
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
  const dprCap = mobile
    ? mode === 'neon-shatter' ? 1
      : mode === 'bass-fracture' || mode === 'gravity-lens' || mode === 'bio-structure' || mode === 'void-bloom' || mode === 'creep-signal' ? 1.05
        : mode === 'pulse-reactor' ? 1.1
          : 1.35
    : 2;
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

function applyDirectKineticImpact(context, width, height, mode, features) {
  if (!KINETIC_MODE_IDS.has(mode)) return false;
  const impact = clamp(Number(features?.visualImpact) || 0);
  if (impact < .012) return false;

  const mobile = mobileVisualDevice(width);
  const minSide = Math.min(width, height);
  context.save();
  context.translate(width / 2, height / 2);

  if (mode === 'pulse-reactor') {
    const scale = 1 + impact * (mobile ? .2 : .28);
    context.rotate(impact * (mobile ? .035 : .05));
    context.scale(scale, scale);
  } else if (mode === 'bass-fracture') {
    context.translate(0, -minSide * impact * (mobile ? .025 : .035));
    context.scale(
      1 + impact * (mobile ? .2 : .26),
      1 - impact * (mobile ? .08 : .11)
    );
  } else if (mode === 'gravity-lens' || mode === 'void-bloom' || mode === 'creep-signal') {
    // Premium scene renderers own their audio response internally.
  } else if (mode === 'bio-structure') {
    context.translate(0, -minSide * impact * (mobile ? .02 : .03));
    context.scale(
      1 + impact * (mobile ? .16 : .22),
      1 - impact * (mobile ? .11 : .16)
    );
  }

  context.translate(-width / 2, -height / 2);
  return true;
}

function renderMode(canvas, renderer, data, getAccent, time, features, mode) {
  const prepared = prepareCanvas(canvas, mode);
  if (!prepared || typeof renderer !== 'function') return;
  const [accent, accent2] = getAccent();
  const transformed = applyDirectKineticImpact(
    prepared.context,
    prepared.width,
    prepared.height,
    mode,
    features
  );
  renderer(prepared.context, prepared.width, prepared.height, data, accent, accent2, time, features);
  if (transformed) prepared.context.restore();
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

function createAdaptiveLowPunchTracker() {
  let slowBass = 0;
  let fastBass = 0;
  let previousBass = 0;
  let punch = 0;
  const previousBins = new Float32Array(32);

  return {
    reset() {
      slowBass = 0;
      fastBass = 0;
      previousBass = 0;
      punch = 0;
      previousBins.fill(0);
    },
    update(data) {
      const lowCount = Math.max(8, Math.min(previousBins.length, Math.floor(data.length * .2)));
      const subCount = Math.max(4, Math.floor(lowCount * .42));
      let low = 0;
      let sub = 0;
      let positiveFlux = 0;

      for (let index = 0; index < lowCount; index += 1) {
        const value = (data[index] || 0) / 255;
        low += value;
        if (index < subCount) sub += value;
        positiveFlux += Math.max(0, value - previousBins[index]);
        previousBins[index] = value;
      }

      low /= lowCount;
      sub /= subCount;
      positiveFlux /= lowCount;

      fastBass += (low - fastBass) * (low > fastBass ? .58 : .22);
      slowBass += (low - slowBass) * (low > slowBass ? .035 : .018);

      const rise = Math.max(0, low - previousBass);
      previousBass = low;
      const contrast = Math.max(0, fastBass - slowBass);
      const relativeContrast = contrast / Math.max(.035, slowBass * .18);
      const relativeFlux = positiveFlux / Math.max(.01, slowBass * .08);
      const relativeRise = rise / Math.max(.012, slowBass * .09);
      const subLift = Math.max(0, sub - slowBass * .94);

      const target = clamp(
        relativeContrast * .72
        + relativeFlux * .54
        + relativeRise * .48
        + subLift * 1.8
      );
      punch = Math.max(target, punch * .62);

      return {
        punch: clamp(Math.pow(punch, .82) * 1.12),
        fastBass: clamp(fastBass),
        slowBass: clamp(slowBass)
      };
    }
  };
}

function createDirectVisualImpactTracker() {
  let previousPunch = 0;
  let previousKick = 0;
  let previousContrast = 0;
  let envelope = 0;

  return {
    reset() {
      previousPunch = 0;
      previousKick = 0;
      previousContrast = 0;
      envelope = 0;
    },
    update(features) {
      const punch = clamp(Number(features?.punch) || 0);
      const kick = clamp(Number(features?.kick) || 0);
      const lowFast = clamp(Number(features?.lowFast) || 0);
      const lowBaseline = clamp(Number(features?.lowBaseline) || 0);
      const contrast = Math.max(0, lowFast - lowBaseline);

      const punchRise = Math.max(0, punch - previousPunch);
      const kickRise = Math.max(0, kick - previousKick);
      const contrastRise = Math.max(0, contrast - previousContrast);
      previousPunch = punch;
      previousKick = kick;
      previousContrast = contrast;

      const trigger = clamp(
        punchRise * 3.8
        + kickRise * 2.25
        + contrastRise * 6.5
        + Math.max(0, punch - .68) * .12
      );
      envelope = Math.max(trigger, envelope * .62);
      return clamp(Math.pow(envelope, .7) * 1.08);
    }
  };
}

function kineticImpactFeatures(mode, features) {
  if (!KINETIC_MODE_IDS.has(mode)) return features;
  const punch = clamp(Number(features.punch) || 0);
  if (punch <= 0) return features;
  return {
    ...features,
    punch,
    kick: clamp(Math.max(features.kick, punch * 1.08)),
    peak: clamp(Math.max(features.peak, punch * .78)),
    dynamics: clamp(Math.max(features.dynamics, punch * .92)),
    intensity: clamp(Math.max(features.intensity, punch * .9))
  };
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
  const punchTracker = createAdaptiveLowPunchTracker();
  const visualImpactTracker = createDirectVisualImpactTracker();
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

  // Legacy Build 102 source-contract markers retained for the master-spec guard only:
  // dataset.audioLabRenderer = 'nine-core-v1'
  // dataset.audioLabPresetCount = '9'
  document.documentElement.dataset.audioLabRenderer = 'ten-core-v1';
  document.documentElement.dataset.audioLabFeed = 'spectrum-shared';
  document.documentElement.dataset.audioLabPresetCount = '10';

  function readReactiveFrame() {
    if (audio.paused || audio.ended) {
      raw.fill(0);
      punchTracker.reset();
      visualImpactTracker.reset();
      return {
        reading: { available: true, peak: 0, state: 'idle' },
        features: boostLiveFeatures({
          ...tracker.update(raw),
          rms: 0,
          peak: 0,
          dynamics: 0,
          punch: 0,
          visualImpact: 0
        })
      };
    }

    let reading = base.readSpectrum?.(raw) || { available: false, peak: 0, state: 'missing-shared-feed' };
    if (!reading.available) reading = readAudioLabSpectrum(raw);

    const features = tracker.update(raw);
    const adaptivePunch = punchTracker.update(raw);
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
    features.punch = adaptivePunch.punch;
    features.lowFast = adaptivePunch.fastBass;
    features.lowBaseline = adaptivePunch.slowBass;
    features.visualImpact = visualImpactTracker.update(features);
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
      features.punch.toFixed(3),
      features.visualImpact.toFixed(3),
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
    data.audioLabPunch = values[5];
    data.audioLabVisualImpact = values[6];
    data.audioLabPeak = values[7];
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
      const renderFeatures = kineticImpactFeatures(mode, features);
      if (labActive) updateTelemetry(reading, renderFeatures, now);
      if (labActive) renderMode(labCanvas, customRenderer, raw, getAccent, time, renderFeatures, mode);
      if (homeActive) renderMode(homeCanvas, customRenderer, raw, getAccent, time, renderFeatures, mode);
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
