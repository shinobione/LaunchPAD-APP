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
  'base.readSpectrum?.(raw)',
  'reading = readAudioLabSpectrum(raw)',
  'boostLiveFeatures(features)',
  "mode === 'bass-fracture' || mode === 'gravity-lens' ? 1.05",
  "document.documentElement.dataset.audioLabRenderer = 'six-core-v1'",
  "document.documentElement.dataset.audioLabPresetCount = '6'",
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

const reactor = read('js/features/visual/pulse-reactor.js');
for (const required of [
  'drawPulseReactorMode',
  'const ringCount = mobile ? 3 : 4',
  'const segmentCount = mobile ? 14 : 24',
  'const spokeCount = mobile ? 10 : 18',
  'const shardCount = mobile ? 4 : 7',
  'const breakMask = clamp(',
  'const segmentFracture = fracture * breakMask',
  'const visible = clamp((drive - .2) * 1.45)',
  'const drift = time * activity * .055'
]) assert.ok(reactor.includes(required), `Pulse Reactor readability contract is missing ${required}.`);

const fracture = read('js/features/visual/bass-fracture.js');
for (const required of [
  'drawBassFractureMode',
  'const motionScale = mobile ? 1.42 : 1.08',
  'const layerCount = mobile ? 2 : 3',
  'const sectorCount = mobile ? 12 : 16',
  'const crackCount = mobile ? 8 : 12',
  'const baseRadius = minSide * (mobile ? .305 : .305)',
  'const drift = time * activity * .03'
]) assert.ok(fracture.includes(required), `Bass Fracture readability/mobile contract is missing ${required}.`);

const lens = read('js/features/visual/gravity-lens.js');
for (const required of [
  'export function drawGravityLensMode(',
  'const warp = clamp(',
  'const caustic = clamp(',
  'const bandCount = mobile ? 4 : 6',
  'const arcCount = mobile ? 12 : 20',
  'const streamCount = mobile ? 8 : 14',
  'const drift = time * activity * .032',
  'context.quadraticCurveTo(',
  'const einsteinRadius ='
]) assert.ok(lens.includes(required), `Gravity Lens FFT/mobile contract is missing ${required}.`);

for (const isolated of [reactor, fracture, lens]) {
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
console.log('Build 54 Audio Lab visuals share Spectrum FFT; Pulse/Bass are clearer and Gravity Lens is mobile-budgeted.');
