import {
  AUDIO_LAB_DEFAULT_MODE,
  AUDIO_LAB_PRESET_IDS,
  AUDIO_LAB_PRESET_LABELS,
  isSanctionedAudioLabMode,
  normalizeAudioLabMode
} from './audio-lab-registry.js';

const VIDEO_SELECTOR = 'video.track-video-player, video.lyrics-studio-canvas-video';
const VIEW_LABELS = Object.freeze({ video: 'Video', player: 'Player' });
const PRESET_LABEL_OVERRIDES = new Map([
  ['gravity-lens', 'Halo Vector']
]);

function presetLabel(mode) {
  return PRESET_LABEL_OVERRIDES.get(mode) || AUDIO_LAB_PRESET_LABELS.get(mode) || mode;
}

function setTextIfChanged(element, value) {
  const next = String(value ?? '');
  if (element.textContent !== next) element.textContent = next;
}

function setAttributeIfChanged(element, name, value) {
  const next = String(value ?? '');
  if (element.getAttribute(name) !== next) element.setAttribute(name, next);
}

function orderPresetControls(controls) {
  const ordered = AUDIO_LAB_PRESET_IDS
    .map(mode => controls.querySelector(`[data-visual="${mode}"]`))
    .filter(Boolean);
  const current = [...controls.querySelectorAll('[data-visual]')];
  const alreadyOrdered = current.length === ordered.length
    && ordered.every((button, index) => current[index] === button);

  if (alreadyOrdered) return false;

  const fragment = document.createDocumentFragment();
  ordered.forEach(button => fragment.appendChild(button));
  controls.appendChild(fragment);
  return true;
}

function normalizePresetControls(root = document) {
  const controls = root.querySelector?.('.lab-controls');
  if (!controls) return;

  const seen = new Set();
  controls.querySelectorAll('[data-visual]').forEach(button => {
    const mode = String(button.dataset.visual || '').trim().toLowerCase();
    if (!isSanctionedAudioLabMode(mode) || seen.has(mode)) {
      button.remove();
      return;
    }

    seen.add(mode);
    if (button.dataset.visual !== mode) button.dataset.visual = mode;
    const label = presetLabel(mode);
    setTextIfChanged(button, label);
    setAttributeIfChanged(button, 'aria-label', `Use ${label} visualizer`);
  });

  orderPresetControls(controls);

  const active = controls.querySelector('[data-visual].active');
  if (!active || !isSanctionedAudioLabMode(active.dataset.visual)) {
    controls.querySelector(`[data-visual="${AUDIO_LAB_DEFAULT_MODE}"]`)?.click();
  }
  if (controls.dataset.audioLabRegistry !== 'sanctioned-v1') {
    controls.dataset.audioLabRegistry = 'sanctioned-v1';
  }
}

function normalizeVisualModePresentation(modeValue) {
  const mode = normalizeAudioLabMode(modeValue, AUDIO_LAB_DEFAULT_MODE);
  const label = presetLabel(mode);
  const heading = document.querySelector('.now-panel .panel-head h3');
  if (heading) setTextIfChanged(heading, label);

  const labCanvas = document.querySelector('#lab-visualizer');
  if (labCanvas?.dataset.visualMode === mode) {
    setAttributeIfChanged(labCanvas, 'aria-label', `Live audio-reactive ${label} visualization`);
  }

  const homeCanvas = document.querySelector('#home-visualizer');
  if (homeCanvas?.dataset.visualMode === mode) {
    setAttributeIfChanged(homeCanvas, 'aria-label', `Live audio-reactive ${label} visualization`);
  }
}

function normalizeStudioLabels(root = document) {
  root.querySelectorAll?.('[data-track-video-action]').forEach(button => {
    const expanded = button.getAttribute('aria-expanded') === 'true';
    const label = expanded ? VIEW_LABELS.player : VIEW_LABELS.video;
    setTextIfChanged(button, label);
    setAttributeIfChanged(button, 'aria-label', expanded ? 'Show audio player' : 'Show track video');
  });

  root.querySelectorAll?.('.track-detail-canvas-badge, .lyrics-studio-canvas-badge').forEach(badge => badge.remove());

  root.querySelectorAll?.('button').forEach(button => {
    const text = button.textContent.trim().toLowerCase();
    if (text === 'cropped' || text === 'show canvas' || text === 'open canvas') {
      setTextIfChanged(button, VIEW_LABELS.video);
    }
    if (text === 'show track' || text === 'hide canvas') {
      setTextIfChanged(button, VIEW_LABELS.player);
    }
  });
}

