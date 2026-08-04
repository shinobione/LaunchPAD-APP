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
  audio.preload = 'none';

  let playbackRequested = false;
  let playIntent = 0;
  let pendingPlay = null;
  const nativeLoad = audio.load.bind(audio);
  const nativePlay = audio.play.bind(audio);
  const nativePause = audio.pause.bind(audio);

  // app-main selects a source and then calls load() before play(). On Android that
  // explicit load can consume the first user gesture. Setting src is sufficient:
  // native play() loads and starts playback in the same tap.
  audio.load = () => {
    if (audio.dataset.forceLoad !== 'true') return;
    nativeLoad();
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
    audio.setAttribute('src', source);

    if (forceLoad) nativeLoad();
    return true;
  }

  function prepareSourceInsideGesture() {
    const sourceIsEmpty = audio.readyState === HTMLMediaElement.HAVE_NOTHING;
    const networkIsEmpty = audio.networkState === HTMLMediaElement.NETWORK_EMPTY;
    const sourceIsInvalid = audio.networkState === HTMLMediaElement.NETWORK_NO_SOURCE || Boolean(audio.error);

    // A direct #studio route can select the track before the first user gesture.
    // Some Android media stacks then leave the element in NETWORK_EMPTY. Re-applying
    // the same source inside the Play tap primes it without calling load() first.
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

        // A play() promise may stay pending forever while Android reports a stalled
        // NETWORK_EMPTY media element. Force one real source reload, then retry the
        // same playback intent without requiring the user to leave Studio.
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

  audio.play = (...args) => {
    playbackRequested = true;
    const intent = ++playIntent;

    if (pendingPlay) {
      pendingPlay.catch(() => {});
      pendingPlay = null;
    }

    prepareSourceInsideGesture();

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
      .finally(() => {
        if (intent === playIntent) pendingPlay = null;
      });

    return pendingPlay;
  };

  audio.pause = (...args) => {
    playbackRequested = false;
    playIntent += 1;
    pendingPlay = null;
    return nativePause(...args);
  };

  audio.addEventListener('play', () => {
    playbackRequested = true;
  });

  audio.addEventListener('pause', () => {
    if (!pendingPlay && !audio.error) playbackRequested = false;
  });

  audio.addEventListener('ended', () => {
    playbackRequested = false;
    playIntent += 1;
    pendingPlay = null;
  });
}
