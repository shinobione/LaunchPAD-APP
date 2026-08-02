import { getTrack } from '../core/catalog-store.js';

function sameResource(left, right) {
  if (!left || !right) return false;

  try {
    return new URL(left, document.baseURI).href === new URL(right, document.baseURI).href;
  } catch {
    return left === right;
  }
}

export function initAudioFallback({ audio }) {
  if (!(audio instanceof HTMLMediaElement) || audio.dataset.audioFallbackReady === 'true') return;

  audio.dataset.audioFallbackReady = 'true';
  let playbackRequested = false;
  let activeTrackId = '';
  let pendingPlay = false;
  let retryTimer = 0;
  const nativePlay = audio.play.bind(audio);

  audio.play = (...args) => {
    playbackRequested = true;
    pendingPlay = true;
    window.clearTimeout(retryTimer);

    return nativePlay(...args).then(result => {
      pendingPlay = false;
      return result;
    }).catch(error => {
      if (error?.name !== 'AbortError' || !playbackRequested) {
        pendingPlay = false;
        throw error;
      }

      return new Promise((resolve, reject) => {
        let settled = false;
        const cleanup = () => {
          audio.removeEventListener('canplay', retry);
          window.clearTimeout(retryTimer);
        };
        const finish = (callback, value) => {
          if (settled) return;
          settled = true;
          pendingPlay = false;
          cleanup();
          callback(value);
        };
        const retry = () => {
          if (settled || !playbackRequested) {
            finish(reject, error);
            return;
          }
          nativePlay().then(
            value => finish(resolve, value),
            retryError => finish(reject, retryError)
          );
        };

        audio.addEventListener('canplay', retry, { once: true });
        retryTimer = window.setTimeout(retry, 1600);
      });
    });
  };

  audio.addEventListener('loadstart', () => {
    const trackId = audio.dataset.trackId || '';
    if (trackId && trackId !== activeTrackId) {
      activeTrackId = trackId;
      delete audio.dataset.fallbackTrackId;
    }
  });

  audio.addEventListener('play', () => {
    playbackRequested = true;
    pendingPlay = false;
  });

  audio.addEventListener('pause', () => {
    if (!audio.error && !pendingPlay) playbackRequested = false;
  });

  audio.addEventListener('ended', () => {
    playbackRequested = false;
    pendingPlay = false;
  });

  audio.addEventListener('error', () => {
    const trackId = audio.dataset.trackId;
    const track = trackId ? getTrack(trackId) : null;

    if (!track?.fallbackFile) return;
    if (audio.dataset.fallbackTrackId === track.id) return;
    if (sameResource(audio.currentSrc || audio.src, track.fallbackFile)) return;

    const resumeAfterFallback = playbackRequested;
    audio.dataset.fallbackTrackId = track.id;

    console.warn(`Remote audio unavailable for ${track.title}; using bundled audio fallback.`);
    audio.src = track.fallbackFile;
    audio.load();

    if (resumeAfterFallback) {
      audio.play().catch(error => {
        console.warn(`Bundled audio fallback could not start for ${track.title}.`, error);
      });
    }
  });
}
