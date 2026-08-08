import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import { assertCurrentBuild } from './lib/build-metadata.mjs';

const read = path => fs.readFileSync(path, 'utf8');
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
  "id: 'liquid-chrome', label: 'Liquid Chrome'", "id: 'pulse-reactor', label: 'Pulse Reactor'",
  "id: 'bass-fracture', label: 'Bass Fracture'", "id: 'gravity-lens', label: 'Gravity Lens'",
  "id: 'bio-structure', label: 'Bio Structure'", "AUDIO_LAB_SANCTUARY_IDS = Object.freeze(['spectrum'])"
]) assert.ok(registry.includes(required), `Audio Lab registry is missing ${required}.`);
for (const forbidden of retiredIds) assert.ok(!registry.includes(forbidden), `Retired preset leaked into registry: ${forbidden}.`);
assert.equal((registry.match(/Object\.freeze\(\{ id:/g) || []).length, 7, 'Audio Lab must expose exactly seven validated presets.');

const live = read('js/features/visual/visual-engine-live.js');
for (const required of [
  "{ id: 'neon-shatter', label: 'Neon Shatter', renderer: drawNeonShatterV2Mode }",
  "{ id: 'liquid-chrome', label: 'Liquid Chrome', renderer: drawLiquidChromeV2Mode }",
  "{ id: 'pulse-reactor', label: 'Pulse Reactor', renderer: drawPulseReactorMode }",
  "{ id: 'bass-fracture', label: 'Bass Fracture', renderer: drawBassFractureMode }",
  "{ id: 'gravity-lens', label: 'Gravity Lens', renderer: drawGravityLensMode }",
  "{ id: 'bio-structure', label: 'Bio Structure', renderer: drawBioStructureMode }",
  "{ id: 'spectrum', label: 'Spectrum' }",
  'base.readSpectrum?.(raw)', 'reading = readAudioLabSpectrum(raw)',
  "document.documentElement.dataset.audioLabRenderer = 'seven-core-v2'",
  "document.documentElement.dataset.audioLabPresetCount = '7'",
  "mode === 'bass-fracture' || mode === 'gravity-lens' || mode === 'bio-structure' ? 1.05"
]) assert.ok(live.includes(required), `Audio Lab integration is missing ${required}.`);

const core = read('js/features/visual/visual-engine-core-modes.js');
for (const required of ['export function drawNeonShatterV2Mode(', 'export function drawLiquidChromeV2Mode(', 'const gatedDrift = time * activity * .16', 'const phase = time * activity * .2']) {
  assert.ok(core.includes(required), `Validated baseline renderer is missing ${required}.`);
}

const motion = read('js/features/visual/motion-spring.js');
for (const required of [
  'export function beginMotionFrame(', 'export function springChannel(', 'export function shapeMotionTarget(',
  'const knee = clamp(', 'const ceiling = clamp(', 'export function motionPhase(',
  'Math.pow(clamp(Number(activity) || 0, 0, 1.2), .62)'
]) assert.ok(motion.includes(required), `Motion helper is missing ${required}.`);

const reactor = read('js/features/visual/pulse-reactor.js');
for (const required of [
  'export function drawPulseReactorMode(', 'shapeMotionTarget', 'const ringCount = mobile ? 3 : 4',
  'const segmentCount = mobile ? 14 : 24', "springChannel(motion, 'impact'",
  'const bassMomentum = clamp(', 'const impactMomentum = clamp(', 'const elasticWobble = Math.sin('
]) assert.ok(reactor.includes(required), `Pulse Reactor contract is missing ${required}.`);

const fracture = read('js/features/visual/bass-fracture.js');
for (const required of [
  'export function drawBassFractureMode(', 'shapeMotionTarget', 'const motionScale = mobile ? 1.48 : 1.12',
  'const layerCount = mobile ? 2 : 3', 'const sectorCount = mobile ? 12 : 16', 'const crackCount = mobile ? 8 : 12',
  "springChannel(motion, 'rupture'", 'const ruptureMomentum = clamp('
]) assert.ok(fracture.includes(required), `Bass Fracture contract is missing ${required}.`);

const lens = read('js/features/visual/gravity-lens.js');
for (const required of [
  'export function drawGravityLensMode(', 'shapeMotionTarget', 'const bandCount = mobile ? 4 : 6',
  'const arcCount = mobile ? 12 : 20', 'const streamCount = mobile ? 8 : 14',
  "springChannel(motion, 'warp'", 'const warpMomentum = clamp(', 'const streamDrift = Math.sin('
]) assert.ok(lens.includes(required), `Gravity Lens contract is missing ${required}.`);

const bio = read('js/features/visual/bio-structure.js');
for (const required of [
  'export function drawBioStructureMode(', 'shapeMotionTarget', 'const ribCount = mobile ? 5 : 8',
  'const veinCount = mobile ? 8 : 14', 'const nodeCount = mobile ? 6 : 9',
  "springChannel(motion, 'breath'", 'const breathMomentum = clamp(', 'context.quadraticCurveTo('
]) assert.ok(bio.includes(required), `Bio Structure contract is missing ${required}.`);

for (const isolated of [reactor, fracture, lens, bio]) {
  assert.ok(!isolated.includes('setInterval('));
  assert.ok(!isolated.includes('requestAnimationFrame('));
  assert.ok(!isolated.includes('Math.random('));
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
  "'./js/features/visual/bass-fracture.js'", "'./js/features/visual/gravity-lens.js'",
  "'./js/features/visual/bio-structure.js'"
]) assert.ok(worker.includes(required), `PWA shell is missing ${required}.`);

const build = assertCurrentBuild('Audio Lab current build');
assert.equal(build.display, '2026.08.08.56');
assert.equal(build.release, 'dynamic-breathing-20260808');
console.log(`Audio Lab exposes seven shared-FFT presets with dynamic motion headroom under ${build.display}.`);
