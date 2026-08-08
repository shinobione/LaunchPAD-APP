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
  "{ id: 'spectrum', label: 'Spectrum' }",
  "let mode = 'spectrum'",
  'function drawSpectrum(',
  'function readSpectrum(target)',
  'analyser.getByteFrequencyData(target)',
  'const delegatedModeSet = new Set(delegatedModes)',
  'const delegated = delegatedModeSet.has(mode);',
  "if (mode === 'spectrum' && homeActive && !externalHomeRenderer && !delegated)",
  "if (mode === 'spectrum' && labActive && !delegated)",
  'return { resume, setMode, readSpectrum }'
]) assert.ok(visuals.includes(required), `Phase 13 Spectrum reference engine is missing ${required}.`);
for (const forbidden of ['drawSingularity(', 'drawNeonShatter(', 'drawLiquidChrome(', 'drawNebula(', 'hex-reactor']) {
  assert.ok(!visuals.includes(forbidden), `Retired base Audio Lab renderer remains: ${forbidden}`);
}

const coreVisuals = read('js/features/visual/visual-engine-core-modes.js');
for (const required of [
  'drawNeonShatterV2Mode(', 'drawLiquidChromeV2Mode(',
  'const impact = clamp(', 'const pulse = clamp(',
  'const gatedDrift = time * activity * .16',
  'const phase = time * activity * .2',
  'const distance = baseDistance * (.58 + impact * 1.48 + localDrive * .92)',
  'spectralDeform = spectral * .092 + neighbour * .032'
]) assert.ok(coreVisuals.includes(required), `Audio Lab FFT renderer is missing ${required}.`);
for (const forbidden of ['drawAuroraGlassMode', 'drawSingularityLiveMode', 'drawNeonShatterAdaptiveMode', 'drawLiquidChromeLiveMode']) {
  assert.ok(!coreVisuals.includes(forbidden), `Retired core renderer remains: ${forbidden}`);
}
assert.ok(!fs.existsSync('js/features/visual/visual-engine-hex-reactor.js'));

const reactor = read('js/features/visual/pulse-reactor.js');
for (const required of [
  'export function drawPulseReactorMode(',
  'const ringCount = mobile ? 3 : 4',
  'const segmentCount = mobile ? 14 : 24',
  'const spokeCount = mobile ? 10 : 18',
  'const shardCount = mobile ? 4 : 7',
  'const breakMask = clamp(',
  'const drift = time * activity * .055'
]) assert.ok(reactor.includes(required), `Pulse Reactor renderer is missing ${required}.`);

const fracture = read('js/features/visual/bass-fracture.js');
for (const required of [
  'export function drawBassFractureMode(',
  'const motionScale = mobile ? 1.42 : 1.08',
  'const layerCount = mobile ? 2 : 3',
  'const sectorCount = mobile ? 12 : 16',
  'const crackCount = mobile ? 8 : 12',
  'const drift = time * activity * .03'
]) assert.ok(fracture.includes(required), `Bass Fracture renderer is missing ${required}.`);

const lens = read('js/features/visual/gravity-lens.js');
for (const required of [
  'export function drawGravityLensMode(',
  'const bandCount = mobile ? 4 : 6',
  'const arcCount = mobile ? 12 : 20',
  'const streamCount = mobile ? 8 : 14',
  'const drift = time * activity * .032',
  'context.quadraticCurveTo('
]) assert.ok(lens.includes(required), `Gravity Lens renderer is missing ${required}.`);

const registry = read('js/features/visual/audio-lab-registry.js');
const presetCount = (registry.match(/Object\.freeze\(\{ id:/g) || []).length;
assert.equal(presetCount, 6, 'Phase 13 Audio Lab must expose the Build 54 six-preset set.');

const liveVisuals = read('js/features/visual/visual-engine-live.js');
for (const required of [
  "const DEFAULT_MODE = 'neon-shatter'",
  "{ id: 'neon-shatter', label: 'Neon Shatter', renderer: drawNeonShatterV2Mode }",
  "{ id: 'spectrum', label: 'Spectrum' }",
  "{ id: 'liquid-chrome', label: 'Liquid Chrome', renderer: drawLiquidChromeV2Mode }",
  "{ id: 'pulse-reactor', label: 'Pulse Reactor', renderer: drawPulseReactorMode }",
  "{ id: 'bass-fracture', label: 'Bass Fracture', renderer: drawBassFractureMode }",
  "{ id: 'gravity-lens', label: 'Gravity Lens', renderer: drawGravityLensMode }",
  'base.readSpectrum?.(raw)',
  'reading = readAudioLabSpectrum(raw)',
  'renderMode(labCanvas, customRenderer, raw, getAccent, time, features, mode)',
  'function boostLiveFeatures(features)',
  "dataset.audioLabRenderer = 'six-core-v1'",
  "dataset.audioLabPresetCount = '6'",
  "mode === 'bass-fracture' || mode === 'gravity-lens' ? 1.05",
  'const CUSTOM_FRAME_INTERVAL = 1000 / 60', 'const TELEMETRY_INTERVAL = 120'
]) assert.ok(liveVisuals.includes(required), `Live Audio Lab renderer is missing ${required}.`);
for (const forbidden of ['aurora-glass', 'nebula', 'singularity', 'wave-cathedral', "id: 'circle'", "'bars'", 'hex-reactor', 'readAudioLabAmplitude', 'createAmplitudeDynamicsTracker', 'synthesizePlaybackSpectrum']) {
  assert.ok(!liveVisuals.includes(forbidden), `Retired/parallel Audio Lab path remains: ${forbidden}`);
}

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
for (const required of [
  "'./js/features/audio-lab-signal.js'", "'./js/features/feature-13.js'",
  "'./js/features/visual/audio-reactivity.js'", "'./js/features/visual/visual-engine-v2.js'",
  "'./js/features/visual/visual-engine-core-modes.js'", "'./js/features/visual/pulse-reactor.js'",
  "'./js/features/visual/bass-fracture.js'", "'./js/features/visual/gravity-lens.js'",
  "'./js/features/visual/visual-engine-live.js'", "event.data?.type === 'GET_RELEASE'"
]) assert.ok(worker.includes(required));

const build = assertCurrentBuild('Phase 13/current release');
assert.ok(build.number >= 54, `Unexpected pre-Build-54 release ${build.display}.`);
assert.equal(build.release, 'gravity-lens-20260808');

await import('./test-milestone-4.mjs');
await import('./test-milestone-6.mjs');
console.log(`Phase 13 remains valid with the shared-FFT ${presetCount}-preset Audio Lab under ${build.display}.`);
