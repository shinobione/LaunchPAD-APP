import fs from 'node:fs';

const fail = message => { throw new Error(message); };
const read = path => fs.readFileSync(path, 'utf8');

// These checks deliberately run through the existing service-worker CI step,
// so every PWA build validates persistent media and mobile regressions.
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
  'apiUrl:',
  'video: item.assets.video?.url || null',
  'videoContentType: item.assets.video?.contentType || null',
  'videoFilename: item.assets.video?.filename || null'
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

const router = read('js/core/router.js');
for (const required of [
  "'studio'",
  "route.type === 'studio'",
  "{ type: 'lyrics', id: route.id }",
  "'shinobi:route-change'",
  'routeToHash(route)'
]) {
  if (!router.includes(required)) fail(`Dedicated Studio routing is missing ${required}.`);
}

const trackVideos = read('js/features/track-videos.js');
for (const required of [
  'track?.video',
  "preload = 'none'",
  "button.textContent = 'Open Canvas'",
  'video.playsInline = true',
  'video.loop = true',
  'video.muted = true',
  'video.controls = false',
  'video.dataset.src = track.video',
  'data-track-video-loop-action',
  'data-track-studio-action',
  '`#studio=${encodeURIComponent(trackId)}`',
  "button.textContent = 'Studio'"
]) {
  if (!trackVideos.includes(required)) fail(`Track Canvas and Studio entry are missing ${required}.`);
}
if (trackVideos.includes('requestLyricsStudio') || trackVideos.includes('sessionStorage')) {
  fail('Track detail must use the dedicated Studio route instead of a temporary handoff.');
}
if (trackVideos.includes('fetch(')) {
  fail('Track Canvas playback must use the hydrated catalog instead of making a second metadata request.');
}
for (const forbidden of ['audio?.pause()', "audio?.addEventListener('play'"]) {
  if (trackVideos.includes(forbidden)) fail(`Silent Canvas playback must not interrupt music: ${forbidden}.`);
}

const lyricsStudio = read('js/features/lyrics-studio.js');
for (const required of [
  "dataset.lyricsStudio = 'canvas'",
  'lyrics-studio-canvas-active',
  "video.className = 'lyrics-studio-canvas-video'",
  'video.loop = true',
  'video.muted = true',
  'video.controls = false',
  "ensureStylesheet('css/track-videos.css')",
  'autoScrollButton',
  'has-canvas-control',
  'setPressed',
  'parseRoute',
  'routeToHash',
  'routeMatchesCurrentStudio',
  'syncStudioRoute',
  'preserveStudioForCurrentTrack',
  "type: 'studio'",
  "'shinobi:route-change'"
]) {
  if (!lyricsStudio.includes(required)) fail(`Lyrics Studio Canvas and route state are missing ${required}.`);
}
for (const forbidden of [
  'requestLyricsStudio',
  'pendingStudioTrackId',
  'sessionStorage',
  'shinobi-launchpad-open-studio-track'
]) {
  if (lyricsStudio.includes(forbidden)) fail(`Legacy Studio handoff survived dedicated routing: ${forbidden}.`);
}
if (lyricsStudio.includes('audio.pause')) {
  fail('Lyrics Studio Canvas must leave the music track playing.');
}

const lyricsEngine = read('js/features/lyrics/lyrics-engine.js');
for (const required of [
  'centeredScrollTop',
  'centerElementInScrollContainer',
  'getBoundingClientRect',
  'lineIsInReaderFocusZone',
  'scrollLineIntoReader',
  'reader.scrollTo',
  "button.setAttribute('aria-pressed', String(autoScroll))"
]) {
  if (!lyricsEngine.includes(required)) fail(`Lyrics reader state or bounded scrolling is missing ${required}.`);
}
for (const forbidden of ['scrollIntoView', 'element.offsetTop -']) {
  if (lyricsEngine.includes(forbidden)) {
    fail(`Lyrics auto-scroll must stay relative to its reader instead of the page: ${forbidden}.`);
  }
}

const listeningSummary = read('js/features/listening-history-summary.js');
for (const required of [
  'shinobi-launchpad-listening-summary-v1',
  'playedTrackIds',
  'tracks played locally',
  "audio.addEventListener('play'",
  'data-memory-action="clear-history"'
]) {
  if (!listeningSummary.includes(required)) fail(`Listening summary is missing ${required}.`);
}
if (listeningSummary.includes('.slice(0, 12)')) {
  fail('The played-track summary must not inherit the twelve-item recent-list cap.');
}

const appEngine = read('js/app-engine.js');
for (const required of [
  "import(versioned('./features/track-videos.js'))",
  "import(versioned('./features/listening-history-summary.js'))",
  'initTrackVideos({ audio })',
  'initListeningHistorySummary({ audio })'
]) {
  if (!appEngine.includes(required)) fail(`App boot is missing ${required}.`);
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
const appEngineSource = read('js/app-engine.js');
if (/export const tracks\s*=/.test(staticCatalog)) {
  fail('Production catalog must be hydrated from the canonical R2 Worker.');
}
if (catalogFixture.includes('assets/lyrics/')) {
  fail('The local catalog fixture must not reference bundled lyric files.');
}
if (!catalogFixture.includes("kind, filename")) {
  fail('The local catalog fixture must resolve media through the public R2 Worker.');
}
if (!appEngineSource.includes("dataset.remoteCatalog = 'error'") || appEngineSource.includes("dataset.remoteCatalog = 'fallback'")) {
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
for (const required of [
  "'./assets/pwa-icon-512.png'",
  "'./css/track-videos.css'",
  "'./js/core/router.js'",
  "'./js/features/track-videos.js'",
  "'./js/features/lyrics/lyrics-engine.js'",
  "'./js/features/lyrics-studio.js'",
  "'./js/features/listening-history-summary.js'",
  'globalThis.SHINOBIWAN_BUILD?.release'
]) {
  if (!worker.includes(required)) fail(`The service worker cache is missing ${required}.`);
}

console.log('Media artwork, playback readiness, lyrics timing, reader-relative auto-scroll, dedicated Studio URLs, centralized PWA release and listening summary regressions are covered.');
