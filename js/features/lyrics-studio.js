import { getTrack } from '../core/catalog-store.js';
import { ensureStylesheet } from '../core/assets.js';

const STUDIO_REQUEST_KEY = 'shinobi-launchpad-open-studio-track';
let pendingStudioTrackId = null;

export function requestLyricsStudio(trackId) {
  const requestedTrackId = String(trackId || '').trim();
  if (!requestedTrackId) return false;

  pendingStudioTrackId = requestedTrackId;
  try {
    window.sessionStorage.setItem(STUDIO_REQUEST_KEY, requestedTrackId);
  } catch {
    // The in-memory request remains authoritative when storage is blocked.
  }

  window.dispatchEvent(new CustomEvent('shinobi:lyrics-studio-request', {
    detail: { trackId: requestedTrackId }
  }));
  return true;
}

function currentTrack(audio) {
  return getTrack(audio?.dataset.trackId || '') || null;
}

function createStudioCanvas() {
  const shell = document.createElement('div');
  shell.className = 'lyrics-studio-canvas';
  shell.hidden = true;
  shell.setAttribute('aria-hidden', 'true');

  const video = document.createElement('video');
  video.className = 'lyrics-studio-canvas-video';
  video.controls = false;
  video.muted = true;
  video.defaultMuted = true;
  video.loop = true;
  video.playsInline = true;
  video.preload = 'none';
  video.disablePictureInPicture = true;
  video.setAttribute('muted', '');
  video.setAttribute('loop', '');
  video.setAttribute('playsinline', '');
  video.setAttribute('controlslist', 'nodownload noplaybackrate noremoteplayback');

  const badge = document.createElement('span');
  badge.className = 'lyrics-studio-canvas-badge';
  badge.textContent = 'SPOTIFY CANVAS';
  shell.append(video, badge);
  return shell;
}

function setPressed(button, pressed) {
  if (!button) return;
  button.setAttribute('aria-pressed', String(pressed));
  button.classList.toggle('active', pressed);
}

