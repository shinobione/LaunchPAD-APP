import fs from 'node:fs';

const read = path => fs.readFileSync(path, 'utf8');
const fail = message => { throw new Error(message); };

const studio = read('js/features/lyrics-studio.js');
const css = read('css/mobile-studio.css');
const parity = read('js/features/studio-loop-parity-v85.js');
const parityCss = read('css/studio-loop-parity-v85.css');
const build = read('js/build-config.js');
const worker = read('sw.js');

for (const required of [
  "ensureStylesheet('css/mobile-studio.css')",
  'lyrics-mobile-track-toggle',
  'lyrics-mobile-track-open',
  'lyrics-track-panel-collapsed',
  "window.matchMedia?.('(max-width:760px)')",
  'setMobilePanelCollapsed',
  'centerElementInScrollContainer',
  'resetMobileTrackPanelScroll',
  "trackPanel.scrollTo({ top: 0, left: 0, behavior: 'auto' })",
  "button.textContent = 'Open track →'",
  "routeToHash({ type: 'track', id: track.id })",
  'setStudioMode(false, { restoreScroll: false })',
  '{ recenter: false }'
]) {
  if (!studio.includes(required)) fail(`Mobile Studio controller is missing ${required}.`);
}

const collapseStart = studio.indexOf('function setMobilePanelCollapsed(');
const collapseEnd = studio.indexOf('\n  function setCanvasButtonState', collapseStart);
if (collapseStart < 0 || collapseEnd < 0) fail('Unable to isolate setMobilePanelCollapsed().');
const collapseBody = studio.slice(collapseStart, collapseEnd);
if (collapseBody.includes('playCanvas(')) {
  fail('Build 84/85 Show Track must remain layout-only and must never call playCanvas().');
}

for (const required of [
  'height:100dvh!important',
  'env(safe-area-inset-top,0px)',
  'env(safe-area-inset-bottom,0px)',
  'position:sticky',
  'lyrics-track-panel-collapsed',
  'lyrics-mobile-track-open',
  'body.lyrics-studio-open .player-bar',
  'visibility:visible!important',
  'orientation:landscape',
  'grid-template-columns:repeat(3,minmax(0,1fr))',
  '.lyrics-track-panel:not(.lyrics-track-panel-collapsed)',
  'grid-template-columns:48px minmax(0,1fr)',
  'width:36px',
  'height:64px'
]) {
  if (!css.includes(required)) fail(`Mobile Studio stylesheet is missing ${required}.`);
}

if (css.includes('grid-template-columns:minmax(92px,116px) minmax(0,1fr)')) {
  fail('Build 84/85 must not enlarge the Android Canvas compositor surface when Show Track expands.');
}

for (const required of [
  "const CANVAS_SELECTOR = 'video.lyrics-studio-canvas-video'",
  "video.preload = 'auto'",
  "video.setAttribute('preload', 'auto')",
  "video.removeAttribute('poster')",
  "video.dataset.loopParity = 'track-video-v1'",
  "video.addEventListener('loadeddata'",
  "video.addEventListener('playing'",
  "attributeFilter: ['poster']",
  "button.textContent = 'Track page →'"
]) {
  if (!parity.includes(required)) fail(`Build 85 passive loop parity guard is missing ${required}.`);
}

for (const forbidden of ['.play(', '.pause(', '.load(', '.currentTime', '.src =']) {
  if (parity.includes(forbidden)) fail(`Build 85 loop parity guard must not become a media owner: ${forbidden}.`);
}

for (const required of ['.lyrics-mobile-track-open{', 'width:auto!important', 'justify-self:end!important']) {
  if (!parityCss.includes(required)) fail(`Build 85 Track page action styling is missing ${required}.`);
}

for (const required of [
  "'css/studio-loop-parity-v85.css'",
  '`js/features/studio-loop-parity-v85.js?v=${encodeURIComponent(config.id)}`',
  "script.dataset.studioLoopParityV85 = 'true'"
]) {
  if (!build.includes(required)) fail(`Build 85 bootstrap is missing ${required}.`);
}

if (!worker.includes("'./css/mobile-studio.css'")) {
  fail('Mobile Studio stylesheet is missing from the PWA shell.');
}

console.log('Build 85 guards mobile Studio: Show Track stays layout-only, Canvas parity removes poster flash without owning playback, and Track-page navigation is visually demoted but preserved.');
