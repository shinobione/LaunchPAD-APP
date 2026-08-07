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
for (const forbidden of ['hex-reactor', 'drawHexReactor', 'hexPath']) assert.ok(!visuals.includes(forbidden));

const coreVisuals = read('js/features/visual/visual-engine-core-modes.js');
for (const required of [
  'drawAuroraGlassMode(', 'drawNeonShatterAdaptiveMode(', 'drawLiquidChromeLiveMode(', 'drawSingularityLiveMode(',
  'const rawBass = bandAverage(', 'const beatDrive = clamp(',
  'const radialDrive = .72 + value * .82', 'const spectralLift = (spectral - bandValue * .36)',
  'const fragments = mobile ? 22 : 54'
]) assert.ok(coreVisuals.includes(required), `Audio Lab signal-first renderer is missing ${required}.`);
assert.ok(!fs.existsSync('js/features/visual/visual-engine-hex-reactor.js'));

const liveVisuals = read('js/features/visual/visual-engine-live.js');
for (const required of [
  "const DEFAULT_MODE = 'neon-shatter'",
  "{ id: 'spectrum', label: 'Spectrum' }",
  "{ id: 'neon-shatter', label: 'Neon Shatter', renderer: drawNeonShatterAdaptiveMode }",
  "{ id: 'aurora-glass', label: 'Aurora Glass', renderer: drawAuroraGlassMode }",
  "{ id: 'liquid-chrome', label: 'Liquid Chrome', renderer: drawLiquidChromeLiveMode }",
  "{ id: 'singularity', label: 'Singularity', renderer: drawSingularityLiveMode }",
  'readAudioLabSpectrum(raw)', 'readAudioLabAmplitude(waveform)',
  'createAmplitudeDynamicsTracker',
  'renderMode(labCanvas, customRenderer, raw, getAccent, time, features, mode)',
  'function boostLiveFeatures(features)',
  "dataset.audioLabRenderer = 'signal-first-v9'",
  'CUSTOM_MOBILE_FRAME_INTERVAL = 1000 / 60', 'const TELEMETRY_INTERVAL = 120'
]) assert.ok(liveVisuals.includes(required), `Live Audio Lab renderer is missing ${required}.`);
for (const forbidden of ['wave-cathedral', "id: 'circle'", "'bars'", 'hex-reactor', 'drawHexReactorMode', 'shapeReactiveSpectrum(raw, shaped, features)']) assert.ok(!liveVisuals.includes(forbidden));

const reactivity = read('js/features/visual/audio-reactivity.js');
for (const required of ['createAudioReactivityTracker','createAmplitudeDynamicsTracker','readFrequencyBands','shapeReactiveSpectrum','const kickTarget = clamp(','const normalizedRms = clamp(']) {
  assert.ok(reactivity.includes(required), `Audio Lab reusable reactivity layer is missing ${required}.`);
}

const signal = read('js/features/audio-lab-signal.js');
for (const required of [
  'initAudioLabSignalBridge', 'readAudioLabSpectrum', 'readAudioLabAmplitude',
  'createDecodedSourceProxy', 'context.decodeAudioData(bytes.slice(0))',
  'context.createBufferSource()',
  "document.documentElement.dataset.audioGraph = 'html5-direct-plus-decoded-buffer-metering'",
  "audio.dataset.audioPlaybackPath = 'html5-direct'",
  "audio.dataset.audioAnalysisPath = 'decoded-buffer'",
  "audio.addEventListener('playing', recover)", "window.addEventListener('shinobi:route-change'",
  'async function suspendContexts()', "document.documentElement.dataset.audioLabSignal"
]) assert.ok(signal.includes(required), `Audio Lab signal recovery is missing ${required}.`);
assert.ok(!signal.includes('captureStream('));
assert.ok(!signal.includes('createMediaStreamSource('));
assert.ok(!signal.includes('data.audioLabMirror'));

const bridge = read('js/features/visual/visual-engine.js');
assert.equal(bridge.trim(), "export { createVisualController } from './visual-engine-live.js';");

const manager = read('cloudflare/admin-worker.parts/19-phase-13-visuals-palette-filters.inject.part');
for (const required of ["TRACK_MANAGER_PHASE_13_VERSION='5.5'",'function phase13ChooseThemeColors(candidates)','metrics.value>=.35','phase13HueDistance(primary.metrics.hue,candidate.metrics.hue)>=55','Sans lyrics','Lyrics non timestampées',"phase13VersionPill.textContent='v5.5'"]) {
  assert.ok(manager.includes(required), `Track Manager Phase 13 is missing ${required}.`);
}

const engine = read('js/app-engine.js');
assert.ok(engine.includes("import(versioned('./features/audio-lab-signal.js'))"));
assert.ok(engine.includes('initAudioLabSignalBridge({ audio });'));
assert.ok(engine.includes("import(versioned('./features/feature-13.js'))"));
assert.ok(engine.includes('initPhase13({ audio });'));

const worker = read('sw.js');
for (const required of ["'./js/features/audio-lab-signal.js'","'./js/features/feature-13.js'","'./js/features/visual/audio-reactivity.js'","'./js/features/visual/visual-engine-v2.js'","'./js/features/visual/visual-engine-core-modes.js'","'./js/features/visual/visual-engine-live.js'","event.data?.type === 'GET_RELEASE'"]) assert.ok(worker.includes(required));

const build = assertCurrentBuild('Phase 13/current release');
assert.ok(build.number >= 49, `Unexpected pre-Phase-13 build ${build.display}.`);
assert.ok(build.release, 'Current release metadata is required.');

await import('./test-milestone-4.mjs');
await import('./test-milestone-6.mjs');
console.log(`Phase 13 remains valid with isolated decoded FFT and signal-first custom visuals under ${build.display}.`);
