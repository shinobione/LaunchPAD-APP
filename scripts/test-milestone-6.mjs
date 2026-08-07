import assert from 'node:assert/strict';
import fs from 'node:fs';
import { assertCurrentBuild } from './lib/build-metadata.mjs';

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
  'export function initHomeEditorial'
]) assert.ok(feature.includes(required), `Milestone 6 Home module is missing ${required}.`);
assert.ok(!feature.includes('mobileHeaderOrder'));
assert.ok(!feature.includes('wordmark-first'));

const styles = read('css/home-editorial.css');
for (const required of [
  '.home-official-release','--release-cover','.home-release-cover','.home-release-actions',
  'grid-template-columns:repeat(2,minmax(0,1fr))','grid-column:1 / -1',
  '.home-visual-switcher','.home-visual-arrow','touch-action:pan-y'
]) assert.ok(styles.includes(required), `Milestone 6 Home styles are missing ${required}.`);

const routeStyles = read('css/feature-11.css');
for (const required of ['.launchpad-hero .launchpad-banner-rail','order: 1;','.launchpad-hero .hero-body','order: 2;']) {
  assert.ok(routeStyles.includes(required), `Canonical mobile hero order is missing ${required}.`);
}

const live = read('js/features/visual/visual-engine-live.js');
for (const required of [
  "const DEFAULT_MODE = 'neon-shatter'", 'externalHomeRenderer: false',
  "homeTitle.textContent = 'Neon Shatter'", "new CustomEvent('shinobi:visual-mode'",
  "dataset.audioLabRenderer = 'signal-first-v9'", 'function boostLiveFeatures(features)',
  'renderMode(homeCanvas, customRenderer, raw, getAccent, time, features, mode)'
]) assert.ok(live.includes(required), `Milestone 6 visual engine is missing ${required}.`);

const engine = read('js/app-engine.js');
for (const required of ["'css/home-editorial.css'","import(versioned('./features/home-editorial.js'))",'initHomeEditorial()']) {
  assert.ok(engine.includes(required), `Milestone 6 boot wiring is missing ${required}.`);
}

const worker = read('sw.js');
assert.ok(worker.includes("'./css/home-editorial.css'"));
assert.ok(worker.includes("'./js/features/home-editorial.js'"));

const build = assertCurrentBuild('Milestone 6');
console.log(`Milestone 6 Home editorial release, banner-first mobile order and signal-first visual switcher remain valid under Build ${build.number}.`);
