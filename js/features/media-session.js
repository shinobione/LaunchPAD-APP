function guessArtworkType(url, explicitType = '') {
  if (explicitType && explicitType.startsWith('image/')) return explicitType;
  const pathname = new URL(url, window.location.href).pathname.toLowerCase();
  if (pathname.endsWith('.png')) return 'image/png';
  if (pathname.endsWith('.webp')) return 'image/webp';
  if (pathname.endsWith('.gif')) return 'image/gif';
  if (pathname.endsWith('.svg')) return 'image/svg+xml';
  return 'image/jpeg';
}

function artworkEntry(src, explicitType = '') {
  const url = new URL(src, window.location.href).href;
  return { src: url, type: guessArtworkType(url, explicitType) };
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
  let metadataToken = 0;

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

  function applyMetadata(track, artwork) {
    session.metadata = new MediaMetadata({
      title: track.title,
      artist: 'SHINOBIWAN',
      album: track.album,
      artwork
    });
  }

  function update(track = getTrack()) {
    if (!track || typeof MediaMetadata === 'undefined') return;

    const token = ++metadataToken;
    const artwork = [];
    const seen = new Set();
    const addArtwork = (src, type = '') => {
      if (!src) return;
      const entry = artworkEntry(src, type);
      if (seen.has(entry.src)) return;
      seen.add(entry.src);
      artwork.push(entry);
    };

    addArtwork(track.cover, track.coverContentType);
    addArtwork('assets/logo.png', 'image/png');
    applyMetadata(track, artwork);

    // Android occasionally snapshots metadata before a remote image has decoded.
    // Re-apply it once the primary cover is ready so the notification and lock screen refresh.
    const primary = artwork[0];
    if (!primary || !track.cover?.startsWith?.('http')) return;

    const image = new Image();
    image.decoding = 'async';
    image.onload = () => {
      if (token !== metadataToken) return;
      applyMetadata(track, artwork);
    };
    image.src = primary.src;
  }

  function updatePlaybackState() {
    session.playbackState = audio.paused ? 'paused' : 'playing';
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
