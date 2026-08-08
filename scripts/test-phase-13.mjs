import assert from 'node:assert/strict';
import fs from 'node:fs';
import { assertCurrentBuild } from './lib/build-metadata.mjs';

const read = path => fs.readFileSync(path, 'utf8');
const requireAll = (source, values, label) => values.forEach(value => assert.ok(source.includes(value), `${label} is missing ${value}.`));

const feature = read('js/features/feature-13.js');
requireAll(feature, [
  "const TRACK_ROUTE_PREFIX = '#track='", 'function applyTrackDetailPalette()',
  'const expectedTitle = `${track.title} — Track details — SHINOBIWAN`;',
  "audio?.addEventListener('play', synchronize)", 'export function initPhase13'
], 'Phase 13 track detail');

const base = read('js/features/visual/visual-engine-v2.js');
requireAll(base, [
  "{ id: 'spectrum', label: 'Spectrum' }", 'function drawSpectrum(', 'function readSpectrum(target)',
  'analyser.getByteFrequencyData(target)', 'return { resume, setMode, readSpectrum }'
], 'Spectrum reference');

const core = read('js/features/visual/visual-engine-core-modes.js');
requireAll(core, ['drawNeonShatterV2Mode(', 'drawLiquidChromeV2Mode(', 'const gatedDrift = time * activity * .16', 'const phase = time * activity * .2'], 'Validated core visuals');

const motion = read('js/features/visual/motion-spring.js');
requireAll(motion, [
  'beginMotionFrame', 'springChannel', 'shapeAudioDrive', 'advanceMotionPhase',
  'phases: new Map()', 'state.phase += state.speed * frame.dt'
], 'Kinetic motion helper');

const reactor = read('js/features/visual/pulse-reactor.js');
requireAll(reactor, ['shapeAudioDrive(', "advanceMotionPhase(motion, 'reactor-flow'", 'const centerTravel =', 'const driftX =', 'const ringCount = mobile ? 3 : 4'], 'Pulse Reactor');
const fracture = read('js/features/visual/bass-fracture.js');
requireAll(fracture, ['shapeAudioDrive(', "advanceMotionPhase(motion, 'tectonic-flow'", 'const bodyTravel =', 'const motionScale = mobile ? 1.66 : 1.34', 'const sectorCount = mobile ? 12 : 16'], 'Bass Fracture');
const lens = read('js/features/visual/gravity-lens.js');
requireAll(lens, ['shapeAudioDrive(', "advanceMotionPhase(motion, 'gravity-flow'", 'const centerTravel =', 'const bandCount = mobile ? 4 : 6', 'context.quadraticCurveTo('], 'Gravity Lens');
const bio = read('js/features/visual/bio-structure.js');
requireAll(bio, ['shapeAudioDrive(', "advanceMotionPhase(motion, 'bio-flow'", 'const driftRadius =', 'const ribCount = mobile ? 5 : 8', 'context.quadraticCurveTo('], 'Bio Structure');
const bloom = read('js/features/visual/void-bloom.js');
requireAll(bloom, ['shapeAudioDrive(', "advanceMotionPhase(motion, 'void-bloom-flow'", 'const petalCount = mobile ? 7 : 11', 'const veinCount = mobile ? 7 : 16', 'context.bezierCurveTo('], 'Void Bloom');
const creep = read('js/features/visual/creep-signal.js');
requireAll(creep, ['shapeAudioDrive(', "advanceMotionPhase(motion, 'creep-flow'", 'const nodeCount = mobile ? 9 : 14', 'const branchCount = mobile ? 6 : 10', 'const pulseCount = mobile ? 7 : 12', 'context.quadraticCurveTo('], 'Creep Signal');

for (const isolated of [reactor, fracture, lens, bio, bloom, creep]) {
  assert.ok(!isolated.includes('Math.random('));
  assert.ok(!isolated.includes('requestAnimationFrame('));
  assert.ok(!isolated.includes('setInterval('));
  assert.ok(!isolated.includes('shapeMotionTarget('));
}

const registry = read('js/features/visual/audio-lab-registry.js');
const presetCount = (registry.match(/Object\.freeze\(\{ id:/g) || []).length;
assert.equal(presetCount, 9, 'Audio Lab must keep nine sanctioned presets.');

const live = read('js/features/visual/visual-engine-live.js');
requireAll(live, [
  "{ id: 'bio-structure', label: 'Bio Structure', renderer: drawBioStructureMode }",
  "{ id: 'void-bloom', label: 'Void Bloom', renderer: drawVoidBloomMode }",
  "{ id: 'creep-signal', label: 'Creep Signal', renderer: drawCreepSignalMode }",
  'base.readSpectrum?.(raw)', 'reading = readAudioLabSpectrum(raw)',
  'function createAdaptiveLowPunchTracker()', 'relativeContrast', 'relativeFlux', 'relativeRise',
  'function createDirectVisualImpactTracker()', 'function applyDirectKineticImpact(context, width, height, mode, features)',
  'features.visualImpact = visualImpactTracker.update(features)',
  'function kineticImpactFeatures(mode, features)', 'features.punch = adaptivePunch.punch',
  "dataset.audioLabRenderer = 'nine-core-v1'", "dataset.audioLabPresetCount = '9'",
  "mode === 'bass-fracture' || mode === 'gravity-lens' || mode === 'bio-structure' || mode === 'void-bloom' || mode === 'creep-signal' ? 1.05",
  'const CUSTOM_FRAME_INTERVAL = 1000 / 60'
], 'Live Audio Lab');

const signal = read('js/features/audio-lab-signal.js');
requireAll(signal, ['createDecodedSourceProxy', 'context.decodeAudioData(bytes.slice(0))', "audio.dataset.audioPlaybackPath = 'html5-direct'"], 'Audio isolation');
assert.ok(!signal.includes('captureStream('));
assert.ok(!signal.includes('createMediaStreamSource('));

const worker = read('sw.js');
requireAll(worker, ["'./js/features/visual/motion-spring.js'", "'./js/features/visual/bio-structure.js'", "'./js/features/visual/void-bloom.js'", "'./js/features/visual/creep-signal.js'", "event.data?.type === 'GET_RELEASE'"], 'PWA shell');

const build = assertCurrentBuild('Phase 13/current release');
assert.ok(build.number >= 61, `Unexpected pre-Build-61 release ${build.display}.`);

await import('./test-milestone-4.mjs');
await import('./test-milestone-6.mjs');
console.log(`Phase 13 remains valid with the shared-FFT ${presetCount}-preset kinetic Audio Lab plus direct impact under ${build.display}.`);
