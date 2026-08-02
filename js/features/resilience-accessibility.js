import { getTrack, tracks } from '../core/catalog-store.js';

const LANGUAGE_CODES = { French: 'fr', English: 'en', Vietnamese: 'vi' };
const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

function primaryLanguage(track) {
  return LANGUAGE_CODES[track?.languages?.[0]] || 'en';
}

function installAudioStatus(audio) {
  const player = document.querySelector('.player-bar');
  if (!player || document.querySelector('#audio-status')) return;

  const status = document.createElement('div');
  status.id = 'audio-status';
  status.className = 'audio-status';
  status.setAttribute('role', 'status');
  status.setAttribute('aria-live', 'polite');
  status.hidden = true;
  status.innerHTML = '<span></span><button type="button" data-audio-retry>Retry</button>';
  player.appendChild(status);

  let waitingTimer = 0;
  const message = status.querySelector('span');

  function show(text, retry = false) {
    message.textContent = text;
    status.querySelector('button').hidden = !retry;
    status.hidden = false;
  }

  function clear() {
    window.clearTimeout(waitingTimer);
    status.hidden = true;
    message.textContent = '';
  }

  audio.addEventListener('playing', clear);
  audio.addEventListener('canplay', clear);
  audio.addEventListener('waiting', () => {
    window.clearTimeout(waitingTimer);
    waitingTimer = window.setTimeout(() => show('Buffering audio…'), 900);
  });
  audio.addEventListener('stalled', () => show('The audio connection is slow.', true));
  audio.addEventListener('error', () => show(navigator.onLine ? 'This track could not be loaded.' : 'Audio needs an internet connection.', true));
  window.addEventListener('offline', () => show('Offline mode: the interface works, but audio remains online-only.', true));
  window.addEventListener('online', () => { if (audio.error) show('Connection restored. Retry the track.', true); else clear(); });

  status.addEventListener('click', event => {
    if (!event.target.closest('[data-audio-retry]')) return;
    const time = Number.isFinite(audio.currentTime) ? audio.currentTime : 0;
    audio.load();
    audio.addEventListener('loadedmetadata', () => {
      if (time > 0 && time < audio.duration) audio.currentTime = time;
      audio.play().catch(() => show('Playback still cannot start.', true));
    }, { once: true });
  });
}

function syncLyricsLanguage(audio) {
  const track = getTrack(audio.dataset.trackId) || tracks[0];
  const lang = primaryLanguage(track);
  ['#lyrics-reader', '#home-lyrics', '#lyrics-title'].forEach(selector => {
    document.querySelector(selector)?.setAttribute('lang', lang);
  });
  document.querySelector('#lyrics-reader')?.setAttribute('aria-live', 'off');
  document.querySelector('#home-lyrics')?.setAttribute('aria-live', 'off');
}

function installImageFallbacks() {
  document.addEventListener('error', event => {
    const image = event.target;
    if (!(image instanceof HTMLImageElement) || image.dataset.fallbackApplied) return;
    image.dataset.fallbackApplied = 'true';
    image.src = 'assets/logo.png';
    image.classList.add('image-fallback');
  }, true);
}

function enhanceDialogs() {
  const dialog = document.querySelector('#visual-card-modal .visual-card-dialog');
  const caption = document.querySelector('#visual-card-modal .visual-card-caption');
  if (dialog && caption) {
    caption.id ||= 'visual-card-description';
    dialog.setAttribute('aria-describedby', caption.id);
  }
}

function trapFocus(container, event) {
  if (event.key !== 'Tab') return;
  const items = [...container.querySelectorAll(FOCUSABLE)].filter(item => !item.hidden && item.offsetParent !== null);
  if (!items.length) return;
  const first = items[0];
  const last = items.at(-1);
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}

function installDialogFocusManagement() {
  enhanceDialogs();
  new MutationObserver(enhanceDialogs).observe(document.body, { childList: true, subtree: true });
  document.addEventListener('keydown', event => {
    const visual = document.querySelector('#visual-card-modal:not([hidden]) .visual-card-dialog');
    const queue = document.querySelector('#queue-panel.open');
    const active = visual || queue;
    if (active) trapFocus(active, event);
  });
}

function syncMotionPreference() {
  const query = window.matchMedia('(prefers-reduced-motion: reduce)');
  const apply = () => { document.documentElement.dataset.reducedMotion = String(query.matches); };
  apply();
  query.addEventListener?.('change', apply);
}

export function initResilienceAccessibility({ audio = document.querySelector('#audio') } = {}) {
  if (!audio || window.__shinobiResilienceReady) return;
  window.__shinobiResilienceReady = true;
  installAudioStatus(audio);
  installImageFallbacks();
  installDialogFocusManagement();
  syncMotionPreference();
  syncLyricsLanguage(audio);
  new MutationObserver(() => syncLyricsLanguage(audio))
    .observe(audio, { attributes: true, attributeFilter: ['data-track-id'] });
}
