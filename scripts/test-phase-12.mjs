import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = path => fs.readFileSync(path, 'utf8');

const manager = read('cloudflare/admin-worker.parts/18-phase-12-hotfixes.inject.part');
for (const required of [
  "TRACK_MANAGER_PHASE_12_VERSION='5.4'",
  'function phase12TrackMatches(track)',
  'state.catalogStatusFilter',
  'state.catalogIssueFilter',
  'state.catalogLyricsFilter',
  'state.catalogContentFilter',
  "apply.id='phase12ApplyFilters'",
  "apply.textContent='Appliquer'",
  'var phase12ManualColorRequest=false',
  'feature10ApplyCoverColors=async function(blob)',
  "id=\"phase12ExtractColors\"",
  'Extraire les couleurs',
  "phase12VersionPill.textContent='v5.4'"
]) assert.ok(manager.includes(required), `Track Manager Phase 12 is missing ${required}.`);
assert.ok(manager.indexOf('phase12TrackMatches(track)') < manager.indexOf('grid.innerHTML=tracks.map(phase12TrackCard)'), 'Filtering must happen before card rendering.');

const feature = read('js/features/feature-12.js');
for (const required of [
  "const FILTER_GROUP_ORDER = ['genre', 'language', 'content', 'energy', 'era', 'type', 'media', 'year', 'mood']",
  "root.querySelectorAll('.lyrics-studio-canvas-badge').forEach(badge => badge.remove())",
  "const text = active ? 'Video on' : 'Video off'",
  "view.style.setProperty('--accent', accent)",
  "view.style.setProperty('--accent2', accent2)",
  "signals.classList.add('track-detail-hero-signals')",
  "signals.previousElementSibling !== tags",
  "current.join('|') !== desired.join('|')",
  'export function initPhase12()'
]) assert.ok(feature.includes(required), `Public Phase 12 module is missing ${required}.`);

const styles = read('css/feature-12.css');
for (const required of [
  '.lyrics-studio-canvas-badge',
  'display:none!important',
  '#view-track[data-local-track-theme] .track-detail-actions .primary',
  '.track-detail-hero-signals',
  '@media(max-width:760px)'
]) assert.ok(styles.includes(required), `Phase 12 styles are missing ${required}.`);

const engine = read('js/app-engine.js');
assert.ok(engine.includes("'css/feature-12.css'"));
assert.ok(engine.includes("import(versioned('./features/feature-12.js'))"));
assert.ok(engine.includes('initPhase12();'));

const serviceWorker = read('sw.js');
assert.ok(serviceWorker.includes("'./css/feature-12.css'"));
assert.ok(serviceWorker.includes("'./js/features/feature-12.js'"));

const build = read('js/build-config.js');
assert.ok(build.includes("display: '2026.08.05.14'"));
assert.ok(build.includes("release: 'phase-13-visuals-palette-filters-20260805'"));
assert.ok(build.includes("cache: 'shinobi-launchpad-v14'"));

const deployment = read('.github/workflows/deploy-cloudflare.yml');
assert.ok(deployment.includes("EXPECTED_ADMIN_VERSION: '5.5'"));

console.log('Phase 12 filtering, manual cover colors, Studio cleanup, local themes, metadata layout and Discography order remain valid.');