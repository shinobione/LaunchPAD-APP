import { readAudioLabSpectrum, synthesizePlaybackSpectrum } from '../audio-lab-signal.js';
import { createAudioReactivityTracker, shapeReactiveSpectrum } from './audio-reactivity.js';
import { createVisualController as createBaseVisualController } from './visual-engine-v2.js';
import {
  drawOrbitMode,
  drawAuroraGlassMode,
  drawWaveCathedralMode
} from './visual-engine-core-modes.js';
import { drawHexReactorMode } from './visual-engine-hex-reactor.js';

const DEFAULT_MODE = 'wave-cathedral';
const CUSTOM_MODES = [
  { id: 'wave-cathedral', label: 'Wave Cathedral', renderer: drawWaveCathedralMode },
  { id: 'circle', label: 'Orbit', renderer: drawOrbitMode },
  { id: 'aurora-glass', label: 'Aurora Glass', renderer: drawAuroraGlassMode },
  { id: 'hex-reactor', label: 'Hex Reactor', renderer: drawHexReactorMode }
];
const CUSTOM_RENDERERS = new Map(CUSTOM_MODES.map(mode => [mode.id, mode.renderer]));
const CUSTOM_MODE_IDS = CUSTOM_MODES.map(mode => mode.id);

function prepareCanvas(canvas) {
  const rect = canvas?.getBoundingClientRect();
  if (!canvas || !rect?.width || !rect?.height) return null;
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

function installControls(controls) {
  if (!controls) return null;
  const supported = new Set([
    'bars',
    'singularity',
    'neon-shatter',
    'liquid-chrome',
    'hex-reactor',
    'nebula',
    ...CUSTOM_MODE_IDS
  ]);
  controls.querySelectorAll('[data-visual]').forEach(button => {
    if (!supported.has(button.dataset.visual)) button.remove();
  });

  for (const { id, label } of CUSTOM_MODES) {
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

function renderMode(canvas, renderer, data, getAccent, time, features) {
  const prepared = prepareCanvas(canvas);
  if (!prepared || typeof renderer !== 'function') return;
  const [accent, accent2] = getAccent();
  renderer(prepared.context, prepared.width, prepared.height, data, accent, accent2, time, features);
}

export function createVisualController(options) {
  const base = createBaseVisualController({
    ...options,
    delegatedModes: CUSTOM_MODE_IDS,
    externalHomeRenderer: true
  });
  const { audio, $, getAccent } = options;
  const labCanvas = $('#lab-visualizer');
  const homeCanvas = $('#home-visualizer');
  const controls = document.querySelector('.lab-controls');
  const raw = new Uint8Array(128);
  const shaped = new Uint8Array(128);
  const reactive = new Uint8Array(128);
  const tracker = createAudioReactivityTracker({ attack: .74, release: .13, transientDecay: .79 });
  let mode = DEFAULT_MODE;
  let frame = 0;

  const defaultButton = installControls(controls);
  controls?.querySelectorAll('[data-visual]').forEach(button => {
    button.classList.toggle('active', button === defaultButton);
    button.addEventListener('click', () => {
      mode = button.dataset.visual || DEFAULT_MODE;
      base.setMode(mode);
      controls.querySelectorAll('[data-visual]').forEach(item => item.classList.toggle('active', item === button));
      button.scrollIntoView?.({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    });
  });
  base.setMode(DEFAULT_MODE);

  if (labCanvas) labCanvas.dataset.visualMode = DEFAULT_MODE;
  if (homeCanvas) {
    homeCanvas.dataset.visualMode = DEFAULT_MODE;
    homeCanvas.setAttribute('aria-label', 'Live sound-reactive Wave Cathedral visualization');
  }
  const homeTitle = document.querySelector('.now-panel .panel-head h3');
  if (homeTitle) homeTitle.textContent = 'Wave Cathedral';
  document.documentElement.dataset.audioLabRenderer = 'fft-mechanical-v3';

  function readReactiveFrame() {
    const reading = readAudioLabSpectrum(raw);
    if (!reading.available) {
      if (!audio.paused && !audio.ended) synthesizePlaybackSpectrum(raw, Number(audio.currentTime) || 0);
      else raw.fill(0);
    }

    const features = tracker.update(raw);
    shapeReactiveSpectrum(raw, shaped, features);
    for (let index = 0; index < reactive.length; index += 1) {
      const attack = shaped[index] > reactive[index] ? .72 : .18;
      reactive[index] = Math.max(0, Math.min(255, Math.round(
        reactive[index] + (shaped[index] - reactive[index]) * attack
      )));
    }
    return { reading, features };
  }

  function render() {
    const time = performance.now() / 1000;
    const { reading, features } = readReactiveFrame();
    document.documentElement.dataset.audioLabFeed = reading.state || (reading.available ? 'live' : 'warming');
    document.documentElement.dataset.audioLabKick = features.kick.toFixed(3);

    renderMode(homeCanvas, drawWaveCathedralMode, reactive, getAccent, time, features);

    const customRenderer = CUSTOM_RENDERERS.get(mode);
    if (customRenderer) {
      if (labCanvas) labCanvas.dataset.visualMode = mode;
      renderMode(labCanvas, customRenderer, reactive, getAccent, time, features);
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
