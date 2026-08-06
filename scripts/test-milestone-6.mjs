import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = path => fs.readFileSync(path, 'utf8');

const feature = read('js/features/home-editorial.js');
for (const required of [
  "const DEFAULT_VISUAL_MODE = 'neon-shatter'",
  'latestActiveTrackEntries(tracks, 1)',
  'function renderOfficialRelease()',
  'home-official-release',
  'Latest official release',
  'data-play-index',
  "#track=${encodeURIComponent(track.id)}",
  "#lyrics=${encodeURIComponent(track.id)}",
  "#studio=${encodeURIComponent(track.id)}",
  'function installVisualSwitcher()',
  'data-visual-direction',
  "canvas.addEventListener('touchstart'",
  "canvas.addEventListener('touchend'",
  "window.addEventListener('shinobi:visual-mode', update)",
  "hero.dataset.mobileHeaderOrder = 'wordmark-first'",
  'export function initHomeEditorial'
]) assert.ok(feature.includes(required), `Milestone 6 Home module is missing ${required}.`);

const styles = read('css/home-editorial.css');
for (const required of [
  '.home-official-release',
  '--release-cover',
  '.home-release-cover',
  '.home-release-actions',
  '.home-visual-switcher',
  '.home-visual-arrow',
  '.launchpad-hero[data-mobile-header-order="wordmark-first"] .hero-body',
  '.launchpad-hero[data-mobile-header-order="wordmark-first"] .launchpad-banner-rail',
  'touch-action:pan-y'
]) assert.ok(styles.includes(required), `Milestone 6 Home styles are missing ${required}.`);

const live = read('js/features/visual/visual-engine-live.js');
for (const required of [
  "const DEFAULT_MODE = 'neon-shatter'",
  'externalHomeRenderer: false',
  "homeTitle.textContent = 'Neon Shatter'",
  "new CustomEvent('shinobi:visual-mode'",
  "dataset.audioLabRenderer = 'hybrid-reactive-v5'"
]) assert.ok(live.includes(required), `Milestone 6 visual engine is missing ${required}.`);

const engine = read('js/app-engine.js');
for (const required of [
  "'css/home-editorial.css'",
  "import(versioned('./features/home-editorial.js'))",
  'initHomeEditorial()'
]) assert.ok(engine.includes(required), `Milestone 6 boot wiring is missing ${required}.`);

const worker = read('sw.js');
assert.ok(worker.includes("'./css/home-editorial.css'"));
assert.ok(worker.includes("'./js/features/home-editorial.js'"));

const build = read('js/build-config.js');
assert.ok(build.includes("id: '20260806-m6-home-editorial'"));
assert.ok(build.includes("cache: 'shinobi-launchpad-v33'"));
assert.ok(build.includes("display: '2026.08.06.33'"));

console.log('Milestone 6 Home editorial release, mobile order and visual switcher remain valid.');
