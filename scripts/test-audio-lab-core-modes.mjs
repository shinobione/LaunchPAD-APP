import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import { assertCurrentBuild } from './lib/build-metadata.mjs';

const read = path => fs.readFileSync(path, 'utf8').replace(/\r\n/g, '\n');
const bridge = read('js/features/visual/visual-engine.js').trim();
assert.equal(bridge, "export { createVisualController } from './visual-engine-live.js';");

const registry = read('js/features/visual/audio-lab-registry.js');
for (const required of [
  "export const AUDIO_LAB_DEFAULT_MODE = 'neon-ribbon'",
  "id: 'gravity-lens', label: 'Cyber Scene'",
  "id: 'void-bloom', label: 'Pulse Line'",
  "id: 'creep-signal', label: 'Chroma Spectrum'",
  "AUDIO_LAB_SANCTUARY_IDS = Object.freeze(['spectrum'])"
]) assert.ok(registry.includes(required), `Audio Lab registry is missing ${required}.`);
assert.equal((registry.match(/id: '[^']+'/g) || []).length, 10, 'Audio Lab must expose exactly ten validated presets.');

const live = read('js/features/visual/visual-engine-live.js');
for (const required of [
  "{ id: 'gravity-lens', label: 'Neon Horizon', renderer: drawNeonHorizonMode }",
  "{ id: 'void-bloom', label: 'Pulse Line', renderer: drawPulseLineMode }",
  "{ id: 'creep-signal', label: 'Chroma Spectrum', renderer: drawChromaSpectrumMode }",
  "{ id: 'neon-ribbon', label: 'Neon Ribbon', renderer: drawNeonRibbonMode }",
  "{ id: 'spectrum', label: 'Spectrum' }",
  'base.readSpectrum?.(raw)', 'reading = readAudioLabSpectrum(raw)',
  "const KINETIC_MODE_IDS = new Set(['pulse-reactor', 'bass-fracture', 'gravity-lens', 'bio-structure', 'void-bloom', 'creep-signal'])",
  'function createAdaptiveLowPunchTracker()', 'function createDirectVisualImpactTracker()',
  'features.visualImpact = visualImpactTracker.update(features)',
  "document.documentElement.dataset.audioLabRenderer = 'ten-core-v1'",
  "document.documentElement.dataset.audioLabPresetCount = '10'"
]) assert.ok(live.includes(required), `Audio Lab integration is missing ${required}.`);

const premiumFiles = [
  ['js/features/visual/neon-horizon.js', ['export function drawNeonHorizonMode(', 'function drawCyberFigure(', 'function drawHudSpectrum(', 'function drawCyberStreaks(', "context.fillText('AUDIO REACTIVE'", "context.fillText(`ENERGY"]],
  ['js/features/visual/pulse-line.js', ['export function drawPulseLineMode(', 'function tracePoints(', 'function strokeTrace(', 'const points = tracePoints(', 'const transientX =']],
  ['js/features/visual/chroma-spectrum.js', ['export function drawChromaSpectrumMode(', 'const PEAKS = new WeakMap()', 'const barCount = mobile ? 68 : 126', "context.fillText('CHROMA SPECTRUM'", 'const shimmerX =']]
];
for (const [file, required] of premiumFiles) {
  const source = read(file);
  for (const value of required) assert.ok(source.includes(value), `${file} is missing ${value}.`);
  for (const forbidden of ['Math.random(', 'requestAnimationFrame(', 'setInterval(', 'shapeMotionTarget(']) assert.ok(!source.includes(forbidden), `${file} must not contain ${forbidden}.`);
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
for (const required of ["'./js/features/visual/neon-horizon.js'", "'./js/features/visual/pulse-line.js'", "'./js/features/visual/chroma-spectrum.js'", "'./js/features/visual/neon-ribbon.js'"]) {
  assert.ok(worker.includes(required), `PWA shell is missing ${required}.`);
}

const build = assertCurrentBuild('Audio Lab current build');
assert.ok(build.number >= 124, `Audio Lab reference-led pack requires Build 124 or newer, got ${build.display}.`);
console.log(`Audio Lab exposes ten shared-FFT presets including Cyber Scene, Pulse Line and Chroma Spectrum under ${build.display}.`);
