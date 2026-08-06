import fs from 'node:fs';

const read = path => fs.readFileSync(path, 'utf8');
const fail = message => { throw new Error(message); };

const pwa = read('js/features/pwa.js');
for (const required of [
  'createPWAUpdateController','pwa-update-banner','data-pwa-update-now','data-pwa-update-later','deferredUntilPlaybackStops',
  "audio?.addEventListener('pause'","audio?.addEventListener('ended'","waitingWorker.postMessage({ type: 'SKIP_WAITING' })",
  "serviceWorker?.addEventListener('controllerchange'",'ACTIVATION_TIMEOUT_MS','completeWithReload','fetchRemoteRelease',
  "window.addEventListener('focus'","window.addEventListener('pageshow'","document.addEventListener('visibilitychange'",
  "registration.addEventListener('updatefound'",'await registration.update()','A new version of LaunchPAD is available.',
  'The update will be applied without abruptly interrupting the music.','Update now','Later','beforeinstallprompt',
  'pwa-install-banner','data-pwa-install-now','data-pwa-install-later','Install LaunchPAD','Add to Home Screen',
  "window.addEventListener('appinstalled'",'UPDATE_ACCEPTED_KEY','readWorkerRelease','WORKER_RELEASE_TIMEOUT_MS',
  "worker.postMessage({ type: 'GET_RELEASE' }, [channel.port2])",'let updateCheckPromise = null',
  'if (updateCheckPromise) return updateCheckPromise','offerWaitingWorker','reportedRelease !== release',
  "const workerUrl = new URL('./sw.js', document.baseURI)","announce: false"
]) {
  if (!pwa.includes(required)) fail(`PWA controller is missing ${required}.`);
}
if (pwa.includes("workerUrl.searchParams.set('release'")) {
  fail('Service worker registration URL must remain stable across releases.');
}
if (pwa.includes('forceReload') || pwa.includes('reloadOnly')) {
  fail('The legacy metadata-only reload prompt must not coexist with worker updates.');
}

const worker = read('sw.js');
const installBlock = worker.match(/self\.addEventListener\('install',[\s\S]*?\n\}\);/)?.[0] || '';
if (!installBlock) fail('Service worker install lifecycle is missing.');
if (installBlock.includes('skipWaiting')) fail('A new service worker must wait for explicit user approval.');
if (!worker.includes("event.data?.type === 'SKIP_WAITING'")) fail('Service worker does not accept explicit update activation.');
if (!worker.includes("event.data?.type === 'GET_RELEASE'")) fail('Service worker cannot identify its release to the page.');
if (!worker.includes('postMessage({ release: RELEASE, version: VERSION })')) fail('Service worker release response is missing.');
if (!worker.includes("globalThis.SHINOBIWAN_BUILD?.release")) fail('Service worker cache version is not connected to central release metadata.');
if (!worker.includes("url.pathname.endsWith('/js/build-config.js')")) fail('Build metadata is not fetched network-first.');
for (const required of [
  './css/catalog-filters.css','./js/features/catalog-filters.js','./css/feature-10.css','./js/core/editorial-normalization.js',
  './js/features/content-advisory-badges.js','./css/feature-11.css','./js/core/catalog-ordering.js','./js/features/feature-11.js',
  './css/feature-12.css','./js/features/feature-12.js','./js/features/feature-13.js','./js/features/audio-lab-signal.js','./js/features/visual/visual-engine-v2.js'
]) {
  if (!worker.includes(required)) fail(`Offline shell is missing ${required}.`);
}
if (!worker.includes("request.destination === 'video'")) fail('Service worker does not preserve dedicated video range playback.');

const build = read('js/build-config.js');
for (const required of [
  "id: '20260805-audiolab-signal'",
  "cache: 'shinobi-launchpad-v16'",
  "revision: 'audiolab-signal-recovery-1'",
  "display: '2026.08.05.16'",
  "release: 'audiolab-signal-recovery-20260805'",
  "id: '20260806-pwa-single-update'",
  "cache: 'shinobi-launchpad-v28'",
  "revision: 'pwa-single-update-1'",
  "display: '2026.08.06.28'",
  "release: 'pwa-single-update-20260806'"
]) {
  if (!build.includes(required)) fail(`Build metadata is missing ${required}.`);
}
for (const required of ['installAppIconLinks',"assets/app-icon-neon.svg","assets/app-icon-neon-192.png","link[rel=\"alternate icon\"]","link[rel=\"manifest\"]"]) {
  if (!build.includes(required)) fail(`Cache-busting app icon wiring is missing ${required}.`);
}

const signal = read('js/features/audio-lab-signal.js');
for (const required of [
  'initAudioLabSignalBridge','synthesizePlaybackSpectrum','waveformToSpectrum',
  "audio.addEventListener('play', recover)","audio.addEventListener('playing', recover)",
  "markSignal('live')","markSignal('fallback')"
]) {
  if (!signal.includes(required)) fail(`AudioLab signal recovery is missing ${required}.`);
}

const about = read('js/features/about/about-controller.js');
for (const required of [
  'installBuildInfo','about-build-info','Build ${build.display','Release ${build.release',
  'function placeBuildInfo()','ABOUT_MOBILE_QUERY',"logo.insertAdjacentElement('afterend', info)",
  'installGoldenLogo();\n  installBuildInfo();','installBuildInfoPlacementWatcher()'
]) {
  if (!about.includes(required)) fail(`About build information is missing ${required}.`);
}

const aboutStyles = read('css/about-enhancements.css');
for (const required of ['#view-about .about-card>.about-build-info','margin-top:4px']) {
  if (!aboutStyles.includes(required)) fail(`About mobile layout is missing ${required}.`);
}

const styles = read('css/pwa.css');
for (const required of ['.pwa-update-banner','.pwa-install-banner','.pwa-install-actions','pwa-install-pulse','env(safe-area-inset-bottom)','.pwa-update-actions','@media(max-width:760px)']) {
  if (!styles.includes(required)) fail(`Responsive PWA styling is missing ${required}.`);
}

const visualRunner = read('scripts/capture-visuals.sh');
if (!visualRunner.includes('PWA UPDATE READY DEFER AUDIO LATER SESSION SINGLE RELOAD DEDUPED VERIFIED')) {
  fail('Browser regression coverage for the deduped PWA update prompt is not wired into CI.');
}

console.log('PWA updates use one verified waiting worker, one prompt and one reload while the offline shell remains valid.');
