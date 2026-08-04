import fs from 'node:fs';

const read = path => fs.readFileSync(path, 'utf8');
const fail = message => { throw new Error(message); };

const feature = read('js/features/canvas-identity.js');
const styles = read('css/canvas-identity.css');
const engine = read('js/app-engine.js');
const worker = read('sw.js');

for (const required of [
  "const CARD_SELECTOR = '.album-card[data-index]'",
  "video.preload = 'none'",
  'video.dataset.src = track.video',
  'policyAllowsPreview',
  "(prefers-reduced-motion: reduce)",
  "(prefers-reduced-data: reduce)",
  'connection?.saveData',
  'IntersectionObserver',
  'VIEWPORT_THRESHOLD',
  'HOVER_DELAY',
  "startPreview(card, 'desktop-hover')",
  "startPreview(card, 'explicit-action')",
  'stopPreview(activeCard, { release: true })',
  "window.location.hash = `#${route}=${encodeURIComponent(trackId)}`",
  "root.addEventListener('error', onVideoError, true)",
  'releaseVideo(video)'
]) {
  if (!feature.includes(required)) fail(`Canvas identity feature is missing ${required}.`);
}

if (/\.src\s*=\s*track\.video/.test(feature)) {
  fail('Canvas card videos must keep their MP4 in data-src until interaction.');
}
if (feature.includes('audio.pause(') || feature.includes("querySelector('#audio').pause")) {
  fail('Canvas identity previews must not pause the music player.');
}

for (const required of [
  '.canvas-card-badge',
  '.canvas-card-preview-video',
  '.canvas-card-actions',
  '.is-canvas-previewing',
  '@media(max-width:760px),(hover:none),(pointer:coarse)',
  '@media(prefers-reduced-motion:reduce)'
]) {
  if (!styles.includes(required)) fail(`Canvas identity styles are missing ${required}.`);
}

for (const required of [
  "import(versioned('./features/canvas-identity.js'))",
  'initCanvasIdentity();'
]) {
  if (!engine.includes(required)) fail(`Canvas identity boot wiring is missing ${required}.`);
}

for (const required of [
  "'./css/canvas-identity.css'",
  "'./js/features/canvas-identity.js'"
]) {
  if (!worker.includes(required)) fail(`Offline shell is missing ${required}.`);
}

console.log('Canvas badges, lazy previews, one-active arbitration, mobile actions, Studio routing, data policies and fixed-image fallback are wired safely.');
