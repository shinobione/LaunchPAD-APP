import { readAudioLabSpectrum } from '../audio-lab-signal.js';
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
const SHOWCASE_MODES = [
  { id: DEFAULT_MODE, label: 'Wave Cathedral' },
  { id: 'prism-tunnel', label: 'Prism Tunnel' },
  { id: 'aurora-glass', label: 'Aurora Glass' },
  { id: 'cyber-rain', label: 'Cyber Rain' },
  { id: 'quantum-grid', label: 'Quantum Grid' }
];
const OVERLAY_MODES = new Set(['circle', ...SHOWCASE_MODES.map(mode => mode.id)]);

function prepareCanvas(canvas) {
  if (!canvas) return null;
  const rect = canvas.getBoundingClientRect();
  if (!rect.width || !rect.height) return null;
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

function installShowcaseButtons(controls) {
  if (!controls) return;
  controls.querySelector('[data-visual="constellation"]')?.remove();
  controls.style.display = 'flex';
  controls.style.alignItems = 'center';
  controls.style.gap = '8px';
  controls.style.overflowX = 'auto';
  controls.style.overflowY = 'hidden';
  controls.style.flexWrap = 'nowrap';
  controls.style.paddingBottom = '8px';
  controls.style.scrollbarWidth = 'thin';
  controls.style.overscrollBehaviorX = 'contain';

  SHOWCASE_MODES.forEach(({ id, label }, index) => {
    let button = controls.querySelector(`[data-visual="${id}"]`);
    if (!button) {
      button = document.createElement('button');
      button.className = 'chip';
      button.dataset.visual = id;
    }
    button.textContent = label;
    button.style.flex = '0 0 auto';
    if (index === 0) controls.prepend(button);
    else controls.appendChild(button);
  });
}

function renderOverlay(mode, prepared, data, accent, accent2, time) {
  const args = [prepared.context, prepared.width, prepared.height, data, accent, accent2, time];
  switch (mode) {
    case 'circle': drawOrbitMode(...args); break;
    case 'prism-tunnel': drawPrismTunnelMode(...args); break;
    case 'aurora-glass': drawAuroraGlassMode(...args); break;
    case 'cyber-rain': drawCyberRainMode(...args); break;
    case 'wave-cathedral': drawWaveCathedralMode(...args); break;
    case 'quantum-grid': drawQuantumGridMode(...args); break;
    default: break;
  }
}

export function createVisualController(options) {
  const { audio, $, getAccent } = options;
  const controls = document.querySelector('.lab-controls');
  const homeCanvas = $('#home-visualizer');
  const labCanvas = $('#lab-visualizer');
  const homeTitle = document.querySelector('.now-panel .panel-head h3');
  const data = new Uint8Array(128);
  let mode = DEFAULT_MODE;
  let frame = 0;

  installShowcaseButtons(controls);

  // The base controller still owns the legacy Audio Lab effects and the shared
  // Web Audio analyser, but the home canvas is reserved for Wave Cathedral.
  const baseDollar = selector => selector === '#home-visualizer' ? null : $(selector);
  const base = createBaseVisualController({ ...options, $: baseDollar });

  if (homeTitle) homeTitle.textContent = 'Wave Cathedral';
  if (homeCanvas) {
    homeCanvas.dataset.visualMode = DEFAULT_MODE;
    homeCanvas.setAttribute('aria-label', 'Sound-reactive Wave Cathedral visualization');
  }
  document.documentElement.dataset.audioLabRenderer = 'live-analyser';

  function selectMode(nextMode, button, shouldScroll = false) {
    mode = nextMode || DEFAULT_MODE;
    if (labCanvas) labCanvas.dataset.visualMode = mode;
    controls?.querySelectorAll('[data-visual]').forEach(item => {
      item.classList.toggle('active', item.dataset.visual === mode);
    });
    if (shouldScroll && button) {
      button.scrollIntoView?.({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  }

  controls?.querySelectorAll('[data-visual]').forEach(button => {
    button.addEventListener('click', event => selectMode(button.dataset.visual, button, event.isTrusted));
  });

  const defaultButton = controls?.querySelector(`[data-visual="${DEFAULT_MODE}"]`);
  defaultButton?.click();
  selectMode(DEFAULT_MODE, defaultButton);

  function render() {
    const signal = readAudioLabSpectrum(data);
    document.documentElement.dataset.audioLabFrameSignal = signal.state;
    const [accent, accent2] = getAccent();
    const time = performance.now() / 1000;

    const homePrepared = prepareCanvas(homeCanvas);
    if (homePrepared) {
      renderOverlay(DEFAULT_MODE, homePrepared, data, accent, accent2, time);
    }

    if (labCanvas && OVERLAY_MODES.has(mode)) {
      const labPrepared = prepareCanvas(labCanvas);
      if (labPrepared) renderOverlay(mode, labPrepared, data, accent, accent2, time);
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
