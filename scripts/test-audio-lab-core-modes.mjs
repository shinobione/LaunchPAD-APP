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
  "id: 'gravity-lens', label: 'Prism Tunnel'",
  "id: 'void-bloom', label: 'Pulse Line'",
  "id: 'creep-signal', label: 'Chroma Spectrum'",
  "AUDIO_LAB_SANCTUARY_IDS = Object.freeze(['spectrum'])"
]) assert.ok(registry.includes(required), `Audio Lab registry is missing ${required}.`);
assert.equal((registry.match(/id: '[^']+'/g) || []).length, 10, 'Audio Lab must expose exactly ten validated presets.');

const live = read('js/features/visual/visual-engine-live.js');
for (const required of [
  "{ id: 'gravity-lens', label: 'Prism Tunnel', renderer: drawPrismTunnelMode }",
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
  ['js/features/visual/prism-tunnel.js', ['export function drawPrismTunnelMode(', 'function depthFrame(', 'function drawConnectorRibs(', 'function drawSpectralSparks(', 'const frameCount = width < 760 ? 9 : 13']],
  ['js/features/visual/pulse-line.js', ['export function drawPulseLineMode(', 'function waveformPoints(', 'function strokeWave(', 'function strongestPeaks(', 'const points = waveformPoints(', 'const echo = points.map(']],
  ['js/features/visual/chroma-spectrum.js', ['export function drawChromaSpectrumMode(', 'const PEAKS = new WeakMap()', 'const barCount = mobile ? 96 : 184', 'function spectrumGradient(', 'function drawRearField(', 'const edgeLight =']]
];
for (const [file, required] of premiumFiles) {
  const source = read(file);
  for (const value of required) assert.ok(source.includes(value), `${file} is missing ${value}.`);
  for (const forbidden of ['Math.random(', 'requestAnimationFrame(', 'setInterval(', 'shapeMotionTarget(']) assert.ok(!source.includes(forbidden), `${file} must not contain ${forbidden}.`);
  assert.ok(!source.includes('fillText('), `${file} must not contain visualizer typography.`);
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
for (const required of ["'./js/features/visual/prism-tunnel.js'", "'./js/features/visual/pulse-line.js'", "'./js/features/visual/chroma-spectrum.js'", "'./js/features/visual/neon-ribbon.js'"]) {
  assert.ok(worker.includes(required), `PWA shell is missing ${required}.`);
}

const build = assertCurrentBuild('Audio Lab current build');
assert.ok(build.number >= 126, `Audio Lab premium polish + Prism Tunnel requires Build 126 or newer, got ${build.display}.`);
console.log(`Audio Lab exposes ten shared-FFT presets including Prism Tunnel plus polished Pulse Line and Chroma Spectrum under ${build.display}.`);
