import fs from 'node:fs';

const read = path => fs.readFileSync(path, 'utf8');
const fail = message => { throw new Error(message); };

const studio = read('js/features/lyrics-studio.js');
const css = read('css/mobile-studio.css');
const worker = read('sw.js');

for (const required of [
  "ensureStylesheet('css/mobile-studio.css')",
  'lyrics-mobile-track-toggle',
  'lyrics-track-panel-collapsed',
  "window.matchMedia?.('(max-width:760px)')",
  'setMobilePanelCollapsed',
  'centerElementInScrollContainer',
  'resetMobileTrackPanelScroll',
  "trackPanel.scrollTo({ top: 0, left: 0, behavior: 'auto' })"
]) {
  if (!studio.includes(required)) fail(`Mobile Studio controller is missing ${required}.`);
}

for (const required of [
  'height:100dvh!important',
  'env(safe-area-inset-top,0px)',
  'env(safe-area-inset-bottom,0px)',
  'position:sticky',
  'lyrics-track-panel-collapsed',
  'body.lyrics-studio-open .player-bar',
  'visibility:visible!important',
  'orientation:landscape',
  'grid-template-columns:repeat(3,minmax(0,1fr))',
  '.lyrics-track-panel:not(.lyrics-track-panel-collapsed)',
  'grid-template-columns:minmax(92px,116px) minmax(0,1fr)'
]) {
  if (!css.includes(required)) fail(`Mobile Studio stylesheet is missing ${required}.`);
}

if (!worker.includes("'./css/mobile-studio.css'")) {
  fail('Mobile Studio stylesheet is missing from the PWA shell.');
}

console.log('Mobile Studio collapse, expanded Canvas visibility, sticky controls, safe areas and compact player are covered.');
