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
  audio.preload = 'none';

  let playbackRequested = false;
  let activeTrackId = '';
  const nativeLoad = audio.load.bind(audio);
  const nativePlay = audio.play.bind(audio);

  // app-main selects a source and then calls load() before play(). On Android that
  // explicit load can consume the first user gesture. Setting src is sufficient:
  // native play() will load and start playback in the same tap.
  audio.load = () => {
    if (audio.dataset.forceLoad !== 'true') return;
    nativeLoad();
  };

  audio.play = (...args) => {
    playbackRequested = true;
    return nativePlay(...args);
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
  });

  audio.addEventListener('pause', () => {
    if (!audio.error) playbackRequested = false;
  });

  audio.addEventListener('ended', () => {
    playbackRequested = false;
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
    audio.dataset.forceLoad = 'true';
    nativeLoad();
    delete audio.dataset.forceLoad;

    if (resumeAfterFallback) {
      nativePlay().catch(error => {
        console.warn(`Bundled audio fallback could not start for ${track.title}.`, error);
      });
    }
  });
}