function stabilizeVideo(video, audio) {
  if (!(video instanceof HTMLVideoElement) || video.dataset.audioLabStudioStable === 'true') return;
  video.dataset.audioLabStudioStable = 'true';
  video.muted = true;
  video.defaultMuted = true;
  video.loop = true;
  video.playsInline = true;
  video.preload = 'auto';
  video.setAttribute('muted', '');
  video.setAttribute('loop', '');
  video.setAttribute('playsinline', '');
  video.setAttribute('webkit-playsinline', '');
  video.setAttribute('preload', 'auto');

  let recoveryFrame = 0;
  let lastRecovery = 0;

  const visible = () => {
    const view = video.closest('.view');
    return video.isConnected && !video.closest('[hidden]') && (!view || view.classList.contains('active'));
  };

  const shouldPlay = () => visible() && audio && !audio.paused && !audio.ended && document.visibilityState !== 'hidden';

  const resume = reason => {
    if (!shouldPlay()) return;
    video.muted = true;
    const result = video.play();
    Promise.resolve(result).catch(error => console.info(`Studio video resume (${reason}) awaits a gesture.`, error));
  };

  const recover = reason => {
    const now = performance.now();
    if (now - lastRecovery < 140) return;
    lastRecovery = now;
    cancelAnimationFrame(recoveryFrame);
    recoveryFrame = requestAnimationFrame(() => {
      if (Number.isFinite(video.duration) && video.duration > 0 && (video.ended || video.currentTime >= video.duration - .065)) {
        try { video.currentTime = .001; } catch {}
      }
      if (video.readyState < HTMLMediaElement.HAVE_FUTURE_DATA && video.networkState !== HTMLMediaElement.NETWORK_LOADING) {
        try { video.load(); } catch {}
      }
      resume(reason);
    });
  };

  ['ended', 'stalled', 'waiting', 'suspend'].forEach(type => video.addEventListener(type, () => recover(type)));
  video.addEventListener('timeupdate', () => {
    if (Number.isFinite(video.duration) && video.duration - video.currentTime < .09) recover('boundary');
  });

  ['play', 'playing'].forEach(type => audio?.addEventListener(type, () => resume(`audio-${type}`)));
  ['pause', 'ended', 'emptied'].forEach(type => audio?.addEventListener(type, () => video.pause()));
  document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' ? resume('visibility') : video.pause());
  if (shouldPlay()) resume('install');
}

function hydrate(root, audio) {
  normalizePresetControls(root instanceof Document ? root : document);
  normalizeStudioLabels(root);
  if (root instanceof HTMLVideoElement && root.matches(VIDEO_SELECTOR)) stabilizeVideo(root, audio);
  root.querySelectorAll?.(VIDEO_SELECTOR).forEach(video => stabilizeVideo(video, audio));
}

export function initAudioLabSanctuary({ audio = document.querySelector('#audio') } = {}) {
  if (window.__shinobiAudioLabSanctuaryReady) return;
  window.__shinobiAudioLabSanctuaryReady = true;

  document.documentElement.dataset.audioLabRegistry = 'sanctioned-v1';
  document.documentElement.dataset.audioLabDefault = normalizeAudioLabMode(AUDIO_LAB_DEFAULT_MODE);
  hydrate(document, audio);
  normalizeVisualModePresentation(document.querySelector('.lab-controls [data-visual].active')?.dataset.visual || AUDIO_LAB_DEFAULT_MODE);

  let scheduled = false;
  new MutationObserver(records => {
    let hasRelevantAddition = false;
    records.forEach(record => record.addedNodes.forEach(node => {
      if (!(node instanceof Element)) return;
      hasRelevantAddition = true;
      hydrate(node, audio);
    }));
    if (!hasRelevantAddition || scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      normalizePresetControls(document);
      normalizeStudioLabels(document);
    });
  }).observe(document.body, { childList: true, subtree: true });

  window.addEventListener('shinobi:visual-mode', event => {
    normalizeVisualModePresentation(event.detail?.mode);
  });
  window.addEventListener('shinobi:route-change', () => hydrate(document, audio));
}
