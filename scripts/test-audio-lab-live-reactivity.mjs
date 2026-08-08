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
  "const KINETIC_MODE_IDS = new Set(['pulse-reactor', 'bass-fracture', 'gravity-lens', 'bio-structure'])",
  'base.readSpectrum?.(raw)', 'reading = readAudioLabSpectrum(raw)', 'boostLiveFeatures(features)',
  'function createAdaptiveLowPunchTracker()', 'relativeContrast', 'relativeFlux', 'relativeRise',
  'function createDirectVisualImpactTracker()', 'punchRise * 3.8', 'kickRise * 2.25', 'contrastRise * 6.5',
  'function applyDirectKineticImpact(context, width, height, mode, features)',
  "mode === 'pulse-reactor'", "mode === 'bass-fracture'", "mode === 'gravity-lens'", "mode === 'bio-structure'",
  'function kineticImpactFeatures(mode, features)', 'punch * 1.08', 'punch * .92',
  'features.punch = adaptivePunch.punch', 'features.visualImpact = visualImpactTracker.update(features)',
  'data.audioLabPunch = values[5]', 'data.audioLabVisualImpact = values[6]',
  "mode === 'bass-fracture' || mode === 'gravity-lens' || mode === 'bio-structure' ? 1.05",
  "document.documentElement.dataset.audioLabRenderer = 'seven-core-v4'",
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
for (const required of [
  'const FRAME_STATES = new WeakMap()', 'phases: new Map()', 'export function beginMotionFrame(', 'export function springChannel(',
  'export function shapeAudioDrive(', 'export function advanceMotionPhase(', 'state.phase += state.speed * frame.dt',
  'const targetSpeed = drive > gate', 'channel.velocity'
]) assert.ok(motion.includes(required), `Shared kinetic-motion helper is missing ${required}.`);

const reactor = read('js/features/visual/pulse-reactor.js');
for (const required of [
  'shapeAudioDrive(', 'beginMotionFrame(context, time)', "springChannel(motion, 'impact'", "advanceMotionPhase(motion, 'reactor-flow'",
  'const centerTravel =', 'const driftX =', 'const ringCount = mobile ? 3 : 4', 'const segmentCount = mobile ? 14 : 24',
  'const spokeCount = mobile ? 10 : 18', 'const shardCount = mobile ? 4 : 7'
]) assert.ok(reactor.includes(required), `Pulse Reactor kinetic contract is missing ${required}.`);

const fracture = read('js/features/visual/bass-fracture.js');
for (const required of [
  'shapeAudioDrive(', 'beginMotionFrame(context, time)', "springChannel(motion, 'rupture'", "advanceMotionPhase(motion, 'tectonic-flow'",
  'const motionScale = mobile ? 1.66 : 1.34', 'const bodyTravel =', 'const bodyRotation =',
  'const layerCount = mobile ? 2 : 3', 'const sectorCount = mobile ? 12 : 16', 'const crackCount = mobile ? 8 : 12'
]) assert.ok(fracture.includes(required), `Bass Fracture kinetic/mobile contract is missing ${required}.`);

const lens = read('js/features/visual/gravity-lens.js');
for (const required of [
  'shapeAudioDrive(', 'beginMotionFrame(context, time)', "springChannel(motion, 'warp'", "advanceMotionPhase(motion, 'gravity-flow'",
  'const centerTravel =', 'const globalTilt =', 'const bandCount = mobile ? 4 : 6', 'const arcCount = mobile ? 12 : 20',
  'const streamCount = mobile ? 8 : 14', 'context.quadraticCurveTo('
]) assert.ok(lens.includes(required), `Gravity Lens kinetic contract is missing ${required}.`);

const bio = read('js/features/visual/bio-structure.js');
for (const required of [
  'export function drawBioStructureMode(', 'shapeAudioDrive(', 'beginMotionFrame(context, time)',
  "springChannel(motion, 'breath'", "advanceMotionPhase(motion, 'bio-flow'", 'const driftRadius =', 'const bodyTilt =',
  'const ribCount = mobile ? 5 : 8', 'const veinCount = mobile ? 8 : 14', 'const nodeCount = mobile ? 6 : 9',
  'context.quadraticCurveTo(', 'const membranePulse = Math.sin('
]) assert.ok(bio.includes(required), `Bio Structure kinetic/mobile contract is missing ${required}.`);

for (const isolated of [reactor, fracture, lens, bio]) {
  assert.ok(!isolated.includes('requestAnimationFrame('));
  assert.ok(!isolated.includes('setInterval('));
  assert.ok(!isolated.includes('Math.random('));
  assert.ok(!isolated.includes('shapeMotionTarget('));
}

const base = read('js/features/visual/visual-engine-v2.js');
for (const required of ['function readSpectrum(target)', 'analyser.getByteFrequencyData(target)', 'function drawSpectrum(', 'return { resume, setMode, readSpectrum }']) {
  assert.ok(base.includes(required), `Shared Spectrum analyser contract is missing ${required}.`);
}

const bridge = read('js/features/visual/visual-engine.js').trim();
assert.equal(bridge, "export { createVisualController } from './visual-engine-live.js';");
console.log('Build 59 keeps kinetic flow and adaptive onset detection, then applies a separate post-pose visual impact lane to the four kinetic modes.');
