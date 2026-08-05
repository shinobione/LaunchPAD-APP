import { readAudioLabSpectrum, synthesizePlaybackSpectrum } from '../audio-lab-signal.js';
import { createVisualController as createBaseVisualController } from './visual-engine-v2.js';
import {
  drawOrbitMode,
  drawPrismTunnelMode,
  drawAuroraGlassMode,
  drawCyberRainMode,
  drawWaveCathedralMode,
  drawQuantumGridMode
} from './visual-engine-core-modes.js';

const DEFAULT_MODE = 'wave-cathedral';
const CUSTOM_MODES = [
  { id: 'wave-cathedral', label: 'Wave Cathedral', renderer: drawWaveCathedralMode },
  { id: 'circle', label: 'Orbit', renderer: drawOrbitMode },
  { id: 'prism-tunnel', label: 'Prism Tunnel', renderer: drawPrismTunnelMode },
  { id: 'aurora-glass', label: 'Aurora Glass', renderer: drawAuroraGlassMode },
  { id: 'cyber-rain', label: 'Cyber Rain', renderer: drawCyberRainMode },
  { id: 'quantum-grid', label: 'Quantum Grid', renderer: drawQuantumGridMode }
];
const CUSTOM_RENDERERS = new Map(CUSTOM_MODES.map(mode => [mode.id, mode.renderer]));

function clampByte(value) {
  return Math.max(0, Math.min(255, Math.round(value)));
}

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
  controls.querySelector('[data-visual="constellation"]')?.remove();

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

function readReactiveData(audio, raw, smoothed) {
  const reading = readAudioLabSpectrum(raw);

  if (!reading.available) {
    if (!audio.paused && !audio.ended) synthesizePlaybackSpectrum(raw, Number(audio.currentTime) || 0);
    else raw.fill(0);
  }

  for (let index = 0; index < raw.length; index += 1) {
    const boosted = Math.pow(raw[index] / 255, .72) * 255;
    const attack = boosted > smoothed[index] ? .58 : .2;
    smoothed[index] = clampByte(smoothed[index] + (boosted - smoothed[index]) * attack);
  }

  return reading;
}

function renderMode(canvas, renderer, data, getAccent, time) {
  const prepared = prepareCanvas(canvas);
  if (!prepared || typeof renderer !== 'function') return;
  const [accent, accent2] = getAccent();
  renderer(prepared.context, prepared.width, prepared.height, data, accent, accent2, time);
}

export function createVisualController(options) {
  const base = createBaseVisualController(options);
  const { audio, $, getAccent } = options;
  const labCanvas = $('#lab-visualizer');
  const homeCanvas = $('#home-visualizer');
  const controls = document.querySelector('.lab-controls');
  const raw = new Uint8Array(128);
  const reactive = new Uint8Array(128);
  let mode = DEFAULT_MODE;
  let frame = 0;

  const defaultButton = installControls(controls);
  controls?.querySelectorAll('[data-visual]').forEach(button => {
    button.classList.toggle('active', button === defaultButton);
    button.addEventListener('click', () => {
      mode = button.dataset.visual || DEFAULT_MODE;
      controls.querySelectorAll('[data-visual]').forEach(item => item.classList.toggle('active', item === button));
      button.scrollIntoView?.({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    });
  });

  if (labCanvas) labCanvas.dataset.visualMode = DEFAULT_MODE;
  if (homeCanvas) {
    homeCanvas.dataset.visualMode = DEFAULT_MODE;
    homeCanvas.setAttribute('aria-label', 'Live sound-reactive Wave Cathedral visualization');
  }
  const homeTitle = document.querySelector('.now-panel .panel-head h3');
  if (homeTitle) homeTitle.textContent = 'Wave Cathedral';
  document.documentElement.dataset.audioLabRenderer = 'live-analyser';

  function render() {
    const time = performance.now() / 1000;
    const reading = readReactiveData(audio, raw, reactive);
    document.documentElement.dataset.audioLabFeed = reading.state || (reading.available ? 'live' : 'warming');

    renderMode(homeCanvas, drawWaveCathedralMode, reactive, getAccent, time);

    const customRenderer = CUSTOM_RENDERERS.get(mode);
    if (customRenderer) {
      if (labCanvas) labCanvas.dataset.visualMode = mode;
      renderMode(labCanvas, customRenderer, reactive, getAccent, time);
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
