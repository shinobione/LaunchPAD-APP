// LaunchPAD Build 98 — responsiveness / state reconciliation.
// Presentation/state repair only: no audio source, queue, seek or catalog ownership changes.

const TRACK_SIGNAL_SELECTOR = '.track-detail-signal-groups';
const TRACK_COPY_SELECTOR = '#view-track .track-detail-copy';
const TRACK_TAGS_SELECTOR = '.track-detail-tags';
const PLAYBACK_PROGRESS_EPSILON = 0.025;
const MOBILE_LYRICS_FETCH_LIMIT = 2;

function dispatchPlaybackState(audio, state) {
  if (!audio || audio.dataset.playbackRequestState === state) return;
  audio.dataset.playbackRequestState = state;
  audio.dispatchEvent(new CustomEvent('shinobi:audio-request-state', {
    detail: { state, source: 'build98-progress-reconcile' }
  }));
}

function installPlaybackStateReconcile(audio) {
  if (!(audio instanceof HTMLMediaElement) || audio.dataset.build98PlaybackReconcile === 'true') return;
  audio.dataset.build98PlaybackReconcile = 'true';

  let lastTime = Number(audio.currentTime) || 0;

  const reconcile = () => {
    const current = Number(audio.currentTime) || 0;
    const advanced = current > lastTime + PLAYBACK_PROGRESS_EPSILON;
    lastTime = current;

    // If media time is genuinely advancing, the UI must never remain in a
    // synthetic "starting" state. This repairs transient waiting/stalled races
    // without touching native playback or retry ownership.
    if (
      advanced
      && !audio.paused
      && !audio.ended
      && audio.dataset.playbackRequestState === 'starting'
    ) {
      dispatchPlaybackState(audio, 'playing');
    }
  };

  audio.addEventListener('timeupdate', reconcile);
  audio.addEventListener('playing', () => {
    lastTime = Number(audio.currentTime) || 0;
    dispatchPlaybackState(audio, 'playing');
  });
  audio.addEventListener('seeked', () => {
    lastTime = Number(audio.currentTime) || 0;
  });
}

function requestUrl(input) {
  try {
    if (input instanceof Request) return new URL(input.url, location.href);
    return new URL(String(input), location.href);
  } catch {
    return null;
  }
}

function isLyricsAssetRequest(input) {
  const url = requestUrl(input);
  if (!url) return false;
  const path = url.pathname.toLowerCase();
  return path.includes('/lyrics') || path.endsWith('.lrc') || path.endsWith('.txt');
}

function installMobileLyricsFetchLimiter() {
  if (window.__shinobiBuild98LyricsFetchLimiterReady) return;
  if (!globalThis.matchMedia?.('(max-width: 760px)').matches) return;
  window.__shinobiBuild98LyricsFetchLimiterReady = true;

  const nativeFetch = globalThis.fetch.bind(globalThis);
  const queue = [];
  let active = 0;

  const drain = () => {
    while (active < MOBILE_LYRICS_FETCH_LIMIT && queue.length) {
      const task = queue.shift();
      active += 1;
      nativeFetch(task.input, task.init)
        .then(task.resolve, task.reject)
        .finally(() => {
          active -= 1;
          drain();
        });
    }
  };

  globalThis.fetch = (input, init) => {
    if (!isLyricsAssetRequest(input)) return nativeFetch(input, init);

    return new Promise((resolve, reject) => {
      const task = { input, init, resolve, reject };
      // If the user is actively looking at Lyrics, prioritize the new request
      // ahead of background search-index hydration already queued at startup.
      if (document.querySelector('#view-lyrics.active')) queue.unshift(task);
      else queue.push(task);
      drain();
    });
  };
}

function integrateTrackSignals(root = document) {
  const copy = root.querySelector?.(TRACK_COPY_SELECTOR) || document.querySelector(TRACK_COPY_SELECTOR);
  const signals = root.querySelector?.(`#view-track ${TRACK_SIGNAL_SELECTOR}`)
    || document.querySelector(`#view-track ${TRACK_SIGNAL_SELECTOR}`);
  if (!copy || !signals) return false;

  signals.classList.add('track-detail-hero-signals');
  const tags = copy.querySelector(TRACK_TAGS_SELECTOR);
  if (tags && signals.previousElementSibling !== tags) {
    tags.insertAdjacentElement('afterend', signals);
    return true;
  }
  if (!tags && signals.parentElement !== copy) {
    copy.appendChild(signals);
    return true;
  }
  return false;
}

function installTrackSignalFirstPaint() {
  if (window.__shinobiBuild98TrackSignalsReady) return;
  window.__shinobiBuild98TrackSignalsReady = true;

  let scheduled = false;
  const schedule = () => {
    if (scheduled) return;
    scheduled = true;
    queueMicrotask(() => {
      scheduled = false;
      integrateTrackSignals();
    });
  };

  new MutationObserver(records => {
    const relevant = records.some(record => [...record.addedNodes].some(node =>
      node instanceof Element && (
        node.matches?.('#view-track, .track-detail-copy, .track-detail-signal-groups')
        || node.querySelector?.('#view-track, .track-detail-copy, .track-detail-signal-groups')
      )
    ));
    if (relevant) schedule();
  }).observe(document.body, { childList: true, subtree: true });

  ['hashchange', 'popstate', 'shinobi:route-change', 'shinobi:ready']
    .forEach(type => window.addEventListener(type, schedule));

  schedule();
}

export function initResponsivenessV98({ audio = document.querySelector('#audio') } = {}) {
  installMobileLyricsFetchLimiter();
  installPlaybackStateReconcile(audio);
  installTrackSignalFirstPaint();
}
