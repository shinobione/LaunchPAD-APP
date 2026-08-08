import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = path => fs.readFileSync(path, 'utf8');
const live = read('js/features/visual/visual-engine-live.js');

for (const required of [
  "const DEFAULT_MODE = 'neon-shatter'",
  "{ id: 'neon-shatter', label: 'Neon Shatter', renderer: drawNeonShatterV2Mode }",
  "{ id: 'spectrum', label: 'Spectrum' }",
  "{ id: 'liquid-chrome', label: 'Liquid Chrome', renderer: drawLiquidChromeV2Mode }",
  "{ id: 'pulse-reactor', label: 'Pulse Reactor', renderer: drawPulseReactorMode }",
  "{ id: 'bass-fracture', label: 'Bass Fracture', renderer: drawBassFractureMode }",
  "{ id: 'gravity-lens', label: 'Gravity Lens', renderer: drawGravityLensMode }",
  "{ id: 'bio-structure', label: 'Bio Structure', renderer: drawBioStructureMode }",
  'base.readSpectrum?.(raw)',
  'reading = readAudioLabSpectrum(raw)',
  'boostLiveFeatures(features)',
  "mode === 'bass-fracture' || mode === 'gravity-lens' || mode === 'bio-structure' ? 1.05",
  "document.documentElement.dataset.audioLabRenderer = 'seven-core-v1'",
  "document.documentElement.dataset.audioLabPresetCount = '7'",
  'const CUSTOM_FRAME_INTERVAL = 1000 / 60'
]) assert.ok(live.includes(required), `Live Audio Lab integration is missing ${required}.`);

for (const forbidden of [
  'aurora-glass', 'nebula', 'singularity', "'bars'", 'wave-cathedral',
  "id: 'circle'", 'hex-reactor', 'synthesizePlaybackSpectrum', 'readAudioLabAmplitude'
]) assert.ok(!live.includes(forbidden), `Retired/parallel Audio Lab path leaked into live integration: ${forbidden}.`);

const core = read('js/features/visual/visual-engine-core-modes.js');
for (const required of ['drawNeonShatterV2Mode', 'drawLiquidChromeV2Mode', 'const gatedDrift = time * activity * .16', 'const phase = time * activity * .2']) {
  assert.ok(core.includes(required), `Validated baseline renderer is missing ${required}.`);
}

const motion = read('js/features/visual/motion-spring.js');
for (const required of ['const FRAME_STATES = new WeakMap()', 'export function beginMotionFrame(', 'export function springChannel(', 'export function motionPhase(', 'channel.velocity']) {
  assert.ok(motion.includes(required), `Shared motion helper is missing ${required}.`);
}

const reactor = read('js/features/visual/pulse-reactor.js');
for (const required of [
  "from './motion-spring.js'", 'beginMotionFrame(context, time)', "springChannel(motion, 'impact'", 'motionPhase(time, activity, .31)',
  'const ringCount = mobile ? 3 : 4', 'const segmentCount = mobile ? 14 : 24',
  'const spokeCount = mobile ? 10 : 18', 'const shardCount = mobile ? 4 : 7',
  'const elasticWobble = Math.sin(', 'const spokeSway = Math.sin('
]) assert.ok(reactor.includes(required), `Pulse Reactor elasticity contract is missing ${required}.`);

const fracture = read('js/features/visual/bass-fracture.js');
for (const required of [
  "from './motion-spring.js'", 'beginMotionFrame(context, time)', "springChannel(motion, 'rupture'", 'motionPhase(time, activity, .22)',
  'const motionScale = mobile ? 1.58 : 1.18', 'const layerCount = mobile ? 2 : 3',
  'const sectorCount = mobile ? 12 : 16', 'const crackCount = mobile ? 8 : 12',
  'const crackPropagation = clamp(', 'const sway = Math.sin('
]) assert.ok(fracture.includes(required), `Bass Fracture elasticity/mobile contract is missing ${required}.`);

const lens = read('js/features/visual/gravity-lens.js');
for (const required of [
  "from './motion-spring.js'", 'beginMotionFrame(context, time)', "springChannel(motion, 'warp'", 'motionPhase(time, activity, .17)',
  'const bandCount = mobile ? 4 : 6', 'const arcCount = mobile ? 12 : 20',
  'const streamCount = mobile ? 8 : 14', 'const breathing = Math.sin(', 'const streamDrift = Math.sin(',
  'context.quadraticCurveTo('
]) assert.ok(lens.includes(required), `Gravity Lens elasticity contract is missing ${required}.`);

const bio = read('js/features/visual/bio-structure.js');
for (const required of [
  'export function drawBioStructureMode(', "from './motion-spring.js'", 'beginMotionFrame(context, time)',
  "springChannel(motion, 'breath'", 'motionPhase(time, activity, .24)',
  'const ribCount = mobile ? 5 : 8', 'const veinCount = mobile ? 8 : 14',
  'const nodeCount = mobile ? 6 : 9', 'context.quadraticCurveTo(', 'const membranePulse = Math.sin('
]) assert.ok(bio.includes(required), `Bio Structure FFT/mobile contract is missing ${required}.`);

for (const isolated of [reactor, fracture, lens, bio]) {
  assert.ok(!isolated.includes('requestAnimationFrame('));
  assert.ok(!isolated.includes('setInterval('));
  assert.ok(!isolated.includes('Math.random('));
}

const base = read('js/features/visual/visual-engine-v2.js');
for (const required of ['function readSpectrum(target)', 'analyser.getByteFrequencyData(target)', 'function drawSpectrum(', 'return { resume, setMode, readSpectrum }']) {
  assert.ok(base.includes(required), `Shared Spectrum analyser contract is missing ${required}.`);
}

const bridge = read('js/features/visual/visual-engine.js').trim();
assert.equal(bridge, "export { createVisualController } from './visual-engine-live.js';");
console.log('Build 55 Audio Lab keeps Spectrum-shared FFT, adds spring elasticity and introduces mobile-budgeted Bio Structure.');
