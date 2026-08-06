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
  "{ id: 'liquid-chrome', label: 'Liquid Chrome' }",
  "{ id: 'hex-reactor', label: 'Hex Reactor' }",
  "{ id: 'nebula', label: 'Nebula' }",
  'function drawSingularity(',
  'function drawNeonShatter(',
  'function drawLiquidChrome(',
  'function drawHexReactor(',
  'function drawNebula(',
  'const allowedModes = new Set(',
  'if (!delegatedModeSet.has(mode))'
]) assert.ok(visuals.includes(required), `Phase 13 Audio Lab is missing ${required}.`);

const coreVisuals = read('js/features/visual/visual-engine-core-modes.js');
for (const required of [
  'drawOrbitMode(',
  'drawAuroraGlassMode(',
  'drawWaveCathedralMode(',
  'const bandSpeeds = [.105, .155, .225]',
  'const arches = width < 600 ? 7 : 10',
  'const apexGap = width * (.003 + localDrive * (.025 + (1 - progress) * .024))'
]) assert.ok(coreVisuals.includes(required), `Audio Lab calibrated renderer is missing ${required}.`);

const hexVisuals = read('js/features/visual/visual-engine-hex-reactor.js');
for (const required of [
  'drawHexReactorMode(',
  'const beatDrive = Math.pow(',
  'const counterFront = Math.max(',
  'for (let ring = 0; ring < 4; ring += 1)'
]) assert.ok(hexVisuals.includes(required), `Audio Lab Hex Reactor renderer is missing ${required}.`);

const liveVisuals = read('js/features/visual/visual-engine-live.js');
for (const required of [
  "const DEFAULT_MODE = 'wave-cathedral'",
  "import { drawHexReactorMode } from './visual-engine-hex-reactor.js'",
  "{ id: 'hex-reactor', label: 'Hex Reactor', renderer: drawHexReactorMode }",
  'readAudioLabSpectrum(raw)',
  'createAudioReactivityTracker',
  'shapeReactiveSpectrum(raw, shaped, features)',
  'renderMode(homeCanvas, drawWaveCathedralMode',
  "homeTitle.textContent = 'Wave Cathedral'",
  "dataset.audioLabRenderer = 'fft-mechanical-v3'"
]) assert.ok(liveVisuals.includes(required), `Live Audio Lab renderer is missing ${required}.`);

const reactivity = read('js/features/visual/audio-reactivity.js');
for (const required of [
  'createAudioReactivityTracker',
  'readFrequencyBands',
  'shapeReactiveSpectrum',
  'const kickTarget = clamp('
]) assert.ok(reactivity.includes(required), `Audio Lab reusable reactivity layer is missing ${required}.`);

const signal = read('js/features/audio-lab-signal.js');
for (const required of [
  'initAudioLabSignalBridge',
  'readAudioLabSpectrum',
  'synthesizePlaybackSpectrum',
  'waveformToSpectrum',
  "audio.addEventListener('playing', recover)",
  "markSignal('fallback')",
  "document.documentElement.dataset.audioLabSignal"
]) assert.ok(signal.includes(required), `Audio Lab signal recovery is missing ${required}.`);

const bridge = read('js/features/visual/visual-engine.js');
assert.equal(bridge.trim(), "export { createVisualController } from './visual-engine-live.js';");

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
assert.ok(engine.includes("import(versioned('./features/audio-lab-signal.js'))"));
assert.ok(engine.includes('initAudioLabSignalBridge({ audio });'));
assert.ok(engine.includes("import(versioned('./features/feature-13.js'))"));
assert.ok(engine.includes('initPhase13({ audio });'));

const worker = read('sw.js');
assert.ok(worker.includes("'./js/features/audio-lab-signal.js'"));
assert.ok(worker.includes("'./js/features/feature-13.js'"));
assert.ok(worker.includes("'./js/features/visual/audio-reactivity.js'"));
assert.ok(worker.includes("'./js/features/visual/visual-engine-v2.js'"));
assert.ok(worker.includes("'./js/features/visual/visual-engine-core-modes.js'"));
assert.ok(worker.includes("'./js/features/visual/visual-engine-hex-reactor.js'"));
assert.ok(worker.includes("'./js/features/visual/visual-engine-live.js'"));

const publicWorker = read('cloudflare/public-worker-v26.js');
for (const required of [
  'PUBLIC_WORKER_VERSION = 2.6',
  "headers.set('Access-Control-Allow-Origin', '*')",
  "headers.set('Cross-Origin-Resource-Policy', 'cross-origin')",
  "headers.set('X-LaunchPAD-Media-Version', String(PUBLIC_WORKER_VERSION))",
  "headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')",
  'payload.audioLabCors = true',
  "payload.crossOriginResourcePolicy = 'cross-origin'"
]) assert.ok(publicWorker.includes(required), `Public media Worker v2.6 is missing ${required}.`);

const build = read('js/build-config.js');
for (const required of [
  "display: '2026.08.05.16'",
  "release: 'audiolab-signal-recovery-20260805'",
  "cache: 'shinobi-launchpad-v16'",
  "display: '2026.08.05.22'",
  "release: 'audiolab-core-modes-fix-20260805'",
  "cache: 'shinobi-launchpad-v22'",
  "display: '2026.08.05.23'",
  "release: 'audiolab-showcase-five-20260805'",
  "cache: 'shinobi-launchpad-v23'",
  "display: '2026.08.05.24'",
  "release: 'audiolab-live-reactivity-20260805'",
  "cache: 'shinobi-launchpad-v24'",
  "display: '2026.08.06.25'",
  "release: 'audiolab-catalog-reactivity-20260806'",
  "cache: 'shinobi-launchpad-v25'",
  "display: '2026.08.06.26'",
  "release: 'audiolab-animation-calibration-20260806'",
  "cache: 'shinobi-launchpad-v26'"
]) assert.ok(build.includes(required), `Build history is missing ${required}.`);

console.log('Phase 13 palette, Audio Lab mechanical calibration and renderer sanctuary are valid.');
