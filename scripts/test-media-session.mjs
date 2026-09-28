import assert from 'node:assert/strict';

// Model the browser-facing contract without requiring Windows, a device, or a
// second audio element. The real WebP thumbnail was manually confirmed in GSMTC.
const baseURI = 'https://shinobione.github.io/LaunchPAD-APP/';
globalThis.document = { baseURI };
const handlers = new Map();
const positions = [];
const session = {
  metadata: null,
  playbackState: 'none',
  setActionHandler(action, handler) { handlers.set(action, handler); },
  setPositionState(value) { positions.push(value); }
};
Object.defineProperty(globalThis, 'navigator', {
  configurable: true,
  value: { mediaSession: session }
});
let rejectTrackArtwork = false;
globalThis.MediaMetadata = class {
  constructor(data) {
    if (rejectTrackArtwork && data.artwork?.[0]?.src.includes('/thumbnail/')) {
      throw new Error('mock browser rejects track artwork');
    }
    Object.assign(this, data);
  }
};

const { createMediaSessionController } = await import('../js/features/media-session.js');
const realCover = 'https://launchpad-media.jerryquinet.workers.dev/media/test/thumbnail/thumbnail.webp?v=1';
let track = {
  title: "I'VE GOT THE TIME NOW (Em Không Đợi Nữa)",
  artist: 'SHINOBIWAN',
  album: 'Singles',
  cover: realCover,
  fullCover: 'https://launchpad-media.jerryquinet.workers.dev/media/test/cover/cover.webp'
};
const audio = { paused: false, currentTime: 76.35, duration: 329.88, playbackRate: 1, pause() { this.paused = true; } };
const controller = createMediaSessionController({
  audio,
  getTrack: () => track,
  onPlay() {},
  onPause() {},
  onPrevious() {},
  onNext() {},
  onSeekTo(value) { audio.currentTime = value; }
});

controller.update();
assert.equal(session.metadata.title, track.title);
assert.equal(session.metadata.artist, 'SHINOBIWAN');
assert.equal(session.metadata.artwork.length, 1);
assert.equal(session.metadata.artwork[0].src, realCover, 'use the tested real thumbnail, not the app icon');
assert.equal('sizes' in session.metadata.artwork[0], false, 'do not advertise unverified dimensions');
controller.updatePlaybackState();
assert.equal(session.playbackState, 'playing');
assert.ok(handlers.has('nexttrack'));

controller.updatePosition();
assert.deepEqual(positions.at(-1), { duration: 329.88, playbackRate: 1, position: 76.35 });
audio.currentTime = 76.9;
controller.updatePosition();
assert.equal(positions.length, 1, 'ordinary timeupdate remains throttled within one second');
controller.updatePosition(true);
assert.equal(positions.at(-1).position, 76.9, 'seek forces an update within the same second');
audio.duration = 330;
controller.updatePosition();
assert.equal(positions.at(-1).duration, 330, 'duration change is not skipped');

track = { title: 'Fallback', album: '', cover: 'javascript:alert(1)' };
controller.update();
assert.equal(session.metadata.artwork.length, 2);
assert.ok(session.metadata.artwork[0].src.endsWith('/assets/app-icon-neon-192.png'));

track = { title: 'Full only', fullCover: 'covers/high-res.webp' };
controller.update();
assert.equal(session.metadata.artwork[0].src, new URL('covers/high-res.webp', baseURI).href);

track = { title: 'Rejected thumbnail', cover: realCover };
rejectTrackArtwork = true;
controller.update();
assert.equal(session.metadata.artwork.length, 2, 'fallback to app artwork if MediaMetadata rejects track cover');

console.log('Media Session GSMTC cover, metadata, fallback and timeline regression checks passed.');
