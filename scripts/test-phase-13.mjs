import assert from 'node:assert/strict';
import fs from 'node:fs';
import { assertCurrentBuild } from './lib/build-metadata.mjs';

const read = path => fs.readFileSync(path, 'utf8');

const feature = read('js/features/feature-13.js');
for (const required of [
  "const TRACK_ROUTE_PREFIX = '#track='",
  'function setStyleIfChanged(',
  'function applyTrackDetailPalette()',
  "changed = setStyleIfChanged(view, '--accent', accent) || changed;",
  "changed = setStyleIfChanged(view, '--accent2', accent2) || changed;",
  'const expectedTitle = `${track.title} — Track details — SHINOBIWAN`;',
  "new MutationObserver(synchronize).observe(view",
  "audio?.addEventListener('play', synchronize)",
  'export function initPhase13'
]) assert.ok(feature.includes(required), `Phase 13 local theme hotfix is missing ${required}.`);

const visuals = read('js/features/visual/visual-engine-v2.js');
for (const required of [
  "{ id: 'singularity', label: 'Singularity' }",
  "{ id: 'neon-shatter', label: 'Neon Shatter' }",
  "{ id: 'liquid-chrome', label: 'Liquid Chrome' }",
  "{ id: 'nebula', label: 'Nebula' }",
  'function drawSingularity(',
  'function drawNeonShatter(',
  'function drawLiquidChrome(',
  'function drawNebula(',
  'const delegatedModeSet = new Set(delegatedModes)',
  'const delegated = delegatedModeSet.has(mode);',
  'if (homeActive && !externalHomeRenderer && !delegated)',
  'if (labActive && !delegated)'
]) assert.ok(visuals.includes(required), `Phase 13 Audio Lab base is missing ${required}.`);
for (const forbidden of ['hex-reactor', 'drawHexReactor', 'hexPath']) {
  assert.ok(!visuals.includes(forbidden), `Retired Hex Reactor code leaked into Phase 13: ${forbidden}.`);
}

const coreVisuals = read('js/features/visual/visual-engine-core-modes.js');
for (const required of [
  'drawAuroraGlassMode(',
  'drawNeonShatterAdaptiveMode(',
  'const transient = clamp(Math.max(kick, peak))',
  'const spectralIndex = Math.min(',
  'const spectralRipple = Math.sin(',
  'const fragments = mobile ? 20 : 52'
]) assert.ok(coreVisuals.includes(required), `Audio Lab adaptive renderer is missing ${required}.`);
for (const forbidden of ['drawOrbitMode', 'drawWaveCathedralMode', 'Wave Cathedral', 'Orbit']) {
  assert.ok(!coreVisuals.includes(forbidden), `Retired custom renderer leaked into Phase 13: ${forbidden}.`);
}
assert.ok(!fs.existsSync('js/features/visual/visual-engine-hex-reactor.js'));

const liveVisuals = read('js/features/visual/visual-engine-live.js');
for (const required of [
  "const DEFAULT_MODE = 'neon-shatter'",
  "{ id: 'spectrum', label: 'Spectrum' }",
  "{ id: 'neon-shatter', label: 'Neon Shatter', renderer: drawNeonShatterAdaptiveMode }",
  "{ id: 'aurora-glass', label: 'Aurora Glass', renderer: drawAuroraGlassMode }",
  'externalHomeRenderer: false',
  'readAudioLabSpectrum(raw)',
  'readAudioLabAmplitude(waveform)',
  'createAmplitudeDynamicsTracker',
  'shapeReactiveSpectrum(raw, shaped, features)',
  "homeTitle.textContent = 'Neon Shatter'",
  "new CustomEvent('shinobi:visual-mode'",
  "dataset.audioLabRenderer = 'hybrid-reactive-v7'",
  'CUSTOM_MOBILE_FRAME_INTERVAL = 1000 / 60',
  'const TELEMETRY_INTERVAL = 120'
]) assert.ok(liveVisuals.includes(required), `Live Audio Lab renderer is missing ${required}.`);
for (const forbidden of ['wave-cathedral', "id: 'circle'", "'bars'", 'hex-reactor', 'drawHexReactorMode']) {
  assert.ok(!liveVisuals.includes(forbidden), `Retired Audio Lab route leaked into Phase 13: ${forbidden}.`);
}

const reactivity = read('js/features/visual/audio-reactivity.js');
for (const required of [
  'createAudioReactivityTracker',
  'createAmplitudeDynamicsTracker',
  'readFrequencyBands',
  'shapeReactiveSpectrum',
  'const kickTarget = clamp(',
  'const normalizedRms = clamp('
]) assert.ok(reactivity.includes(required), `Audio Lab reusable reactivity layer is missing ${required}.`);

const signal = read('js/features/audio-lab-signal.js');
for (const required of [
  'initAudioLabSignalBridge',
  'readAudioLabSpectrum',
  'readAudioLabAmplitude',
  'synthesizePlaybackSpectrum',
  'waveformToSpectrum',
  'createCaptureSourceProxy',
  'context.createMediaStreamSource(scopedStream)',
  "document.documentElement.dataset.audioGraph = 'html5-direct-plus-capture-metering'",
  "audio.dataset.audioPlaybackPath = 'html5-direct'",
  "audio.addEventListener('playing', recover)",
  'async function suspendContexts()',
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
assert.ok(engine.includes("'css/admin-tools.css'"));

const worker = read('sw.js');
assert.ok(worker.includes("'./js/features/audio-lab-signal.js'"));
assert.ok(worker.includes("'./js/features/feature-13.js'"));
assert.ok(worker.includes("'./js/features/visual/audio-reactivity.js'"));
assert.ok(worker.includes("'./js/features/visual/visual-engine-v2.js'"));
assert.ok(worker.includes("'./js/features/visual/visual-engine-core-modes.js'"));
assert.ok(worker.includes("'./js/features/visual/visual-engine-live.js'"));
assert.ok(worker.includes("'./css/admin-tools.css'"));
assert.ok(worker.includes("event.data?.type === 'GET_RELEASE'"));
assert.ok(!worker.includes('visual-engine-hex-reactor.js'));

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

const build = assertCurrentBuild('Phase 13 / Build 45');
assert.equal(build.number, 45);
assert.equal(build.release, 'audio-background-stability-20260807');

await import('./test-milestone-4.mjs');
await import('./test-milestone-6.mjs');

console.log('Phase 13 palette and Audio Lab visuals remain valid with background-safe metering under Build 45.');
