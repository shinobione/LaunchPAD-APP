import { getTrack } from '../core/catalog-store.js';
import { ensureStylesheet } from '../core/assets.js';
import { parseRoute, routeToHash } from '../core/router.js';

const ROUTE_CHANGE_EVENT = 'shinobi:route-change';

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
    if (active === wasActive) {
      if (active) syncCanvasTrack();
      return;
    }

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

  function routeMatchesCurrentStudio() {
    const route = parseRoute();
    const track = currentTrack(audio);
    return Boolean(
      route.type === 'studio'
      && route.id === track?.id
      && view.classList.contains('active')
    );
  }

  function syncStudioRoute() {
    const route = parseRoute();
    const shouldOpen = routeMatchesCurrentStudio();
    const restoreScroll = route.type === 'lyrics' && view.classList.contains('active');
    setStudioMode(shouldOpen, { restoreScroll });
  }

  function dispatchRouteHash(hash, { replace = false } = {}) {
    if (window.location.hash === hash) {
      syncStudioRoute();
      return;
    }

    if (!replace) {
      window.location.hash = hash;
      return;
    }

    window.history.replaceState(window.history.state, '', hash);
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  }

  function navigateStudioMode(active, { replace = false } = {}) {
    const track = currentTrack(audio);
    if (!track) return;
    const type = active ? 'studio' : 'lyrics';
    dispatchRouteHash(routeToHash({ type, id: track.id }), { replace });
  }

  function preserveStudioForCurrentTrack(shouldPreserve) {
    const track = currentTrack(audio);
    if (!shouldPreserve || !track || !view.classList.contains('active')) {
      syncStudioRoute();
      return;
    }

    const expectedHash = routeToHash({ type: 'studio', id: track.id });
    dispatchRouteHash(expectedHash, { replace: true });
  }

  modeButton.addEventListener('click', () => {
    navigateStudioMode(!view.classList.contains('lyrics-studio-mode'));
  });

  canvasButton.addEventListener('click', () => {
    canvasEnabled = !canvasEnabled;
    setCanvasButtonState();
    if (canvasEnabled) playCanvas();
    else pauseCanvas();
  });

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && view.classList.contains('lyrics-studio-mode')) {
      navigateStudioMode(false);
    }
  });

  const activeViewObserver = new MutationObserver(() => {
    if (!view.classList.contains('active')) {
      setStudioMode(false, { restoreScroll: false });
      return;
    }
    window.setTimeout(syncStudioRoute, 0);
  });
  activeViewObserver.observe(view, { attributes: true, attributeFilter: ['class'] });

  if (audio) {
    new MutationObserver(() => {
      const preserveStudio = view.classList.contains('lyrics-studio-mode')
        || parseRoute().type === 'studio';
      syncCanvasTrack();
      window.setTimeout(() => preserveStudioForCurrentTrack(preserveStudio), 0);
    }).observe(audio, {
      attributes: true,
      attributeFilter: ['data-track-id']
    });
  }

  document.querySelector('#lyrics-track-select')?.addEventListener('change', () => {
    const preserveStudio = view.classList.contains('lyrics-studio-mode')
      || parseRoute().type === 'studio';
    window.setTimeout(() => {
      syncCanvasTrack();
      preserveStudioForCurrentTrack(preserveStudio);
    }, 0);
  });

  window.addEventListener(ROUTE_CHANGE_EVENT, () => {
    window.setTimeout(syncStudioRoute, 0);
  });

  window.addEventListener('hashchange', () => {
    window.setTimeout(syncStudioRoute, 0);
  });

  window.addEventListener('pagehide', () => {
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
  window.setTimeout(syncStudioRoute, 0);
}
