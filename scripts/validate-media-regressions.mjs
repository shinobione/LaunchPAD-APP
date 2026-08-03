import fs from 'node:fs';

const fail = message => { throw new Error(message); };
const read = path => fs.readFileSync(path, 'utf8');

// These checks deliberately run through the existing service-worker CI step,
// so every PWA build validates all three persistent mobile regressions.
const icon = fs.readFileSync('assets/pwa-icon-512.png');
const pngSignature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
if (icon.length < 1024 || !icon.subarray(0, 8).equals(pngSignature)) {
  fail('Android media artwork must be a real PNG file.');
}

const mediaSession = read('js/features/media-session.js');
for (const required of [
  'artwork: MEDIA_ARTWORK',
  'assets/pwa-icon-512.png',
  "type: 'image/png'"
]) {
  if (!mediaSession.includes(required)) fail(`Media Session is missing ${required}.`);
}

const remoteCatalog = read('js/core/remote-catalog.js');
for (const required of [
  'function timestampState',
  "cache: 'no-store'",
  'timestampsAvailable: timestampState(item.timestampsAvailable)',
  'apiUrl:'
]) {
  if (!remoteCatalog.includes(required)) fail(`Remote catalog is missing ${required}.`);
}

const trackDetail = read('js/features/track-detail.js');
for (const required of [
  'verifyRemoteLyricsTiming',
  'detectTimestampedLyrics',
  'remoteTrack?.lyrics?.segments',
  "cache: 'no-store'",
  "'Checking…'",
  "metadataItem('Lyrics', lyricsLabel, '', lyricsAttributes)"
]) {
  if (!trackDetail.includes(required)) fail(`Track detail is missing ${required}.`);
}
if (trackDetail.includes("metadataItem('Lyrics timing'")) {
  fail('Track detail must expose one authoritative lyrics status instead of a duplicate timing field.');
}

const audioReadiness = read('js/features/audio-readiness.js');
for (const required of [
  "['loadedmetadata', 'canplay', 'canplaythrough']",
  'waitForReady',
  'nativePlay(...args)',
  'playbackRequested = true'
]) {
  if (!audioReadiness.includes(required)) fail(`First-tap playback recovery is missing ${required}.`);
}
for (const forbidden of ['fallbackFile', 'Bundled audio fallback', "addEventListener('error'"]) {
  if (audioReadiness.includes(forbidden)) fail(`Legacy audio fallback survived in playback readiness: ${forbidden}.`);
}

const manifest = JSON.parse(read('manifest.webmanifest'));
const pngIcon = manifest.icons?.find(item => item.src === 'assets/pwa-icon-512.png');
if (!pngIcon || pngIcon.type !== 'image/png' || pngIcon.sizes !== '512x512') {
  fail('The PWA manifest must register the 512px PNG media artwork.');
}

const staticCatalog = read('js/catalog.js');
const catalogFixture = read('js/catalog-fixture.js');
const appEngine = read('js/app-engine.js');
if (/export const tracks\s*=/.test(staticCatalog)) {
  fail('Production catalog must be hydrated from the canonical R2 Worker.');
}
if (catalogFixture.includes('assets/lyrics/')) {
  fail('The local catalog fixture must not reference bundled lyric files.');
}
if (!catalogFixture.includes("kind, filename")) {
  fail('The local catalog fixture must resolve media through the public R2 Worker.');
}
if (!appEngine.includes("dataset.remoteCatalog = 'error'") || appEngine.includes("dataset.remoteCatalog = 'fallback'")) {
  fail('Catalog startup must fail clearly instead of pretending to provide an offline catalog.');
}
if (fs.existsSync('assets/lyrics')) {
  fail('Bundled lyric fallbacks must be removed after R2 validation.');
}
if (fs.existsSync('js/catalog-metadata.js')) {
  fail('Duplicated static track metadata must be removed.');
}

const worker = read('sw.js');
if (worker.includes('LYRIC_RESOURCES') || worker.includes('assets/lyrics/')) {
  fail('The service worker must not precache bundled lyric fallbacks.');
}
if (!worker.includes("'./assets/pwa-icon-512.png'")) {
  fail('The service worker must cache the Android media artwork.');
}
if (!worker.includes('remote-catalog-only-20260803')) {
  fail('The service-worker release namespace was not refreshed.');
}

console.log('Android media artwork, first-tap playback and lyric timing regressions are covered.');

