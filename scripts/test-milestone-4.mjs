import assert from 'node:assert/strict';
import fs from 'node:fs';
import { assertCurrentBuild } from './lib/build-metadata.mjs';

const read = path => fs.readFileSync(path, 'utf8');

const scope = read('js/features/theme-scope.js');
for (const required of [
  "const TRACK_ROUTE_PREFIX = '#track='",
  'function trackFromRoute()',
  'function playingTrack(audio)',
  'function setStyleIfChanged(',
  'function setDataIfChanged(',
  'function applyPlayerPalette(track)',
  'function applyPagePalette(viewedTrack, fallbackTrack)',
  "changed = setDataIfChanged(node, 'playerTrackTheme', track.id) || changed;",
  "const scope = viewed && played && viewed.id !== played.id ? 'split' : 'unified';",
  "document.documentElement.dataset.themeScope = scope",
  "detail: { viewedTrackId: viewed?.id || null, playingTrackId: played?.id || null }",
  "attributeFilter: ['data-track-id', 'src']",
  'export function initThemeScoping'
]) assert.ok(scope.includes(required), `Theme scope module is missing ${required}.`);

const styles = read('css/theme-scope.css');
for (const required of [
  'html[data-theme-scope="split"] .app-shell',
  '.side-player[data-player-track-theme]',
  '.player-bar[data-player-track-theme]',
  '--accent:var(--player-accent)!important',
  'body[data-viewed-track-theme] #view-track'
]) assert.ok(styles.includes(required), `Theme scope styles are missing ${required}.`);

const engine = read('js/app-engine.js');
for (const required of [
  "'css/theme-scope.css'",
  "import(versioned('./features/theme-scope.js'))",
  'initThemeScoping({ audio })'
]) assert.ok(engine.includes(required), `Theme scope boot wiring is missing ${required}.`);

const worker = read('sw.js');
assert.ok(worker.includes("'./css/theme-scope.css'"));
assert.ok(worker.includes("'./js/features/theme-scope.js'"));
assert.ok(worker.includes("'./js/core/catalog-schema.js'"));

const build = assertCurrentBuild('Milestone 4');
console.log(`Milestone 4 page/player theme isolation remains valid under Build ${build.number}.`);
