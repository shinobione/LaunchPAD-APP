import fs from 'node:fs';

const read = path => fs.readFileSync(path, 'utf8');
const fail = message => { throw new Error(message); };

const pwa = read('js/features/pwa.js');
for (const required of [
  'createPWAUpdateController',
  'pwa-update-banner',
  'data-pwa-update-now',
  'data-pwa-update-later',
  'deferredUntilPlaybackStops',
  "audio?.addEventListener('pause'",
  "audio?.addEventListener('ended'",
  "waitingWorker.postMessage({ type: 'SKIP_WAITING' })",
  "serviceWorker?.addEventListener('controllerchange'",
  'if (refreshing || (!activationRequested && !reloadAuthorized)) return;',
  "registration.addEventListener('updatefound'",
  'await registration.update()',
  'A new version of LaunchPAD is available.',
  'The update will be applied without abruptly interrupting the music.',
  'Update now',
  'Later'
]) {
  if (!pwa.includes(required)) fail(`PWA update controller is missing ${required}.`);
}

const worker = read('sw.js');
const installBlock = worker.match(/self\.addEventListener\('install',[\s\S]*?\n\}\);/)?.[0] || '';
if (!installBlock) fail('Service worker install lifecycle is missing.');
if (installBlock.includes('skipWaiting')) {
  fail('A new service worker must wait for explicit user approval.');
}
if (!worker.includes("event.data?.type === 'SKIP_WAITING'")) {
  fail('Service worker does not accept explicit update activation.');
}
if (!worker.includes("globalThis.SHINOBIWAN_BUILD?.release")) {
  fail('Service worker cache version is not connected to central release metadata.');
}
for (const required of [
  './css/catalog-filters.css',
  './js/features/catalog-filters.js'
]) {
  if (!worker.includes(required)) fail(`Feature 09 offline shell is missing ${required}.`);
}

const build = read('js/build-config.js');
for (const required of [
  "id: '20260802-wave14'",
  "cache: 'shinobi-launchpad-v11'",
  "revision: 'hero-first-paint-1'",
  "display: '2026.08.05.8'",
  "release: 'feature-09-editorial-catalog-filters-20260805'"
]) {
  if (!build.includes(required)) fail(`Build metadata is missing ${required}.`);
}
for (const required of [
  'installAppIconLinks',
  "assets/app-icon-neon.svg",
  "assets/app-icon-neon-192.png",
  "link[rel=\"alternate icon\"]",
  "link[rel=\"manifest\"]"
]) {
  if (!build.includes(required)) fail(`Cache-busting app icon wiring is missing ${required}.`);
}

const about = read('js/features/about/about-controller.js');
for (const required of [
  'installBuildInfo',
  'about-build-info',
  'Build ${build.display',
  'Release ${build.release'
]) {
  if (!about.includes(required)) fail(`About build information is missing ${required}.`);
}

const styles = read('css/pwa.css');
for (const required of [
  '.pwa-update-banner',
  'env(safe-area-inset-bottom)',
  '.pwa-update-actions',
  '@media(max-width:760px)'
]) {
  if (!styles.includes(required)) fail(`Responsive PWA update styling is missing ${required}.`);
}

const visualRunner = read('scripts/capture-visuals.sh');
if (!visualRunner.includes('PWA UPDATE READY DEFER AUDIO LATER SESSION SINGLE RELOAD')) {
  fail('Browser regression coverage for the PWA update prompt is not wired into CI.');
}

console.log('PWA update prompt, Feature 09 offline assets, current build metadata and audio-safe activation are valid.');
