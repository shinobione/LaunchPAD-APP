import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  normalizeEditorialTags,
  parentEditorialTag
} from '../js/core/editorial-normalization.js';

const read = path => fs.readFileSync(path, 'utf8');

assert.equal(parentEditorialTag('Filthy Abyssal Trap'), 'Trap');
assert.equal(parentEditorialTag('Industrial Cybertrap'), 'Trap');
assert.equal(parentEditorialTag('Spotify Canvas'), null);
assert.equal(parentEditorialTag('SPOTIFY CANVA'), null);
assert.deepEqual(
  normalizeEditorialTags(['Filthy Abyssal Trap', 'Cybertrap', 'Spotify Canvas', 'Romantic', 'R&B'], { max: 4 }),
  ['Trap', 'Romantic', 'R&B']
);

const engine = read('js/app-engine.js');
for (const required of [
  'normalizeCatalogEditorialTags',
  'initContentAdvisoryBadges',
  'css/feature-10.css'
]) {
  assert.ok(engine.includes(required), `Feature 10 engine is missing ${required}.`);
}

const advisory = read('js/features/content-advisory-badges.js');
for (const required of [
  'track-cover-status-stack',
  'content-advisory-badge',
  "label: 'EXPLICIT'",
  "label: 'CLEAN'",
  '.lyrics-card-badge',
  '.lyrics-studio-canvas-badge'
]) {
  assert.ok(advisory.includes(required), `Content advisory UI is missing ${required}.`);
}

const smartParser = read('cloudflare/admin-worker.parts/08a-feature-10-smart-parsing.inject.part');
for (const required of [
  "TRACK_MANAGER_SMART_PARSING_VERSION='10.2'",
  'function feature10ParseReleaseDate(text)',
  'RELEASE|RELEASE_DATE',
  "result.metadata.releaseDate=releaseDate",
  'STYLE[ _-]?PROMPT',
  'function feature10InferSignals(payload)',
  'async function feature10ExtractCoverColors(blob)',
  'feature10ApplyCoverColors',
  'feature10Recalculate',
  'Analyser / recalculer',
  'feature10NormalizeGenres'
]) {
  assert.ok(smartParser.includes(required), `Smart Track Manager parsing is missing ${required}.`);
}

const scopeFix = read('cloudflare/admin-worker.parts/08b-feature-10-parser-scope-fix.inject.part');
assert.ok(scopeFix.includes("TRACK_MANAGER_SMART_PARSING_SCOPE_VERSION='10.2.1'"));
assert.ok(scopeFix.includes('feature10MergeCurrentFormSignals'));

const managerUI = read('cloudflare/admin-worker.parts/16-feature-10-manager-ui.inject.part');
for (const required of [
  "TRACK_MANAGER_FEATURE_10_VERSION='5.0'",
  "state.catalogStatusFilter='all'",
  "['#sTotal','all']",
  "['#sPublished','published']",
  "['#sDraft','draft']",
  "['#sIncomplete','incomplete']",
  'function feature10StatusMatches(track,filter)',
  'data-content-rating',
  'CONTENU NON VÉRIFIÉ',
  "feature10VersionPill.textContent='v5.0'"
]) {
  assert.ok(managerUI.includes(required), `Track Manager Feature 10 UI is missing ${required}.`);
}

const pwa = read('js/features/pwa.js');
for (const required of [
  "window.addEventListener('beforeinstallprompt'",
  'pwa-install-banner',
  'Install the app',
  'fetchRemoteRelease',
  'release-check',
  "window.addEventListener('focus'",
  "window.addEventListener('pageshow'",
  'ACTIVATION_TIMEOUT_MS',
  'completeWithReload',
  'bannerHide(banner, { immediate: true })'
]) {
  assert.ok(pwa.includes(required), `PWA Feature 10 is missing ${required}.`);
}

const serviceWorker = read('sw.js');
for (const required of [
  './css/feature-10.css',
  './js/core/editorial-normalization.js',
  './js/features/content-advisory-badges.js',
  "url.pathname.endsWith('/js/build-config.js')",
  'freshBuildMetadata'
]) {
  assert.ok(serviceWorker.includes(required), `Feature 10 service worker is missing ${required}.`);
}

const build = read('js/build-config.js');
assert.ok(build.includes("display: '2026.08.05.11'"));
assert.ok(build.includes("release: 'feature-10-extra-suite-20260805'"));

console.log('Feature 10 tag normalization, smart Track Manager parsing, status UI, update recovery and install promotion are valid.');
