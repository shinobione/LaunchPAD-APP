import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import { assertCurrentBuild } from './lib/build-metadata.mjs';

const read = path => fs.readFileSync(path, 'utf8');
const bridge = read('js/features/visual/visual-engine.js').trim();
assert.equal(bridge, "export { createVisualController } from './visual-engine-live.js';");

const retiredIds = [
  ['prism', 'tunnel'], ['cyber', 'rain'], ['quantum', 'grid'], ['tesla', 'veins'],
  ['hyper', 'drive'], ['wave', 'cathedral'], ['hex', 'reactor']
].map(parts => parts.join('-'));

const live = read('js/features/visual/visual-engine-live.js');
for (const required of [
  "const DEFAULT_MODE = 'neon-shatter'",
  "{ id: 'spectrum', label: 'Spectrum' }",
  "{ id: 'neon-shatter', label: 'Neon Shatter', renderer: drawNeonShatterAdaptiveMode }",
  "{ id: 'aurora-glass', label: 'Aurora Glass', renderer: drawAuroraGlassMode }",
  "{ id: 'liquid-chrome', label: 'Liquid Chrome', renderer: drawLiquidChromeLiveMode }",
  "{ id: 'singularity', label: 'Singularity', renderer: drawSingularityLiveMode }",
  "document.documentElement.dataset.audioLabRenderer = 'signal-first-v9'",
  'function boostLiveFeatures(features)',
  'renderMode(labCanvas, customRenderer, raw, getAccent, time, features, mode)',
  'CUSTOM_MOBILE_FRAME_INTERVAL = 1000 / 60',
  'const TELEMETRY_INTERVAL = 120'
]) assert.ok(live.includes(required), `Live Audio Lab renderer is missing ${required}.`);
for (const forbidden of [...retiredIds, "'bars'", "id: 'circle'", 'drawOrbitMode', 'drawWaveCathedralMode', 'drawHexReactorMode', 'shapeReactiveSpectrum(raw, shaped, features)']) {
  assert.ok(!live.includes(forbidden), `Retired/over-smoothed Audio Lab path ${forbidden} leaked into the live registry.`);
}

const core = read('js/features/visual/visual-engine-core-modes.js');
for (const required of [
  'export function drawAuroraGlassMode(',
  'export function drawNeonShatterAdaptiveMode(',
  'export function drawLiquidChromeLiveMode(',
  'export function drawSingularityLiveMode(',
  'const rawBass = bandAverage(',
  'const rawMiddle = bandAverage(',
  'const rawHigh = bandAverage(',
  'const beatDrive = clamp(',
  'const radialDrive = .72 + value * .82',
  'const spectralLift = (spectral - bandValue * .36)',
  'const fragments = mobile ? 22 : 54',
  'const cracks = mobile ? 10 : 18',
  'const baseRadius = .247',
  'const outerReach = minSide * .37'
]) assert.ok(core.includes(required), `Signal-first Audio Lab renderer is missing ${required}.`);
assert.ok(core.includes('const tinyDrift = Math.sin(time * .31) * energy * .025'));
assert.ok(core.includes('const microDrift = Math.sin(time * .23) * energy * .018'));
assert.ok(!fs.existsSync('js/features/visual/visual-engine-hex-reactor.js'));

const base = read('js/features/visual/visual-engine-v2.js');
for (const required of [
  "{ id: 'singularity', label: 'Singularity' }",
  "{ id: 'neon-shatter', label: 'Neon Shatter' }",
  "{ id: 'liquid-chrome', label: 'Liquid Chrome' }",
  "{ id: 'nebula', label: 'Nebula' }",
  'function drawSpectrum(',
  'function drawLiquidChrome('
]) assert.ok(base.includes(required), `Base Audio Lab renderer is missing ${required}.`);

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
const protectedHashes = {
  drawLiquidChrome: 'bc171075042d4fe881a781ba0206482d721f8e1de6fada4357c7b2d944a23967',
  drawSpectrum: '25a86e3763b668fc69734d48439a2c93745ef927a3fcbdddaf2d0f29e0371813'
};
for (const [name, expected] of Object.entries(protectedHashes)) {
  const actual = crypto.createHash('sha256').update(extractFunction(base, name)).digest('hex');
  assert.equal(actual, expected, `${name} is sanctuary-protected and must not change.`);
}

const signal = read('js/features/audio-lab-signal.js');
for (const required of [
  'function createDecodedSourceProxy(context, audio)',
  'context.decodeAudioData(bytes.slice(0))',
  'context.createBufferSource()',
  "document.documentElement.dataset.audioGraph = 'html5-direct-plus-decoded-buffer-metering'",
  "audio.dataset.audioPlaybackPath = 'html5-direct'",
  "audio.dataset.audioAnalysisPath = 'decoded-buffer'",
  "window.addEventListener('shinobi:route-change'",
  "document.addEventListener('pointerdown'",
  'async function suspendContexts()',
  'export function readAudioLabAmplitude('
]) assert.ok(signal.includes(required), `Decoded-buffer isolation layer is missing ${required}.`);
assert.ok(!signal.includes('captureStream('));
assert.ok(!signal.includes('createMediaStreamSource('));
assert.ok(!signal.includes('createMirrorSourceProxy'));

const worker = read('sw.js');
assert.ok(worker.includes("'./js/features/visual/audio-reactivity.js'"));
assert.ok(worker.includes("'./js/features/visual/audio-lab-registry.js'"));
assert.ok(worker.includes("'./js/features/visual/audio-lab-sanctuary.js'"));
assert.ok(!worker.includes('visual-engine-hex-reactor.js'));

const build = assertCurrentBuild('Audio Lab current build');
assert.match(build.display, /^\d{4}\.\d{2}\.\d{2}\.\d+$/);
assert.ok(build.release, 'Current build release must be present.');
console.log(`Audio Lab protected renderers and signal-first decoded-FFT contract are valid under ${build.display}.`);
