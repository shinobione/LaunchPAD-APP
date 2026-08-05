import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = path => fs.readFileSync(path, 'utf8');

const feature = read('js/features/feature-13.js');
for (const required of [
  "const TRACK_ROUTE_PREFIX = '#track='",
  'function applyTrackDetailPalette()',
  "view.style.setProperty('--accent', accent)",
  "view.style.setProperty('--accent2', accent2)",
  "document.title = `${track.title} — Track details — SHINOBIWAN`",
  "new MutationObserver(synchronize).observe(view",
  "audio?.addEventListener('play', synchronize)",
  'export function initPhase13'
]) assert.ok(feature.includes(required), `Phase 13 local theme hotfix is missing ${required}.`);

const visuals = read('js/features/visual/visual-engine-v2.js');
for (const required of [
  "{ id: 'singularity', label: 'Singularity' }",
  "{ id: 'neon-shatter', label: 'Neon Shatter' }",
  "{ id: 'hyperdrive', label: 'Hyperdrive' }",
  "{ id: 'tesla-veins', label: 'Tesla Veins' }",
  "{ id: 'liquid-chrome', label: 'Liquid Chrome' }",
  "{ id: 'hex-reactor', label: 'Hex Reactor' }",
  'function drawSingularity(',
  'function drawNeonShatter(',
  'function drawHyperdrive(',
  'function drawTeslaVeins(',
  'function drawLiquidChrome(',
  'function drawHexReactor(',
  "controls.querySelectorAll('[data-visual=\"vortex\"], [data-visual=\"pulse\"]')"
]) assert.ok(visuals.includes(required), `Phase 13 AudioLab is missing ${required}.`);
assert.ok(!visuals.includes("{ id: 'vortex', label: 'Vortex' }"));
assert.ok(!visuals.includes("{ id: 'pulse', label: 'Pulse' }"));

const bridge = read('js/features/visual/visual-engine.js');
assert.equal(bridge.trim(), "export { createVisualController } from './visual-engine-v2.js';");

const manager = read('cloudflare/admin-worker.parts/19-phase-13-visuals-palette-filters.inject.part');
for (const required of [
  "TRACK_MANAGER_PHASE_13_VERSION='5.5'",
  'function phase13ChooseThemeColors(candidates)',
  'metrics.value>=.35',
  'phase13HueDistance(primary.metrics.hue,candidate.metrics.hue)>=55',
  'Sans lyrics',
  'Lyrics non timestampées',
  "phase13VersionPill.textContent='v5.5'"
]) assert.ok(manager.includes(required), `Track Manager Phase 13 is missing ${required}.`);
assert.ok(!manager.includes('option value="missing-release">Sans date de sortie</option>'));

const engine = read('js/app-engine.js');
assert.ok(engine.includes("import(versioned('./features/feature-13.js'))"));
assert.ok(engine.includes('initPhase13({ audio });'));

const worker = read('sw.js');
assert.ok(worker.includes("'./js/features/feature-13.js'"));
assert.ok(worker.includes("'./js/features/visual/visual-engine-v2.js'"));

const build = read('js/build-config.js');
assert.ok(build.includes("display: '2026.08.05.15'"));
assert.ok(build.includes("release: 'phase-13-mobile-about-layout-20260805'"));
assert.ok(build.includes("cache: 'shinobi-launchpad-v15'"));

console.log('Phase 13 local palette, AudioLab visuals, color extraction, filters and mobile About layout are valid.');