import { getTrack } from '../core/catalog-store.js';
import { ensureStylesheet } from '../core/assets.js';
import { parseRoute, routeToHash } from '../core/router.js';
import { centerElementInScrollContainer } from './lyrics/lyrics-engine.js';

const ROUTE_CHANGE_EVENT = 'shinobi:route-change';
const CANVAS_LOCAL_STALL_GRACE_MS = 1400;
const CANVAS_LOCAL_RECOVERY_LIMIT = 2;

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
  video.autoplay = false;
  video.muted = true;
  video.defaultMuted = true;
  video.loop = false;
  video.playsInline = true;
  video.preload = 'auto';
  video.disablePictureInPicture = true;
  video.disableRemotePlayback = true;
  video.setAttribute('muted', '');
  video.setAttribute('playsinline', '');
  video.setAttribute('webkit-playsinline', '');
  video.setAttribute('aria-label', 'Looping Spotify Canvas preview');
  video.setAttribute('controlslist', 'nodownload noplaybackrate noremoteplayback');

  const badge = document.createElement('span');
  badge.className = 'lyrics-studio-canvas-badge';
  badge.textContent = 'SPOTIFY CANVAS';
  shell.append(video, badge);
  return shell;
}

function createMobileTrackToggle() {
  const button = document.createElement('button');
  button.className = 'lyrics-mobile-track-toggle';
  button.type = 'button';
  button.hidden = true;
  button.setAttribute('aria-expanded', 'true');
  button.textContent = 'Collapse';
  return button;
}

function setPressed(button, pressed) {
  if (!button) return;
  button.setAttribute('aria-pressed', String(pressed));
  button.classList.toggle('active', pressed);
}

