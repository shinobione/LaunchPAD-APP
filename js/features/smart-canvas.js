const CANVAS_SELECTOR = 'video.track-video-player';
const ROUTE_CHANGE_EVENT = 'shinobi:route-change';
const VIEWPORT_THRESHOLD = 0.18;

function fallbackMediaQuery() {
  return {
    matches: false,
    addEventListener() {},
    removeEventListener() {}
  };
}

function queryMedia(query) {
  try {
    return window.matchMedia?.(query) || fallbackMediaQuery();
  } catch {
    return fallbackMediaQuery();
  }
}

function currentTrackRouteId() {
  if (!window.location.hash.startsWith('#track=')) return '';
  try {
    return decodeURIComponent(window.location.hash.slice('#track='.length));
  } catch {
    return window.location.hash.slice('#track='.length);
  }
}

function contextFor(video) {
  if (video.classList.contains('track-video-player')) {
    const wrapper = video.closest('[data-track-video-panel]');
    return {
      type: 'track',
      wrapper,
      view: video.closest('#view-track'),
      trackId: wrapper?.dataset.trackVideoPanel || ''
    };
  }

  const wrapper = video.closest('.lyrics-studio-canvas');
  return {
    type: 'studio',
    wrapper,
    view: video.closest('#view-lyrics'),
    trackId: wrapper?.dataset.trackId || ''
  };
}

function contextIsActive(entry) {
  const { type, wrapper, view, trackId } = contextFor(entry.video);
  if (!wrapper?.isConnected || !view?.isConnected) return false;
  if (wrapper.hidden || !view.classList.contains('active')) return false;

  if (type === 'studio') {
    return view.classList.contains('lyrics-studio-mode') && Boolean(trackId);
  }

  return Boolean(trackId) && currentTrackRouteId() === trackId;
}

function dispatchCanvasState(video, playing, reason) {
  video.dispatchEvent(new CustomEvent('shinobi:canvas-state', {
    bubbles: true,
    detail: { playing, reason }
  }));
}

function sourceAvailable(video) {
  return Boolean(video.currentSrc || video.getAttribute('src') || video.dataset.src);
}

function hydrateVideo(video) {
  if (!video.getAttribute('src') && video.dataset.src) {
    video.src = video.dataset.src;
    video.load();
  }
  video.muted = true;
  video.defaultMuted = true;
  video.loop = true;
  video.playsInline = true;
  video.setAttribute('muted', '');
  video.setAttribute('loop', '');
  video.setAttribute('playsinline', '');
}

