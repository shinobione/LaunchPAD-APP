const MEDIA_ARTWORK = [
  {
    src: new URL('assets/app-icon-neon-192.png', document.baseURI).href,
    sizes: '192x192',
    type: 'image/png'
  },
  {
    src: new URL('assets/app-icon-neon-512.png', document.baseURI).href,
    sizes: '512x512',
    type: 'image/png'
  }
];

export function createMediaSessionController({
  audio,
  getTrack,
  onPlay,
  onPause,
  onNext,
  onPrevious,
  onSeekTo
}) {
  if (!('mediaSession' in navigator)) {
    return { update() {}, updatePlaybackState() {}, updatePosition() {} };
  }

  const session = navigator.mediaSession;
  let lastPositionSecond = -1;

  function safeSetAction(action, handler) {
    try {
      session.setActionHandler(action, handler);
    } catch {
      // Some browsers expose Media Session but not every action.
    }
  }

  safeSetAction('play', onPlay);
  safeSetAction('pause', onPause);
  safeSetAction('previoustrack', onPrevious);
  safeSetAction('nexttrack', onNext);
  safeSetAction('seekbackward', details => {
    audio.currentTime = Math.max(0, audio.currentTime - (details.seekOffset || 10));
  });
  safeSetAction('seekforward', details => {
    const duration = Number.isFinite(audio.duration) ? audio.duration : Infinity;
    audio.currentTime = Math.min(duration, audio.currentTime + (details.seekOffset || 10));
  });
  safeSetAction('seekto', details => {
    if (!Number.isFinite(details.seekTime)) return;
    if (details.fastSeek && typeof audio.fastSeek === 'function') audio.fastSeek(details.seekTime);
    else onSeekTo(details.seekTime);
  });
  safeSetAction('stop', () => {
    audio.pause();
    audio.currentTime = 0;
  });

  function update(track = getTrack()) {
    if (!track || typeof MediaMetadata === 'undefined') return;

    const metadata = {
      title: track.title,
      artist: 'SHINOBIWAN',
      album: track.album,
      artwork: MEDIA_ARTWORK
    };

    try {
      session.metadata = new MediaMetadata(metadata);
    } catch (error) {
      console.warn('Android media artwork could not be registered; using text metadata.', error);
      try {
        session.metadata = new MediaMetadata({
          title: track.title,
          artist: 'SHINOBIWAN',
          album: track.album
        });
      } catch {
        // Media Session support is partial; never let it block the app boot.
      }
    }
  }

  function updatePlaybackState() {
    try {
      session.playbackState = audio.paused ? 'paused' : 'playing';
    } catch {
      // Partial implementations may expose a read-only playback state.
    }
  }

  function updatePosition() {
    if (typeof session.setPositionState !== 'function') return;
    if (!Number.isFinite(audio.duration) || audio.duration <= 0) return;

    const second = Math.floor(audio.currentTime);
    if (second === lastPositionSecond) return;
    lastPositionSecond = second;

    try {
      session.setPositionState({
        duration: audio.duration,
        playbackRate: audio.playbackRate || 1,
        position: Math.min(audio.currentTime, audio.duration)
      });
    } catch {
      // Metadata may be changing while the browser updates the lock-screen UI.
    }
  }

  return { update, updatePlaybackState, updatePosition };
}