function formatClock(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  return `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;
}

export function initLyricsStudio({ audio = document.querySelector('#audio') } = {}) {
  const view = document.querySelector('#view-lyrics');
  const head = document.querySelector('.lyrics-reader-head');
  const stage = document.querySelector('#view-lyrics .lyrics-stage');
  const trackPanel = stage?.querySelector('.lyrics-track-panel');
  if (!view || !head || !stage || !trackPanel) return;

  ensureStylesheet('css/track-videos.css');
  ensureStylesheet('css/mobile-studio.css');

  const previousControls = head.querySelector('.lyrics-studio-controls');
  const autoScrollButton = head.querySelector('#lyrics-autoscroll')
    || previousControls?.querySelector('#lyrics-autoscroll');
  if (autoScrollButton && previousControls?.contains(autoScrollButton)) {
    head.appendChild(autoScrollButton);
  }
  previousControls?.remove();
  view.querySelector('.lyrics-studio-canvas')?.remove();
  view.querySelector('.lyrics-mobile-track-toggle')?.remove();

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

  const panelToggle = createMobileTrackToggle();
  const canvasShell = createStudioCanvas();
  const canvasVideo = canvasShell.querySelector('video');
  const canvasBadge = canvasShell.querySelector('.lyrics-studio-canvas-badge');
  trackPanel.prepend(canvasShell);
  trackPanel.prepend(panelToggle);

  const mobileStudioQuery = window.matchMedia?.('(max-width:760px)');
  let savedScrollY = 0;
  let canvasEnabled = !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  let mobilePanelCollapsed = false;
  let canvasObjectUrl = '';
  let canvasLoadPromise = null;
  let canvasLoadTrackId = '';
  let canvasAbortController = null;
  let canvasFailedTrackId = '';
  let canvasPausedForAudioSeek = false;
  let canvasLocalRecoveryTimer = 0;
  let canvasLocalRecoveryCount = 0;
  let seekPreviewTime = null;
  let lastCommittedSeekTime = Number.NaN;
  let lastCommittedSeekAt = 0;

  function isMobileStudio() {
    return Boolean(mobileStudioQuery?.matches && view.classList.contains('lyrics-studio-mode'));
  }

  function updatePanelToggleLabel() {
    const track = currentTrack(audio);
    const collapsed = trackPanel.classList.contains('lyrics-track-panel-collapsed');
    panelToggle.textContent = collapsed ? 'Show track' : 'Collapse';
    panelToggle.setAttribute('aria-expanded', String(!collapsed));
    panelToggle.setAttribute(
      'aria-label',
      `${collapsed ? 'Show' : 'Collapse'} track details${track?.title ? ` for ${track.title}` : ''}`
    );
  }

  function resetMobileTrackPanelScroll() {
    if (!isMobileStudio()) return;
    trackPanel.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }

  function setMobilePanelCollapsed(collapsed, { recenter = true } = {}) {
    mobilePanelCollapsed = Boolean(collapsed);
    const apply = isMobileStudio() && mobilePanelCollapsed;
    trackPanel.classList.toggle('lyrics-track-panel-collapsed', apply);
    view.classList.toggle('lyrics-studio-track-collapsed', apply);
    panelToggle.hidden = !isMobileStudio();
    updatePanelToggleLabel();

    if (!apply && isMobileStudio()) {
      resetMobileTrackPanelScroll();
      window.setTimeout(() => {
        resetMobileTrackPanelScroll();
        if (canvasEnabled) playCanvas('panel-expanded');
        if (recenter) centerActiveLyric();
      }, 0);
      return;
    }

    if (recenter) window.setTimeout(centerActiveLyric, 0);
  }

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

  function setCanvasBadge(label) {
    if (canvasBadge) canvasBadge.textContent = label;
  }

  function clearCanvasLocalRecovery() {
    window.clearTimeout(canvasLocalRecoveryTimer);
    canvasLocalRecoveryTimer = 0;
  }

  function revokeCanvasObjectUrl() {
    if (!canvasObjectUrl) return;
    URL.revokeObjectURL(canvasObjectUrl);
    canvasObjectUrl = '';
  }

  function resetCanvasTransport() {
    canvasAbortController?.abort();
    canvasAbortController = null;
    canvasLoadPromise = null;
    canvasLoadTrackId = '';
    canvasFailedTrackId = '';
    canvasPausedForAudioSeek = false;
    canvasLocalRecoveryCount = 0;
    clearCanvasLocalRecovery();
    canvasVideo.pause();
    canvasVideo.removeAttribute('src');
    canvasVideo.removeAttribute('data-transport');
    canvasVideo.load();
    revokeCanvasObjectUrl();
  }

  function pauseCanvas() {
    clearCanvasLocalRecovery();
    canvasVideo.pause();
    canvasPausedForAudioSeek = false;
    canvasShell.hidden = true;
    canvasShell.setAttribute('aria-hidden', 'true');
    view.classList.remove('lyrics-studio-canvas-active');
    canvasShell.dataset.playback = 'idle';
    setCanvasBadge('SPOTIFY CANVAS');
  }

  function loadCanvas(track) {
    if (!track?.video) {
      canvasShell.dataset.trackId = '';
      canvasVideo.dataset.src = '';
      canvasVideo.removeAttribute('poster');
      resetCanvasTransport();
      pauseCanvas();
      return false;
    }

    const poster = track.fullCover || track.cover || '';
    if (poster && canvasVideo.getAttribute('data-transport') !== 'blob') canvasVideo.poster = poster;

    const changed = canvasShell.dataset.trackId !== track.id
      || canvasVideo.dataset.src !== track.video;
    if (changed) {
      resetCanvasTransport();
      canvasShell.dataset.trackId = track.id;
      canvasVideo.dataset.src = track.video;
      canvasShell.dataset.playback = 'loading';
      setCanvasBadge('CANVAS LOADING');
    }
    return true;
  }

  function canRetryCanvas(reason) {
    return reason === 'canvas-toggle'
      || reason === 'studio-gesture'
      || reason === 'pageshow'
      || reason === 'visibilitychange';
  }

  async function prepareCanvasSource(track, reason = 'play') {
    if (!track?.video) return false;
    if (canvasObjectUrl && canvasVideo.getAttribute('data-transport') === 'blob') return true;
    if (canvasFailedTrackId === track.id && !canRetryCanvas(reason)) return false;
    if (canvasLoadPromise && canvasLoadTrackId === track.id) return canvasLoadPromise;

    canvasAbortController?.abort();
    const controller = new AbortController();
    canvasAbortController = controller;
    canvasLoadTrackId = track.id;
    canvasFailedTrackId = '';
    canvasShell.dataset.playback = 'loading';
    setCanvasBadge('CANVAS LOADING');

    const loadPromise = (async () => {
      const response = await fetch(track.video, {
        method: 'GET',
        mode: 'cors',
        credentials: 'omit',
        cache: 'force-cache',
        signal: controller.signal
      });
      if (!response.ok) {
        throw new Error(`Canvas fetch failed with HTTP ${response.status}.`);
      }

      const blob = await response.blob();
      if (!blob.size) throw new Error('Canvas fetch returned an empty media body.');
      if (controller.signal.aborted) return false;

      const activeTrack = currentTrack(audio);
      if (!activeTrack || activeTrack.id !== track.id || canvasShell.dataset.trackId !== track.id) {
        return false;
      }

      revokeCanvasObjectUrl();
      canvasObjectUrl = URL.createObjectURL(blob);
      canvasVideo.src = canvasObjectUrl;
      canvasVideo.setAttribute('data-transport', 'blob');
      canvasVideo.muted = true;
      canvasVideo.defaultMuted = true;
      canvasVideo.loop = false;
      canvasVideo.removeAttribute('loop');
      canvasVideo.playsInline = true;
      canvasShell.dataset.playback = 'ready';
      return true;
    })().catch(error => {
      if (error?.name === 'AbortError') return false;
      canvasFailedTrackId = track.id;
      canvasShell.dataset.playback = 'error';
      setCanvasBadge('CANVAS PREVIEW');
      console.info('Studio Canvas local transport could not be prepared.', error);
      return false;
    }).finally(() => {
      if (canvasLoadPromise === loadPromise) {
        canvasLoadPromise = null;
        canvasLoadTrackId = '';
        if (canvasAbortController === controller) canvasAbortController = null;
      }
    });

    canvasLoadPromise = loadPromise;
    return loadPromise;
  }

  async function playCanvas(reason = 'play') {
    const track = currentTrack(audio);
    if (!loadCanvas(track) || !canvasEnabled || !view.classList.contains('lyrics-studio-mode')) {
      pauseCanvas();
      return;
    }

    canvasShell.hidden = false;
    canvasShell.setAttribute('aria-hidden', 'false');
    view.classList.add('lyrics-studio-canvas-active');
    canvasShell.dataset.playbackReason = reason;

    const ready = await prepareCanvasSource(track, reason);
    if (!ready || !canvasEnabled || !view.classList.contains('lyrics-studio-mode')) return;
    if (currentTrack(audio)?.id !== track.id || canvasPausedForAudioSeek) return;

    canvasVideo.muted = true;
    canvasVideo.defaultMuted = true;
    canvasVideo.loop = false;
    canvasVideo.removeAttribute('loop');
    canvasVideo.playsInline = true;

    const promise = canvasVideo.play();
    if (!promise?.catch) return;
    promise.then(() => {
      canvasShell.dataset.playback = 'playing';
      setCanvasBadge('SPOTIFY CANVAS');
    }).catch(error => {
      canvasShell.dataset.playback = 'waiting';
      setCanvasBadge(canvasVideo.readyState >= 2 ? 'TAP FOR CANVAS' : 'CANVAS LOADING');
      console.info('Studio Canvas playback is waiting for a user gesture.', error);
    });
  }

  async function restartLocalCanvas(reason = 'local-recovery') {
    clearCanvasLocalRecovery();
    if (!canvasEnabled || canvasPausedForAudioSeek || canvasShell.hidden) return false;
    if (!view.classList.contains('lyrics-studio-mode')) return false;
    if (canvasVideo.getAttribute('data-transport') !== 'blob' || !canvasObjectUrl) return false;

    if (canvasLocalRecoveryCount >= CANVAS_LOCAL_RECOVERY_LIMIT) {
      canvasVideo.pause();
      canvasVideo.removeAttribute('poster');
      canvasShell.dataset.playback = 'degraded';
      setCanvasBadge('CANVAS PAUSED');
      return false;
    }

    canvasLocalRecoveryCount += 1;
    canvasShell.dataset.playback = 'recovering';
    setCanvasBadge('CANVAS RECOVERY');
    canvasVideo.pause();
    canvasVideo.removeAttribute('poster');

    try {
      canvasVideo.currentTime = 0;
    } catch {}

    try {
      const result = canvasVideo.play();
      if (result?.catch) await result;
      canvasShell.dataset.playback = 'playing';
      setCanvasBadge('SPOTIFY CANVAS');
      return true;
    } catch (error) {
      canvasShell.dataset.playback = 'recovering';
      console.info(`Studio Canvas local decoder recovery failed (${reason}).`, error);
      if (canvasLocalRecoveryCount < CANVAS_LOCAL_RECOVERY_LIMIT) {
        canvasVideo.load();
        scheduleLocalCanvasRecovery('local-reload');
      } else {
        canvasShell.dataset.playback = 'degraded';
        setCanvasBadge('CANVAS PAUSED');
      }
      return false;
    }
  }

  function scheduleLocalCanvasRecovery(reason = 'local-stall') {
    if (canvasLocalRecoveryTimer || canvasPausedForAudioSeek || canvasShell.hidden) return;
    if (canvasVideo.getAttribute('data-transport') !== 'blob') return;
    canvasLocalRecoveryTimer = window.setTimeout(() => {
      canvasLocalRecoveryTimer = 0;
      if (canvasShell.dataset.playback === 'playing' || canvasPausedForAudioSeek) return;
      restartLocalCanvas(reason);
    }, CANVAS_LOCAL_STALL_GRACE_MS);
  }

  function syncCanvasTrack() {
    const hasCanvas = loadCanvas(currentTrack(audio));
    const studioOpen = view.classList.contains('lyrics-studio-mode');
    canvasButton.hidden = !hasCanvas || !studioOpen;
    updateControlsLayout();
    setCanvasButtonState();
    updatePanelToggleLabel();
    if (hasCanvas && studioOpen && canvasEnabled) playCanvas('track-sync');
    else pauseCanvas();
  }

  function centerActiveLyric() {
    const reader = document.querySelector('#lyrics-reader');
    const activeLine = reader?.querySelector('.lyric-line.active');
    if (!reader || !activeLine) return;
    centerElementInScrollContainer(reader, activeLine, 'auto');
  }

  function renderSeekPreview(time, percent) {
    const miniProgress = document.querySelector('#mini-progress');
    const lyricsProgress = document.querySelector('#lyrics-progress-fill');
    const currentTime = document.querySelector('#current-time');
    const lyricsCurrentTime = document.querySelector('#lyrics-current-time');
    if (miniProgress) miniProgress.style.width = `${percent}%`;
    if (lyricsProgress) lyricsProgress.style.width = `${percent}%`;
    if (currentTime) currentTime.textContent = formatClock(time);
    if (lyricsCurrentTime) lyricsCurrentTime.textContent = formatClock(time);
    window.dispatchEvent(new CustomEvent('shinobi:seek-preview', { detail: { time, percent } }));
  }

  function installSingleCommitSeek() {
    const seek = document.querySelector('#seek');
    if (!audio || !seek || seek.dataset.singleCommitSeek === 'true') return;
    seek.dataset.singleCommitSeek = 'true';

    const readTarget = () => {
      const duration = Number(audio.duration);
      const percent = Math.max(0, Math.min(100, Number(seek.value) || 0));
      if (!Number.isFinite(duration) || duration <= 0) return null;
      return { percent, time: duration * percent / 100 };
    };

    const preview = event => {
      event.stopImmediatePropagation();
      const target = readTarget();
      if (!target) return;
      seekPreviewTime = target.time;
      renderSeekPreview(target.time, target.percent);
    };

    const commit = event => {
      event.stopImmediatePropagation();
      const target = readTarget();
      const time = Number.isFinite(seekPreviewTime) ? seekPreviewTime : target?.time;
      if (!Number.isFinite(time)) return;

      const now = performance.now();
      if (Math.abs(time - lastCommittedSeekTime) < 0.025 && now - lastCommittedSeekAt < 350) return;
      lastCommittedSeekTime = time;
      lastCommittedSeekAt = now;
      seekPreviewTime = null;
      window.dispatchEvent(new CustomEvent('shinobi:seek-commit', { detail: { time } }));
      try { audio.currentTime = time; } catch {}
    };

    seek.addEventListener('input', preview, { capture: true });
    seek.addEventListener('pointerup', commit, { capture: true });
    seek.addEventListener('change', commit, { capture: true });
  }

  function setStudioMode(active, { restoreScroll = true } = {}) {
    const wasActive = view.classList.contains('lyrics-studio-mode');
    if (active === wasActive) {
      if (active) {
        syncCanvasTrack();
        setMobilePanelCollapsed(mobilePanelCollapsed, { recenter: false });
      }
      return;
    }

    if (active) {
      savedScrollY = window.scrollY;
      view.classList.add('lyrics-studio-mode');
      document.body.classList.add('lyrics-studio-open');
      mobilePanelCollapsed = Boolean(mobileStudioQuery?.matches);
      setModeButtonState(true);
      syncCanvasTrack();
      setMobilePanelCollapsed(mobilePanelCollapsed, { recenter: false });
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
    trackPanel.classList.remove('lyrics-track-panel-collapsed');
    view.classList.remove('lyrics-studio-track-collapsed');
    panelToggle.hidden = true;
    view.classList.remove('lyrics-studio-mode');
    document.body.classList.remove('lyrics-studio-open');
    setModeButtonState(false);
    updatePanelToggleLabel();
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

  document.addEventListener('click', event => {
    const trackLyricsEntry = event.target.closest?.('[data-track-detail-route="lyrics"]');
    if (!trackLyricsEntry || !mobileStudioQuery?.matches) return;

    const route = parseRoute();
    const trackId = route.type === 'track' ? route.id : currentTrack(audio)?.id;
    if (!trackId) return;

    event.preventDefault();
    event.stopImmediatePropagation();
    dispatchRouteHash(routeToHash({ type: 'studio', id: trackId }));
  }, true);

  modeButton.addEventListener('click', () => {
    navigateStudioMode(!view.classList.contains('lyrics-studio-mode'));
  });

  canvasButton.addEventListener('click', () => {
    canvasEnabled = !canvasEnabled;
    if (canvasEnabled) canvasLocalRecoveryCount = 0;
    setCanvasButtonState();
    if (canvasEnabled) playCanvas('canvas-toggle');
    else pauseCanvas();
  });

  panelToggle.addEventListener('click', () => {
    setMobilePanelCollapsed(!trackPanel.classList.contains('lyrics-track-panel-collapsed'));
  });

  canvasVideo.addEventListener('loadeddata', () => {
    if (canvasVideo.getAttribute('data-transport') === 'blob') {
      canvasVideo.removeAttribute('poster');
      canvasShell.dataset.playback = 'ready';
      setCanvasBadge('SPOTIFY CANVAS');
    }
  });
  canvasVideo.addEventListener('canplay', () => {
    if (canvasVideo.getAttribute('data-transport') === 'blob') {
      canvasShell.dataset.playback = 'ready';
    }
  });
  canvasVideo.addEventListener('playing', () => {
    clearCanvasLocalRecovery();
    canvasVideo.removeAttribute('poster');
    canvasShell.dataset.playback = 'playing';
    setCanvasBadge('SPOTIFY CANVAS');
  });
  canvasVideo.addEventListener('ended', () => {
    if (!canvasEnabled || canvasPausedForAudioSeek || canvasShell.hidden) return;
    if (canvasVideo.getAttribute('data-transport') !== 'blob') return;
    try { canvasVideo.currentTime = 0; } catch {}
    playCanvas('local-loop');
  });
  canvasVideo.addEventListener('waiting', () => {
    canvasShell.dataset.playback = 'buffering';
    setCanvasBadge('CANVAS BUFFERING');
    scheduleLocalCanvasRecovery('waiting');
  });
  canvasVideo.addEventListener('stalled', () => {
    canvasShell.dataset.playback = 'stalled';
    setCanvasBadge('CANVAS STALLED');
    scheduleLocalCanvasRecovery('stalled');
  });
  canvasVideo.addEventListener('error', () => {
    canvasShell.dataset.playback = 'error';
    setCanvasBadge('CANVAS RECOVERY');
    scheduleLocalCanvasRecovery('error');
  });

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && view.classList.contains('lyrics-studio-mode')) {
      navigateStudioMode(false);
    }
  });

  view.addEventListener('pointerdown', () => {
    if (canvasEnabled && !canvasShell.hidden && canvasVideo.paused && !canvasPausedForAudioSeek) playCanvas('studio-gesture');
  }, { passive: true });

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

    audio.addEventListener('seeking', () => {
      if (canvasShell.hidden || canvasVideo.paused) return;
      canvasPausedForAudioSeek = true;
      clearCanvasLocalRecovery();
      canvasVideo.pause();
      canvasShell.dataset.playback = 'audio-seek';
      setCanvasBadge('AUDIO SEEK');
    });

    audio.addEventListener('seeked', () => {
      if (!canvasPausedForAudioSeek) return;
      canvasShell.dataset.playback = 'audio-buffer';
      setCanvasBadge(audio.paused ? 'CANVAS PAUSED' : 'AUDIO BUFFER');
    });

    audio.addEventListener('playing', () => {
      if (!canvasPausedForAudioSeek) return;
      canvasPausedForAudioSeek = false;
      if (canvasEnabled && view.classList.contains('lyrics-studio-mode') && !canvasShell.hidden) {
        playCanvas('audio-playing');
      }
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

  mobileStudioQuery?.addEventListener?.('change', () => {
    if (!view.classList.contains('lyrics-studio-mode')) return;
    setMobilePanelCollapsed(mobileStudioQuery.matches ? mobilePanelCollapsed : false);
  });

  window.addEventListener(ROUTE_CHANGE_EVENT, () => {
    window.setTimeout(syncStudioRoute, 0);
  });

  window.addEventListener('hashchange', () => {
    window.setTimeout(syncStudioRoute, 0);
  });

  window.addEventListener('pageshow', () => {
    if (canvasEnabled && view.classList.contains('lyrics-studio-mode') && !canvasPausedForAudioSeek) playCanvas('pageshow');
  });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      clearCanvasLocalRecovery();
      canvasVideo.pause();
      return;
    }
    if (canvasEnabled && view.classList.contains('lyrics-studio-mode') && !canvasPausedForAudioSeek) playCanvas('visibilitychange');
  });

  window.addEventListener('pagehide', () => {
    pauseCanvas();
    resetCanvasTransport();
    canvasButton.hidden = true;
    updateControlsLayout();
    trackPanel.classList.remove('lyrics-track-panel-collapsed');
    view.classList.remove('lyrics-studio-track-collapsed');
    panelToggle.hidden = true;
    view.classList.remove('lyrics-studio-mode');
    document.body.classList.remove('lyrics-studio-open');
  });

  installSingleCommitSeek();
  setPressed(autoScrollButton, autoScrollButton?.getAttribute('aria-pressed') !== 'false');
  setCanvasButtonState();
  setModeButtonState(false);
  syncCanvasTrack();
  window.setTimeout(syncStudioRoute, 0);
}
