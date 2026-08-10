import fs from 'node:fs';

const read = path => fs.readFileSync(path, 'utf8');
const fail = message => { throw new Error(message); };

const studio = read('js/features/lyrics-studio.js');
const css = read('css/mobile-studio.css');
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
  fail('Build 84 Show Track must be layout-only and must never call playCanvas().');
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
  fail('Build 84 must not enlarge the Android Canvas compositor surface when Show Track expands.');
}

if (!worker.includes("'./css/mobile-studio.css'")) {
  fail('Mobile Studio stylesheet is missing from the PWA shell.');
}

console.log('Build 84 guards mobile Studio: Show Track is layout-only, Canvas geometry stays stable and explicit Track navigation is available.');
