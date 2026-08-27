import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import { assertCurrentBuild } from './lib/build-metadata.mjs';

const read = path => fs.readFileSync(path, 'utf8').replace(/\r\n/g, '\n');
const bridge = read('js/features/visual/visual-engine.js').trim();
assert.equal(bridge, "export { createVisualController } from './visual-engine-live.js';");

const retiredIds = [
  'aurora-glass', 'nebula', 'singularity', 'prism-tunnel', 'cyber-rain',
  'quantum-grid', 'tesla-veins', 'hyperdrive', 'wave-cathedral', 'hex-reactor'
];

const registry = read('js/features/visual/audio-lab-registry.js');
for (const required of [
  "const AUDIO_LAB_DEFAULT_MODE = 'neon-shatter'",
  "id: 'neon-shatter', label: 'Neon Shatter'", "id: 'spectrum', label: 'Spectrum'",
  "id: 'neon-ribbon', label: 'Neon Ribbon'", "id: 'liquid-chrome', label: 'Liquid Chrome'",
  "id: 'pulse-reactor', label: 'Pulse Reactor'", "id: 'bass-fracture', label: 'Bass Fracture'",
  "id: 'gravity-lens', label: 'Signal Bloom'", "id: 'bio-structure', label: 'Bio Structure'",
  "id: 'void-bloom', label: 'Silk Flow'", "id: 'creep-signal', label: 'Creep Signal'",
  "AUDIO_LAB_SANCTUARY_IDS = Object.freeze(['spectrum'])"
]) assert.ok(registry.includes(required), `Audio Lab registry is missing ${required}.`);
for (const forbidden of retiredIds) assert.ok(!registry.includes(forbidden), `Retired preset leaked into registry: ${forbidden}.`);
assert.equal((registry.match(/id: '[^']+'/g) || []).length, 10, 'Audio Lab must expose exactly ten validated presets.');

const live = read('js/features/visual/visual-engine-live.js');
for (const required of [
  "{ id: 'neon-shatter', label: 'Neon Shatter', renderer: drawNeonShatterV2Mode }",
  "{ id: 'neon-ribbon', label: 'Neon Ribbon', renderer: drawNeonRibbonMode }",
  "{ id: 'liquid-chrome', label: 'Liquid Chrome', renderer: drawLiquidChromeV2Mode }",
  "{ id: 'pulse-reactor', label: 'Pulse Reactor', renderer: drawPulseReactorMode }",
  "{ id: 'bass-fracture', label: 'Bass Fracture', renderer: drawBassFractureMode }",
  "{ id: 'gravity-lens', label: 'Signal Bloom', renderer: drawSignalBloomMode }",
  "{ id: 'bio-structure', label: 'Bio Structure', renderer: drawBioStructureMode }",
  "{ id: 'void-bloom', label: 'Silk Flow', renderer: drawVoidBloomMode }",
  "{ id: 'creep-signal', label: 'Creep Signal', renderer: drawCreepSignalMode }",
  "{ id: 'spectrum', label: 'Spectrum' }", "{ id: 'neon-ribbon', label: 'Neon Ribbon' }",
  'base.readSpectrum?.(raw)', 'reading = readAudioLabSpectrum(raw)',
  "const KINETIC_MODE_IDS = new Set(['pulse-reactor', 'bass-fracture', 'gravity-lens', 'bio-structure', 'void-bloom', 'creep-signal'])",
  'function createAdaptiveLowPunchTracker()', 'relativeContrast', 'relativeFlux', 'relativeRise',
  'function createDirectVisualImpactTracker()', 'function applyDirectKineticImpact(context, width, height, mode, features)',
  'features.visualImpact = visualImpactTracker.update(features)', 'data.audioLabVisualImpact = values[6]',
  'function kineticImpactFeatures(mode, features)', 'features.punch = adaptivePunch.punch', "mode === 'creep-signal'",
  "document.documentElement.dataset.audioLabRenderer = 'ten-core-v1'",
  "document.documentElement.dataset.audioLabPresetCount = '10'",
  "mode === 'bass-fracture' || mode === 'gravity-lens' || mode === 'bio-structure' || mode === 'void-bloom' || mode === 'creep-signal' ? 1.05"
]) assert.ok(live.includes(required), `Audio Lab integration is missing ${required}.`);

const core = read('js/features/visual/visual-engine-core-modes.js');
for (const required of ['export function drawNeonShatterV2Mode(', 'export function drawLiquidChromeV2Mode(', 'const gatedDrift = time * activity * .16', 'const phase = time * activity * .2']) {
  assert.ok(core.includes(required), `Validated baseline renderer is missing ${required}.`);
}

const motion = read('js/features/visual/motion-spring.js');
for (const required of [
  'export function beginMotionFrame(', 'export function springChannel(', 'export function shapeAudioDrive(',
  'export function advanceMotionPhase(', 'phases: new Map()', 'state.phase += state.speed * frame.dt'
]) assert.ok(motion.includes(required), `Motion helper is missing ${required}.`);

const reactor = read('js/features/visual/pulse-reactor.js');
for (const required of [
  'export function drawPulseReactorMode(', 'shapeAudioDrive(', 'const ringCount = mobile ? 3 : 4',
  'const segmentCount = mobile ? 14 : 24', "springChannel(motion, 'impact'",
  "advanceMotionPhase(motion, 'reactor-flow'", 'const centerTravel =', 'const driftX ='
]) assert.ok(reactor.includes(required), `Pulse Reactor contract is missing ${required}.`);

const fracture = read('js/features/visual/bass-fracture.js');
for (const required of [
  'export function drawBassFractureMode(', 'shapeAudioDrive(', 'const motionScale = mobile ? 1.66 : 1.34',
  'const layerCount = mobile ? 2 : 3', 'const sectorCount = mobile ? 12 : 16', 'const crackCount = mobile ? 8 : 12',
  "springChannel(motion, 'rupture'", "advanceMotionPhase(motion, 'tectonic-flow'", 'const bodyTravel ='
]) assert.ok(fracture.includes(required), `Bass Fracture contract is missing ${required}.`);

const lens = read('js/features/visual/gravity-lens.js');
for (const required of [
  'export function drawGravityLensMode(', 'shapeAudioDrive(', 'const bandCount = mobile ? 4 : 6',
  'const arcCount = mobile ? 12 : 20', 'const streamCount = mobile ? 8 : 14',
  "springChannel(motion, 'warp'", "advanceMotionPhase(motion, 'gravity-flow'", 'const centerTravel =', 'context.quadraticCurveTo('
]) assert.ok(lens.includes(required), `Gravity Lens rollback renderer is missing ${required}.`);

const signalBloom = read('js/features/visual/signal-bloom.js');
for (const required of [
  'export function drawSignalBloomMode(', 'shapeAudioDrive(', "springChannel(motion, 'signal-bloom-spread'",
  "advanceMotionPhase(motion, 'signal-bloom-flow'", 'const lineCount = mobile ? 16 : 28',
  'const bundleCount = 4', 'context.bezierCurveTo(', 'const waveFront ='
]) assert.ok(signalBloom.includes(required), `Signal Bloom contract is missing ${required}.`);
assert.ok(!signalBloom.includes('shadowBlur ='), 'Signal Bloom must stay bloom-free and crisp.');

const glass = read('js/features/visual/kinetic-glass.js');
for (const required of [
  'export function drawKineticGlassMode(', 'shapeAudioDrive(', "springChannel(motion, 'glass-pressure'",
  "advanceMotionPhase(motion, 'kinetic-glass-flow'", 'const plateCount = mobile ? 6 : 9',
  'plates.sort((a, b) => a.depth - b.depth)', 'function plateGeometry(', 'function drawPlate('
]) assert.ok(glass.includes(required), `Kinetic Glass rollback contract is missing ${required}.`);

const bio = read('js/features/visual/bio-structure.js');
for (const required of [
  'export function drawBioStructureMode(', 'shapeAudioDrive(', 'const ribCount = mobile ? 5 : 8',
  'const veinCount = mobile ? 8 : 14', 'const nodeCount = mobile ? 6 : 9',
  "springChannel(motion, 'breath'", "advanceMotionPhase(motion, 'bio-flow'", 'const driftRadius =', 'context.quadraticCurveTo('
]) assert.ok(bio.includes(required), `Bio Structure contract is missing ${required}.`);

const bloom = read('js/features/visual/void-bloom.js');
for (const required of [
  'export function drawVoidBloomMode(', 'shapeAudioDrive(', 'const petalCount = mobile ? 7 : 11',
  'const veinCount = mobile ? 7 : 16', "springChannel(motion, 'open'", "advanceMotionPhase(motion, 'void-bloom-flow'",
  'const driftRadius =', 'const globalTilt =', 'context.bezierCurveTo(', 'context.quadraticCurveTo('
]) assert.ok(bloom.includes(required), `Silk Flow compatibility contract is missing ${required}.`);

const creep = read('js/features/visual/creep-signal.js');
for (const required of [
  'export function drawCreepSignalMode(', 'shapeAudioDrive(', 'const nodeCount = mobile ? 9 : 14',
  'const branchCount = mobile ? 6 : 10', 'const pulseCount = mobile ? 7 : 12',
  "springChannel(motion, 'mass'", "advanceMotionPhase(motion, 'creep-flow'", 'const forwardDrift =',
  'context.quadraticCurveTo(', 'context.lineTo('
]) assert.ok(creep.includes(required), `Creep Signal contract is missing ${required}.`);

const ribbon = read('js/features/visual/neon-ribbon.js');
for (const required of [
  'export function drawNeonRibbonMode(', 'function sampleRibbonEnergy(',
  'const barCount = mobile ? 58 : compact ? 84 : 118', 'rainbowGradient(context, width, time)',
  'const reflectionHeight =', 'features.punch'
]) assert.ok(ribbon.includes(required), `Neon Ribbon contract is missing ${required}.`);

for (const isolated of [reactor, fracture, lens, signalBloom, glass, bio, bloom, creep, ribbon]) {
  assert.ok(!isolated.includes('setInterval('));
  assert.ok(!isolated.includes('requestAnimationFrame('));
  assert.ok(!isolated.includes('Math.random('));
  assert.ok(!isolated.includes('shapeMotionTarget('));
}

const base = read('js/features/visual/visual-engine-v2.js');
function extractFunction(source, name) {
  const start = source.indexOf(`  function ${name}(`);
  assert.ok(start >= 0, `Protected renderer ${name} is missing.`);
  const brace = source.indexOf('{', start);
  let depth = 0;
  for (let index = brace; index < source.length; index += 1) {
    if (source[index] === '{') depth += 1;
    if (source[index] === '}' && --depth === 0) return source.slice(start, index + 1).replace(/^  /gm, '');
  }
  throw new Error(`Protected renderer ${name} is malformed.`);
}
const spectrumHash = '25a86e3763b668fc69734d48439a2c93745ef927a3fcbdddaf2d0f29e0371813';
const actualSpectrumHash = crypto.createHash('sha256').update(extractFunction(base, 'drawSpectrum')).digest('hex');
assert.equal(actualSpectrumHash, spectrumHash, 'Spectrum is the known-good reference renderer and must remain unchanged.');

const signal = read('js/features/audio-lab-signal.js');
for (const required of ['function createDecodedSourceProxy(context, audio)', 'context.decodeAudioData(bytes.slice(0))', 'context.createBufferSource()', "audio.dataset.audioPlaybackPath = 'html5-direct'"]) {
  assert.ok(signal.includes(required), `Decoded-buffer isolation layer is missing ${required}.`);
}
assert.ok(!signal.includes('captureStream('));
assert.ok(!signal.includes('createMediaStreamSource('));

const worker = read('sw.js');
for (const required of [
  "'./js/features/visual/audio-reactivity.js'", "'./js/features/visual/audio-lab-registry.js'",
  "'./js/features/visual/motion-spring.js'", "'./js/features/visual/pulse-reactor.js'",
  "'./js/features/visual/bass-fracture.js'", "'./js/features/visual/gravity-lens.js'", "'./js/features/visual/signal-bloom.js'", "'./js/features/visual/kinetic-glass.js'",
  "'./js/features/visual/bio-structure.js'", "'./js/features/visual/void-bloom.js'", "'./js/features/visual/creep-signal.js'",
  "'./js/features/visual/neon-ribbon.js'"
]) assert.ok(worker.includes(required), `PWA shell is missing ${required}.`);

const build = assertCurrentBuild('Audio Lab current build');
assert.ok(build.number >= 61, `Audio Lab ten-preset baseline requires Build 61 or newer, got ${build.display}.`);
console.log(`Audio Lab exposes ten shared-FFT presets including Signal Bloom, Silk Flow and Neon Ribbon under ${build.display}.`);