export function initLyricsStudio({ audio = document.querySelector('#audio') } = {}) {
  const view = document.querySelector('#view-lyrics');
  const head = document.querySelector('.lyrics-reader-head');
  const stage = document.querySelector('#view-lyrics .lyrics-stage');
  const trackPanel = stage?.querySelector('.lyrics-track-panel');
  if (!view || !head || !stage || !trackPanel) return;

  ensureStylesheet('css/track-videos.css');

  const previousControls = head.querySelector('.lyrics-studio-controls');
  const autoScrollButton = head.querySelector('#lyrics-autoscroll')
    || previousControls?.querySelector('#lyrics-autoscroll');
  if (autoScrollButton && previousControls?.contains(autoScrollButton)) {
    head.appendChild(autoScrollButton);
  }
  previousControls?.remove();
  view.querySelector('.lyrics-studio-canvas')?.remove();

  const controls = document.createElement('div');
  controls.className = 'lyrics-studio-controls';
  controls.setAttribute('aria-label', 'Lyrics display controls');

  const canvasButton = document.createElement('button');
  canvasButton.className = 'chip';
  canvasButton.type = 'button';
  canvasButton.dataset.lyricsStudio = 'canvas';
  canvasButton.hidden = true;
  canvasButton.textContent = 'Canvas on';

  const modeButton = document.createElement('button');
  modeButton.className = 'chip';
  modeButton.type = 'button';
  modeButton.dataset.lyricsStudio = 'mode';
  modeButton.textContent = 'Studio mode';

  if (autoScrollButton) controls.appendChild(autoScrollButton);
  controls.append(canvasButton, modeButton);
  head.appendChild(controls);

  const canvasShell = createStudioCanvas();
  const canvasVideo = canvasShell.querySelector('video');
  trackPanel.prepend(canvasShell);

  let savedScrollY = 0;
  let canvasEnabled = !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  let studioRequestTimer = null;

  function setCanvasButtonState() {
    setPressed(canvasButton, canvasEnabled);
    canvasButton.textContent = canvasEnabled ? 'Canvas on' : 'Canvas off';
  }

  function setModeButtonState(active) {
    setPressed(modeButton, active);
    modeButton.textContent = active ? 'Exit studio' : 'Studio mode';
  }

  function updateControlsLayout() {
    controls.classList.toggle('has-canvas-control', !canvasButton.hidden);
  }

  function pauseCanvas() {
    canvasVideo.pause();
    canvasShell.hidden = true;
    canvasShell.setAttribute('aria-hidden', 'true');
    view.classList.remove('lyrics-studio-canvas-active');
  }

  function loadCanvas(track) {
    if (!track?.video) {
      canvasShell.dataset.trackId = '';
      canvasVideo.dataset.src = '';
      canvasVideo.removeAttribute('src');
      canvasVideo.load();
      pauseCanvas();
      return false;
    }

    if (canvasShell.dataset.trackId !== track.id) {
      canvasVideo.pause();
      canvasVideo.removeAttribute('src');
      canvasVideo.load();
      canvasShell.dataset.trackId = track.id;
      canvasVideo.dataset.src = track.video;
    }
    return true;
  }

  function playCanvas() {
    const track = currentTrack(audio);
    if (!loadCanvas(track) || !canvasEnabled || !view.classList.contains('lyrics-studio-mode')) {
      pauseCanvas();
      return;
    }

    canvasShell.hidden = false;
    canvasShell.setAttribute('aria-hidden', 'false');
    view.classList.add('lyrics-studio-canvas-active');
    if (!canvasVideo.src) {
      canvasVideo.src = canvasVideo.dataset.src;
      canvasVideo.load();
    }
    canvasVideo.muted = true;
    canvasVideo.play().catch(error => {
      console.info('Studio Canvas playback awaits another user gesture.', error);
    });
  }

  function syncCanvasTrack() {
    const hasCanvas = loadCanvas(currentTrack(audio));
    const studioOpen = view.classList.contains('lyrics-studio-mode');
    canvasButton.hidden = !hasCanvas || !studioOpen;
    updateControlsLayout();
    setCanvasButtonState();
    if (hasCanvas && studioOpen && canvasEnabled) playCanvas();
    else pauseCanvas();
  }

  function centerActiveLyric() {
    const reader = document.querySelector('#lyrics-reader');
    const activeLine = reader?.querySelector('.lyric-line.active');
    if (!reader || !activeLine) return;
    const target = activeLine.offsetTop - (reader.clientHeight - activeLine.offsetHeight) / 2;
    reader.scrollTo({ top: Math.max(0, target), behavior: 'auto' });
  }

  function setStudioMode(active, { restoreScroll = true } = {}) {
    const wasActive = view.classList.contains('lyrics-studio-mode');
    if (active === wasActive) return;

    if (active) {
      savedScrollY = window.scrollY;
      view.classList.add('lyrics-studio-mode');
      document.body.classList.add('lyrics-studio-open');
      setModeButtonState(true);
      syncCanvasTrack();
      view.scrollTop = 0;
      window.scrollTo({ top: 0, behavior: 'auto' });
      window.setTimeout(() => {
        view.scrollTop = 0;
        centerActiveLyric();
      }, 0);
      return;
    }

    pauseCanvas();
    canvasButton.hidden = true;
    updateControlsLayout();
    view.classList.remove('lyrics-studio-mode');
    document.body.classList.remove('lyrics-studio-open');
    setModeButtonState(false);
    if (restoreScroll) window.scrollTo({ top: savedScrollY, behavior: 'auto' });
  }

  function requestedStudioTrack() {
    if (pendingStudioTrackId) return pendingStudioTrackId;

    try {
      const storedTrackId = window.sessionStorage.getItem(STUDIO_REQUEST_KEY);
      if (storedTrackId) pendingStudioTrackId = storedTrackId;
      return storedTrackId;
    } catch {
      return null;
    }
  }

  function clearStudioRequest() {
    pendingStudioTrackId = null;
    try {
      window.sessionStorage.removeItem(STUDIO_REQUEST_KEY);
    } catch {
      // Storage can be unavailable in hardened private browsing contexts.
    }
  }

  function consumeStudioRequest() {
    const requestedTrackId = requestedStudioTrack();
    const track = currentTrack(audio);
    if (!requestedTrackId || requestedTrackId !== track?.id || !view.classList.contains('active')) return false;
    clearStudioRequest();
    setStudioMode(true, { restoreScroll: false });
    return true;
  }

  function scheduleStudioRequestConsumption(attempt = 0) {
    window.clearTimeout(studioRequestTimer);
    studioRequestTimer = window.setTimeout(() => {
      studioRequestTimer = null;
      if (consumeStudioRequest()) return;
      if (requestedStudioTrack() && attempt < 10) {
        scheduleStudioRequestConsumption(attempt + 1);
      }
    }, attempt === 0 ? 0 : 40);
  }

  modeButton.addEventListener('click', () => {
    setStudioMode(!view.classList.contains('lyrics-studio-mode'));
  });

  canvasButton.addEventListener('click', () => {
    canvasEnabled = !canvasEnabled;
    setCanvasButtonState();
    if (canvasEnabled) playCanvas();
    else pauseCanvas();
  });

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') setStudioMode(false);
  });

  const activeViewObserver = new MutationObserver(() => {
    if (!view.classList.contains('active')) {
      setStudioMode(false, { restoreScroll: false });
      return;
    }
    scheduleStudioRequestConsumption();
  });
  activeViewObserver.observe(view, { attributes: true, attributeFilter: ['class'] });

  if (audio) {
    new MutationObserver(() => {
      syncCanvasTrack();
      scheduleStudioRequestConsumption();
    }).observe(audio, {
      attributes: true,
      attributeFilter: ['data-track-id']
    });
  }
  document.querySelector('#lyrics-track-select')?.addEventListener('change', () => {
    window.setTimeout(() => {
      syncCanvasTrack();
      scheduleStudioRequestConsumption();
    }, 0);
  });

  window.addEventListener('shinobi:lyrics-studio-request', event => {
    const requestedTrackId = String(event.detail?.trackId || '').trim();
    if (requestedTrackId) pendingStudioTrackId = requestedTrackId;
    scheduleStudioRequestConsumption();
  });

  window.addEventListener('hashchange', () => {
    scheduleStudioRequestConsumption();
  });

  window.addEventListener('pagehide', () => {
    window.clearTimeout(studioRequestTimer);
    pauseCanvas();
    canvasButton.hidden = true;
    updateControlsLayout();
    view.classList.remove('lyrics-studio-mode');
    document.body.classList.remove('lyrics-studio-open');
  });

  setPressed(autoScrollButton, autoScrollButton?.getAttribute('aria-pressed') !== 'false');
  setCanvasButtonState();
  setModeButtonState(false);
  syncCanvasTrack();
  scheduleStudioRequestConsumption();
}