export function initSmartCanvasManager({ root = document } = {}) {
  if (window.__shinobiSmartCanvasManager) return window.__shinobiSmartCanvasManager;

  const entries = new Map();
  const reducedMotion = queryMedia('(prefers-reduced-motion: reduce)');
  const reducedData = queryMedia('(prefers-reduced-data: reduce)');
  const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  let activeEntry = null;
  let disposed = false;

  const policyBlocksPlayback = () => Boolean(
    reducedMotion.matches
    || reducedData.matches
    || connection?.saveData
  );

  function releaseSource(entry) {
    const { video } = entry;
    if (!video.getAttribute('src') && !video.currentSrc) return;
    video.removeAttribute('src');
    try {
      video.load();
    } catch {
      // Detached test doubles and old WebViews can reject load() during teardown.
    }
  }

  function pauseEntry(entry, {
    retainIntent = true,
    release = false,
    reason = 'smart-pause'
  } = {}) {
    if (!entry || entry.destroyed) return;
    entry.playToken += 1;
    if (!retainIntent) entry.wanted = false;

    if (!entry.video.paused) {
      entry.internalPause = true;
      try {
        entry.video.pause();
      } finally {
        queueMicrotask(() => {
          entry.internalPause = false;
        });
      }
    }

    if (activeEntry === entry) activeEntry = null;
    if (release) releaseSource(entry);
    dispatchCanvasState(entry.video, false, reason);
  }

  function eligibility(entry) {
    if (!entry.video.isConnected) {
      return { allowed: false, reason: 'detached', release: true, retainIntent: false };
    }
    if (!contextIsActive(entry)) {
      return { allowed: false, reason: 'context-hidden', release: true, retainIntent: false };
    }
    if (document.visibilityState === 'hidden') {
      return { allowed: false, reason: 'page-hidden', release: false, retainIntent: true };
    }
    if (policyBlocksPlayback()) {
      return { allowed: false, reason: 'reduced-motion-or-data', release: false, retainIntent: true };
    }
    if (!entry.inViewport) {
      return { allowed: false, reason: 'offscreen', release: false, retainIntent: true };
    }
    if (!sourceAvailable(entry.video)) {
      return { allowed: false, reason: 'no-source', release: false, retainIntent: false };
    }
    return { allowed: true, reason: 'visible', release: false, retainIntent: true };
  }

  function claimActive(entry) {
    if (activeEntry && activeEntry !== entry) {
      pauseEntry(activeEntry, {
        retainIntent: false,
        release: true,
        reason: 'another-canvas-started'
      });
    }
    activeEntry = entry;
  }

  function playEntry(entry, reason = 'smart-resume') {
    if (!entry || entry.destroyed || !entry.wanted) return;
    const state = eligibility(entry);
    if (!state.allowed) {
      pauseEntry(entry, state);
      return;
    }

    claimActive(entry);
    hydrateVideo(entry.video);
    const token = ++entry.playToken;
    let result;
    try {
      result = entry.video.play();
    } catch (error) {
      if (activeEntry === entry) activeEntry = null;
      console.info('Smart Canvas playback awaits another user gesture.', error);
      return;
    }

    Promise.resolve(result).then(() => {
      if (entry.destroyed || token !== entry.playToken) return;
      const current = eligibility(entry);
      if (!current.allowed || !entry.wanted) {
        pauseEntry(entry, current);
        return;
      }
      claimActive(entry);
      dispatchCanvasState(entry.video, true, reason);
    }).catch(error => {
      if (activeEntry === entry) activeEntry = null;
      console.info('Smart Canvas playback awaits another user gesture.', error);
    });
  }

  function evaluateEntry(entry, reason = 'refresh') {
    if (!entry || entry.destroyed) return;
    const state = eligibility(entry);
    if (!state.allowed) {
      pauseEntry(entry, state);
      return;
    }
    if (entry.wanted && entry.video.paused) playEntry(entry, reason);
  }

  const intersectionObserver = typeof IntersectionObserver === 'function'
    ? new IntersectionObserver(records => {
      records.forEach(record => {
        const entry = entries.get(record.target);
        if (!entry) return;
        entry.inViewport = Boolean(
          record.isIntersecting
          && record.intersectionRatio >= VIEWPORT_THRESHOLD
        );
        evaluateEntry(entry, entry.inViewport ? 'viewport-returned' : 'offscreen');
      });
    }, {
      threshold: [0, VIEWPORT_THRESHOLD, 0.5, 1]
    })
    : null;

  function observeContext(entry) {
    const { wrapper, view } = contextFor(entry.video);
    const targets = [wrapper, view].filter(Boolean);
    if (!targets.length) return;

    entry.contextObserver = new MutationObserver(() => {
      evaluateEntry(entry, 'context-change');
    });
    targets.forEach(target => entry.contextObserver.observe(target, {
      attributes: true,
      attributeFilter: ['class', 'hidden', 'data-track-id', 'data-track-video-panel']
    }));
  }

  function register(video) {
    if (!(video instanceof HTMLVideoElement) || entries.has(video)) return entries.get(video);

    const entry = {
      video,
      wanted: !video.paused,
      inViewport: !intersectionObserver,
      internalPause: false,
      playToken: 0,
      destroyed: false,
      contextObserver: null,
      onPlay: null,
      onPause: null
    };

    entry.onPlay = () => {
      entry.wanted = true;
      const state = eligibility(entry);
      if (!state.allowed) {
        pauseEntry(entry, state);
        return;
      }
      claimActive(entry);
      dispatchCanvasState(video, true, 'native-play');
    };

    entry.onPause = () => {
      if (!entry.internalPause) entry.wanted = false;
      if (activeEntry === entry) activeEntry = null;
      dispatchCanvasState(
        video,
        false,
        entry.internalPause ? 'smart-pause' : 'manual-pause'
      );
    };

    entries.set(video, entry);
    video.addEventListener('play', entry.onPlay);
    video.addEventListener('pause', entry.onPause);
    observeContext(entry);
    intersectionObserver?.observe(video);
    evaluateEntry(entry, 'registered');
    return entry;
  }

  function destroyEntry(entry, { release = true } = {}) {
    if (!entry || entry.destroyed) return;
    pauseEntry(entry, {
      retainIntent: false,
      release,
      reason: 'destroyed'
    });
    entry.destroyed = true;
    intersectionObserver?.unobserve(entry.video);
    entry.contextObserver?.disconnect();
    entry.video.removeEventListener('play', entry.onPlay);
    entry.video.removeEventListener('pause', entry.onPause);
    entries.delete(entry.video);
  }

  function scan(scope = root) {
    if (scope instanceof HTMLVideoElement && scope.matches(CANVAS_SELECTOR)) register(scope);
    scope.querySelectorAll?.(CANVAS_SELECTOR).forEach(register);
  }

  function pruneDetached() {
    [...entries.values()].forEach(entry => {
      if (!entry.video.isConnected) destroyEntry(entry, { release: true });
    });
  }

  function refresh(reason = 'refresh') {
    scan(root);
    pruneDetached();
    entries.forEach(entry => evaluateEntry(entry, reason));
  }

  const domObserver = new MutationObserver(records => {
    records.forEach(record => record.addedNodes.forEach(node => {
      if (node instanceof Element) scan(node);
    }));
    queueMicrotask(pruneDetached);
  });
  domObserver.observe(root.documentElement || root, { childList: true, subtree: true });

  const onVisibilityChange = () => refresh(
    document.visibilityState === 'hidden' ? 'page-hidden' : 'page-visible'
  );
  const onPageHide = () => {
    entries.forEach(entry => pauseEntry(entry, {
      retainIntent: true,
      release: true,
      reason: 'pagehide'
    }));
  };
  const onPageShow = () => refresh('pageshow');
  const onPolicyChange = () => refresh('media-policy-change');
  const onRouteChange = () => refresh('route-change');

  document.addEventListener('visibilitychange', onVisibilityChange);
  window.addEventListener('pagehide', onPageHide);
  window.addEventListener('pageshow', onPageShow);
  window.addEventListener('hashchange', onRouteChange);
  window.addEventListener('popstate', onRouteChange);
  window.addEventListener(ROUTE_CHANGE_EVENT, onRouteChange);
  reducedMotion.addEventListener?.('change', onPolicyChange);
  reducedData.addEventListener?.('change', onPolicyChange);
  connection?.addEventListener?.('change', onPolicyChange);

  const manager = {
    refresh,
    pauseAll({ release = false } = {}) {
      entries.forEach(entry => pauseEntry(entry, {
        retainIntent: true,
        release,
        reason: 'pause-all'
      }));
    },
    releaseAll() {
      entries.forEach(entry => pauseEntry(entry, {
        retainIntent: false,
        release: true,
        reason: 'release-all'
      }));
    },
    get activeVideo() {
      return activeEntry?.video || null;
    },
    get registeredCount() {
      return entries.size;
    },
    destroy() {
      if (disposed) return;
      disposed = true;
      domObserver.disconnect();
      intersectionObserver?.disconnect();
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('pagehide', onPageHide);
      window.removeEventListener('pageshow', onPageShow);
      window.removeEventListener('hashchange', onRouteChange);
      window.removeEventListener('popstate', onRouteChange);
      window.removeEventListener(ROUTE_CHANGE_EVENT, onRouteChange);
      reducedMotion.removeEventListener?.('change', onPolicyChange);
      reducedData.removeEventListener?.('change', onPolicyChange);
      connection?.removeEventListener?.('change', onPolicyChange);
      [...entries.values()].forEach(entry => destroyEntry(entry, { release: true }));
      if (window.__shinobiSmartCanvasManager === manager) {
        delete window.__shinobiSmartCanvasManager;
      }
    }
  };

  window.__shinobiSmartCanvasManager = manager;
  scan(root);
  return manager;
}
