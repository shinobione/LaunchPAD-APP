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

// Prefer the actual track thumbnail: this is the cover path already displayed
// by LaunchPAD and verified end-to-end through Chrome -> Windows GSMTC.
// Use fullCover only when there is no thumbnail; never advertise unverified sizes.
function artworkForTrack(track) {
  const cover = track?.cover || track?.fullCover;
  if (typeof cover !== 'string' || !cover.trim()) return MEDIA_ARTWORK;
  try {
    const url = new URL(cover, document.baseURI);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return MEDIA_ARTWORK;
    // Let Chromium determine the format, including WebP, from the response.
    return [{ src: url.href }];
  } catch {
    return MEDIA_ARTWORK;
  }
}

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
  let lastPositionDuration = NaN;

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

    lastPositionSecond = -1;
    lastPositionDuration = NaN;
    const metadata = {
      title: track.title,
      artist: 'SHINOBIWAN',
      album: track.album || '',
      artwork: artworkForTrack(track)
    };

    try {
      session.metadata = new MediaMetadata(metadata);
    } catch (error) {
      console.warn('Track artwork could not be registered; falling back to the LaunchPAD icon.', error);
      try {
        session.metadata = new MediaMetadata({ ...metadata, artwork: MEDIA_ARTWORK });
      } catch {
        try {
          session.metadata = new MediaMetadata({
            title: track.title,
            artist: 'SHINOBIWAN',
            album: track.album || ''
          });
        } catch {
          // Partial Media Session support must never interrupt playback.
        }
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

  function updatePosition(force = false) {
    if (typeof session.setPositionState !== 'function') return;
    if (!Number.isFinite(audio.duration) || audio.duration <= 0) return;
    if (!Number.isFinite(audio.currentTime)) return;

    const second = Math.floor(audio.currentTime);
    if (!force && second === lastPositionSecond && audio.duration === lastPositionDuration) return;

    try {
      session.setPositionState({
        duration: audio.duration,
        playbackRate: audio.playbackRate || 1,
        position: Math.max(0, Math.min(audio.currentTime, audio.duration))
      });
      lastPositionSecond = second;
      lastPositionDuration = audio.duration;
    } catch {
      // Metadata may be changing while the browser updates the lock-screen UI.
    }
  }

  return { update, updatePlaybackState, updatePosition };
}
