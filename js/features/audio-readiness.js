const PLAY_READY_EVENTS = ['loadedmetadata', 'canplay', 'canplaythrough'];
const PLAY_RETRY_DELAY_MS = 900;
const PLAY_START_WATCHDOG_MS = 1800;

function abortError() {
  try {
    return new DOMException('Playback intent was cancelled.', 'AbortError');
  } catch {
    const error = new Error('Playback intent was cancelled.');
    error.name = 'AbortError';
    return error;
  }
}

export function initAudioReadiness({ audio }) {
  if (!(audio instanceof HTMLMediaElement) || audio.dataset.audioReadinessReady === 'true') return;

  audio.dataset.audioReadinessReady = 'true';
  audio.preload = 'auto';
  audio.setAttribute('preload', 'auto');
  audio.dataset.playbackRequestState = 'idle';

  let playbackRequested = false;
  let playIntent = 0;
  let pendingPlay = null;
  const nativeLoad = audio.load.bind(audio);
  const nativePlay = audio.play.bind(audio);
  const nativePause = audio.pause.bind(audio);

  function setRequestState(state) {
    if (audio.dataset.playbackRequestState === state) return;
    audio.dataset.playbackRequestState = state;
    audio.dispatchEvent(new CustomEvent('shinobi:audio-request-state', {
      detail: { state }
    }));
  }

  audio.load = (...args) => {
    const forced = audio.dataset.forceLoad === 'true';
    const activeGesture = navigator.userActivation?.isActive === true;
    if (!forced && activeGesture) return;
    return nativeLoad(...args);
  };

  function currentSource() {
    return audio.getAttribute('src') || audio.currentSrc || '';
  }

  function restorePositionWhenReady(time) {
    if (!(time > 0)) return;
    audio.addEventListener('loadedmetadata', () => {
      if (Number.isFinite(audio.duration) && time < audio.duration) audio.currentTime = time;
    }, { once: true });
  }

  function refreshCurrentSource({ forceLoad = false } = {}) {
    const source = currentSource();
    if (!source) return false;

    const time = Number.isFinite(audio.currentTime) ? audio.currentTime : 0;
    restorePositionWhenReady(time);
    audio.preload = 'auto';
    audio.setAttribute('preload', 'auto');
    audio.setAttribute('src', source);

    if (forceLoad) nativeLoad();
    return true;
  }

  function prepareSourceInsideGesture() {
    const sourceIsEmpty = audio.readyState === HTMLMediaElement.HAVE_NOTHING;
    const networkIsEmpty = audio.networkState === HTMLMediaElement.NETWORK_EMPTY;
    const sourceIsInvalid = audio.networkState === HTMLMediaElement.NETWORK_NO_SOURCE || Boolean(audio.error);

    if (currentSource() && sourceIsEmpty && (networkIsEmpty || sourceIsInvalid)) {
      refreshCurrentSource();
    }
  }

  function waitForReady(intent, args, firstError) {
    return new Promise((resolve, reject) => {
      let settled = false;
      let timer = 0;

      const cleanup = () => {
        window.clearTimeout(timer);
        PLAY_READY_EVENTS.forEach(eventName => audio.removeEventListener(eventName, retry));
      };

      const finish = (callback, value) => {
        if (settled) return;
        settled = true;
        cleanup();
        callback(value);
      };

      const retry = () => {
        if (intent !== playIntent || !playbackRequested) {
          finish(reject, abortError());
          return;
        }

        let result;
        try {
          result = nativePlay(...args);
        } catch (error) {
          finish(reject, error);
          return;
        }

        Promise.resolve(result).then(
          value => finish(resolve, value),
          error => finish(reject, error)
        );
      };

      PLAY_READY_EVENTS.forEach(eventName => audio.addEventListener(eventName, retry, { once: true }));
      timer = window.setTimeout(retry, PLAY_RETRY_DELAY_MS);

      if (audio.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA) retry();
      else if (firstError?.name === 'NotAllowedError') finish(reject, firstError);
    });
  }

  function recoverPendingStart(intent, args, firstAttempt) {
    return new Promise((resolve, reject) => {
      let settled = false;
      const finish = (callback, value) => {
        if (settled) return;
        settled = true;
        window.clearTimeout(timer);
        callback(value);
      };

      const timer = window.setTimeout(() => {
        if (intent !== playIntent || !playbackRequested) {
          finish(reject, abortError());
          return;
        }

        const playbackHasData =
          audio.currentTime > 0
          || audio.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA;

        if (!playbackHasData) refreshCurrentSource({ forceLoad: true });

        let retryAttempt;
        try {
          retryAttempt = nativePlay(...args);
        } catch (error) {
          finish(reject, error);
          return;
        }

        Promise.resolve(retryAttempt).then(
          value => finish(resolve, value),
          error => finish(reject, error)
        );
      }, PLAY_START_WATCHDOG_MS);

      Promise.resolve(firstAttempt).then(
        value => finish(resolve, value),
        error => finish(reject, error)
      );
    });
  }

  function startPlayback(args = [], { forceReload = false } = {}) {
    if (pendingPlay && playbackRequested && !forceReload) return pendingPlay;

    playbackRequested = true;
    const intent = ++playIntent;
    setRequestState('starting');

    if (pendingPlay) {
      pendingPlay.catch(() => {});
      pendingPlay = null;
    }

    if (forceReload) refreshCurrentSource({ forceLoad: true });
    else prepareSourceInsideGesture();

    let firstAttempt;
    try {
      firstAttempt = nativePlay(...args);
    } catch (error) {
      firstAttempt = Promise.reject(error);
    }

    pendingPlay = recoverPendingStart(intent, args, firstAttempt)
      .catch(error => {
        if (error?.name === 'NotAllowedError') throw error;
        return waitForReady(intent, args, error);
      })
      .catch(error => {
        if (intent === playIntent) setRequestState('idle');
        throw error;
      })
      .finally(() => {
        if (intent === playIntent) pendingPlay = null;
      });

    return pendingPlay;
  }

  audio.play = (...args) => startPlayback(args);
  audio.shinobiRetryPlayback = () => startPlayback([], { forceReload: true });

  audio.pause = (...args) => {
    playbackRequested = false;
    playIntent += 1;
    pendingPlay = null;
    setRequestState('idle');
    return nativePause(...args);
  };

  audio.addEventListener('play', () => {
    playbackRequested = true;
    if (audio.dataset.playbackRequestState !== 'playing') setRequestState('starting');
  });

  audio.addEventListener('playing', () => {
    playbackRequested = true;
    setRequestState('playing');
  });

  audio.addEventListener('waiting', () => {
    if (playbackRequested) setRequestState('starting');
  });

  audio.addEventListener('pause', () => {
    if (!pendingPlay && !audio.error) {
      playbackRequested = false;
      setRequestState('idle');
    }
  });

  audio.addEventListener('ended', () => {
    playbackRequested = false;
    playIntent += 1;
    pendingPlay = null;
    setRequestState('idle');
  });

  document.addEventListener('click', event => {
    const toggle = event.target.closest?.('[data-action="toggle"]');
    if (!toggle || audio.dataset.playbackRequestState !== 'starting') return;
    event.preventDefault();
    event.stopImmediatePropagation();
    audio.shinobiRetryPlayback().catch(() => {});
  }, true);
}
