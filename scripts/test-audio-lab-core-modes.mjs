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
  "id: 'neon-shatter', label: 'Neon Shatter'",
  "id: 'spectrum', label: 'Spectrum'",
  "id: 'liquid-chrome', label: 'Liquid Chrome'",
  "id: 'pulse-reactor', label: 'Pulse Reactor'",
  "id: 'bass-fracture', label: 'Bass Fracture'",
  "AUDIO_LAB_SANCTUARY_IDS = Object.freeze(['spectrum'])"
]) assert.ok(registry.includes(required), `Audio Lab registry is missing ${required}.`);
for (const forbidden of retiredIds) {
  assert.ok(!registry.includes(forbidden), `Retired Audio Lab preset ${forbidden} leaked into the registry.`);
}
assert.equal((registry.match(/Object\.freeze\(\{ id:/g) || []).length, 5, 'Audio Lab must expose exactly five validated presets.');

const live = read('js/features/visual/visual-engine-live.js');
for (const required of [
  "const DEFAULT_MODE = 'neon-shatter'",
  "{ id: 'neon-shatter', label: 'Neon Shatter', renderer: drawNeonShatterV2Mode }",
  "{ id: 'liquid-chrome', label: 'Liquid Chrome', renderer: drawLiquidChromeV2Mode }",
  "{ id: 'pulse-reactor', label: 'Pulse Reactor', renderer: drawPulseReactorMode }",
  "{ id: 'bass-fracture', label: 'Bass Fracture', renderer: drawBassFractureMode }",
  "{ id: 'spectrum', label: 'Spectrum' }",
  'base.readSpectrum?.(raw)',
  'reading = readAudioLabSpectrum(raw)',
  "document.documentElement.dataset.audioLabRenderer = 'five-core-v1'",
  "document.documentElement.dataset.audioLabPresetCount = '5'",
  "mode === 'bass-fracture' ? 1.05",
  "mode === 'pulse-reactor' ? 1.1",
  'renderMode(labCanvas, customRenderer, raw, getAccent, time, features, mode)'
]) assert.ok(live.includes(required), `Audio Lab integration is missing ${required}.`);
for (const forbidden of [...retiredIds, "'bars'", "id: 'circle'", 'synthesizePlaybackSpectrum', 'readAudioLabAmplitude']) {
  assert.ok(!live.includes(forbidden), `Retired or parallel Audio Lab path ${forbidden} leaked into live integration.`);
}

const core = read('js/features/visual/visual-engine-core-modes.js');
for (const required of [
  'export function drawNeonShatterV2Mode(',
  'export function drawLiquidChromeV2Mode(',
  'const impact = clamp(',
  'const gatedDrift = time * activity * .16',
  'const distance = baseDistance * (.58 + impact * 1.48 + localDrive * .92)',
  'const pulse = clamp(',
  'const phase = time * activity * .2',
  'spectralDeform = spectral * .092 + neighbour * .032',
  'traceLiquidContour(context, minSide, data'
]) assert.ok(core.includes(required), `Rebuilt Audio Lab renderer is missing ${required}.`);
for (const forbidden of ['drawAuroraGlassMode', 'drawSingularityLiveMode', 'drawNeonShatterAdaptiveMode', 'drawLiquidChromeLiveMode']) {
  assert.ok(!core.includes(forbidden), `Retired renderer ${forbidden} remains in core modes.`);
}

const reactor = read('js/features/visual/pulse-reactor.js');
for (const required of [
  'export function drawPulseReactorMode(',
  'const ringCount = mobile ? 3 : 5',
  'const segmentCount = mobile ? 18 : 32',
  'const spokeCount = mobile ? 16 : 30',
  'const shardCount = mobile ? 6 : 10',
  'const drift = time * activity * .075',
  'const impact = clamp(',
  'const fracture = clamp(',
  'fractureLift',
  'sampleAt(data, progress',
  'sampleAt(data, .46 + progress * .54)'
]) assert.ok(reactor.includes(required), `Pulse Reactor signal/mobile contract is missing ${required}.`);
assert.ok(!reactor.includes('setInterval('));
assert.ok(!reactor.includes('Math.random('));

const fracture = read('js/features/visual/bass-fracture.js');
for (const required of [
  'export function drawBassFractureMode(',
  'const layerCount = mobile ? 2 : 3',
  'const sectorCount = mobile ? 12 : 20',
  'const crackCount = mobile ? 10 : 18',
  'const drift = time * activity * .038',
  'const fracture = clamp(',
  'const rupture = clamp(',
  'localImpact',
  'radialOffset',
  'sampleAt(data, .5 + progress * .5)'
]) assert.ok(fracture.includes(required), `Bass Fracture signal/mobile contract is missing ${required}.`);
assert.ok(!fracture.includes('setInterval('));
assert.ok(!fracture.includes('Math.random('));

const base = read('js/features/visual/visual-engine-v2.js');
for (const required of [
  "{ id: 'spectrum', label: 'Spectrum' }",
  "let mode = 'spectrum'",
  'function drawSpectrum(',
  'function readSpectrum(target)',
  'return { resume, setMode, readSpectrum }'
]) assert.ok(base.includes(required), `Spectrum reference engine is missing ${required}.`);
for (const forbidden of ['drawNebula(', 'drawSingularity(', 'drawNeonShatter(', 'drawLiquidChrome(']) {
  assert.ok(!base.includes(forbidden), `Legacy base renderer ${forbidden} must be removed.`);
}

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
for (const required of [
  'function createDecodedSourceProxy(context, audio)',
  'context.decodeAudioData(bytes.slice(0))',
  'context.createBufferSource()',
  "audio.dataset.audioPlaybackPath = 'html5-direct'",
  "audio.dataset.audioAnalysisPath = 'decoded-buffer'"
]) assert.ok(signal.includes(required), `Decoded-buffer isolation layer is missing ${required}.`);
assert.ok(!signal.includes('captureStream('));
assert.ok(!signal.includes('createMediaStreamSource('));

const worker = read('sw.js');
assert.ok(worker.includes("'./js/features/visual/audio-reactivity.js'"));
assert.ok(worker.includes("'./js/features/visual/audio-lab-registry.js'"));
assert.ok(worker.includes("'./js/features/visual/audio-lab-sanctuary.js'"));
assert.ok(worker.includes("'./js/features/visual/pulse-reactor.js'"));
assert.ok(worker.includes("'./js/features/visual/bass-fracture.js'"));

const build = assertCurrentBuild('Audio Lab current build');
assert.match(build.display, /^\d{4}\.\d{2}\.\d{2}\.\d+$/);
assert.ok(build.release, 'Current build release must be present.');
console.log(`Audio Lab exposes Neon Shatter, Spectrum, Liquid Chrome, Pulse Reactor and Bass Fracture under ${build.display}.`);
