import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';

const read = path => fs.readFileSync(path, 'utf8');

const bridge = read('js/features/visual/visual-engine.js').trim();
assert.equal(
  bridge,
  "export { createVisualController } from './visual-engine-live.js';",
  'Audio Lab must load the live sound-reactive renderer.'
);

const retiredIds = [
  ['prism', 'tunnel'],
  ['cyber', 'rain'],
  ['quantum', 'grid'],
  ['tesla', 'veins'],
  ['hyper', 'drive'],
  ['wave', 'cathedral'],
  ['hex', 'reactor']
].map(parts => parts.join('-'));

const live = read('js/features/visual/visual-engine-live.js');
for (const required of [
  "import { readAudioLabAmplitude, readAudioLabSpectrum, synthesizePlaybackSpectrum }",
  'createAmplitudeDynamicsTracker',
  "const DEFAULT_MODE = 'neon-shatter'",
  "{ id: 'aurora-glass', label: 'Aurora Glass', renderer: drawAuroraGlassMode }",
  'externalHomeRenderer: false',
  'const waveform = new Uint8Array(256)',
  'const amplitudeReading = readAudioLabAmplitude(waveform)',
  'Object.assign(features, amplitude)',
  "document.documentElement.dataset.audioLabRenderer = 'hybrid-reactive-v5'",
  'document.documentElement.dataset.audioLabRms = features.rms.toFixed(3)',
  'document.documentElement.dataset.audioLabDynamics = features.dynamics.toFixed(3)',
  'renderMode(homeCanvas, customRenderer, reactive, getAccent, time, features)'
]) assert.ok(live.includes(required), `Live Audio Lab renderer is missing ${required}.`);
for (const forbidden of [...retiredIds, "id: 'circle'", 'drawOrbitMode', 'drawWaveCathedralMode', 'drawHexReactorMode']) {
  assert.ok(!live.includes(forbidden), `Retired Audio Lab mode ${forbidden} leaked into the live registry.`);
}

const core = read('js/features/visual/visual-engine-core-modes.js');
for (const required of [
  'export function drawAuroraGlassMode(',
  'rms: features.rms ?? features.energy ?? 0',
  'peak: features.peak ?? features.kick ?? 0',
  'dynamics: features.dynamics ?? features.intensity ?? features.energy ?? 0',
  'const expansion = .42 + dynamics * .94 + peak * .2',
  'const motionRate = .14 + dynamics * .72 + peak * .16',
  'const separation = height * (.025 + dynamics * .043)'
]) assert.ok(core.includes(required), `Aurora RMS dynamics renderer is missing ${required}.`);
for (const forbidden of ['drawOrbitMode', 'drawWaveCathedralMode', 'Orbit', 'Wave Cathedral', 'wave-cathedral']) {
  assert.ok(!core.includes(forbidden), `Retired renderer ${forbidden} leaked into the Aurora module.`);
}
assert.ok(!fs.existsSync('js/features/visual/visual-engine-hex-reactor.js'), 'Retired Hex Reactor module must be deleted.');

const base = read('js/features/visual/visual-engine-v2.js');
for (const required of [
  "{ id: 'singularity', label: 'Singularity' }",
  "{ id: 'neon-shatter', label: 'Neon Shatter' }",
  "{ id: 'liquid-chrome', label: 'Liquid Chrome' }",
  "{ id: 'nebula', label: 'Nebula' }",
  'const spreadX = width * (.27 + intensity * .045)',
  "ctx.globalCompositeOperation = 'source-over'",
  'const rings = width < 520 ? 32 : 46',
  'ctx.shadowBlur = 1 + value * 3.8',
  "if (!delegatedModeSet.has(mode)) draw($('#lab-visualizer'), mode)"
]) assert.ok(base.includes(required), `Base Audio Lab renderer is missing ${required}.`);
for (const forbidden of [...retiredIds, "case 'hex-reactor'", 'drawHexReactor', 'hexPath']) {
  assert.ok(!base.includes(forbidden), `Retired Audio Lab code ${forbidden} leaked into the base renderer.`);
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

const protectedHashes = {
  drawLiquidChrome: 'bc171075042d4fe881a781ba0206482d721f8e1de6fada4357c7b2d944a23967',
  drawSpectrum: '25a86e3763b668fc69734d48439a2c93745ef927a3fcbdddaf2d0f29e0371813'
};
for (const [name, expected] of Object.entries(protectedHashes)) {
  const source = extractFunction(base, name);
  const actual = crypto.createHash('sha256').update(source).digest('hex');
  assert.equal(actual, expected, `${name} is sanctuary-protected and must not change.`);
}
for (const binding of [
  "case 'liquid-chrome': drawLiquidChrome(ctx, width, height, data, accent, accent2); break;",
  'default: drawSpectrum(ctx, width, height, data, accent, accent2);'
]) assert.ok(base.includes(binding), `Protected Audio Lab binding changed: ${binding}`);

const reactivity = read('js/features/visual/audio-reactivity.js');
for (const required of [
  'export function createAmplitudeDynamicsTracker(',
  'const normalizedRms = clamp(',
  'const dynamics = clamp(Math.pow(loudness, .78) * .76 + peakHold * .24)',
  'export function createAudioReactivityTracker(',
  'export function shapeReactiveSpectrum('
]) assert.ok(reactivity.includes(required), `Reusable audio dynamics layer is missing ${required}.`);

const signal = read('js/features/audio-lab-signal.js');
for (const required of [
  'export function readAudioLabAmplitude(',
  'ACTIVE_ANALYSER.getByteTimeDomainData(target)',
  'const rms = Math.sqrt(energy / target.length)'
]) assert.ok(signal.includes(required), `Live amplitude bridge is missing ${required}.`);

const worker = read('sw.js');
assert.ok(worker.includes("'./js/features/visual/audio-reactivity.js'"));
assert.ok(worker.includes("'./js/features/visual/audio-lab-registry.js'"));
assert.ok(worker.includes("'./js/features/visual/audio-lab-sanctuary.js'"));
assert.ok(worker.includes("event.data?.type === 'GET_RELEASE'"));
assert.ok(!worker.includes('visual-engine-hex-reactor.js'), 'PWA shell must not cache the retired Hex Reactor module.');

const build = read('js/build-config.js');
for (const required of [
  "id: '20260806-audiolab-rms-clarity'",
  "cache: 'shinobi-launchpad-v27'",
  "revision: 'audiolab-rms-clarity-1'",
  "display: '2026.08.06.27'",
  "release: 'audiolab-rms-clarity-20260806'",
  "id: '20260806-pwa-single-update'",
  "cache: 'shinobi-launchpad-v28'",
  "revision: 'pwa-single-update-1'",
  "display: '2026.08.06.28'",
  "release: 'pwa-single-update-20260806'",
  "id: '20260806-m6-home-editorial'",
  "cache: 'shinobi-launchpad-v33'",
  "display: '2026.08.06.33'",
  "id: '20260806-m7-audiolab-sanctuary'",
  "cache: 'shinobi-launchpad-v34'",
  "revision: 'audiolab-sanctuary-1'",
  "display: '2026.08.06.34'",
  "release: 'audiolab-sanctuary-20260806'"
]) assert.ok(build.includes(required), `Audio Lab/PWA metadata is missing ${required}.`);

console.log('Audio Lab purge, calibration and sanctuary-protected Spectrum/Liquid Chrome remain valid under Build 34.');
