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
  ['hyper', 'drive']
].map(parts => parts.join('-'));

const live = read('js/features/visual/visual-engine-live.js');
for (const required of [
  "import { createAudioReactivityTracker, shapeReactiveSpectrum }",
  "import { drawHexReactorMode } from './visual-engine-hex-reactor.js'",
  "const DEFAULT_MODE = 'wave-cathedral'",
  "{ id: 'wave-cathedral', label: 'Wave Cathedral', renderer: drawWaveCathedralMode }",
  "{ id: 'circle', label: 'Orbit', renderer: drawOrbitMode }",
  "{ id: 'aurora-glass', label: 'Aurora Glass', renderer: drawAuroraGlassMode }",
  "{ id: 'hex-reactor', label: 'Hex Reactor', renderer: drawHexReactorMode }",
  'const tracker = createAudioReactivityTracker(',
  'shapeReactiveSpectrum(raw, shaped, features)',
  'base.setMode(mode)',
  'renderer(prepared.context, prepared.width, prepared.height, data, accent, accent2, time, features)',
  "document.documentElement.dataset.audioLabRenderer = 'fft-mechanical-v3'",
  'document.documentElement.dataset.audioLabKick = features.kick.toFixed(3)'
]) {
  assert.ok(live.includes(required), `Live Audio Lab renderer is missing ${required}.`);
}
for (const id of retiredIds) assert.ok(!live.includes(id), `Retired Audio Lab mode ${id} leaked into the live registry.`);

const core = read('js/features/visual/visual-engine-core-modes.js');
for (const required of [
  'export function drawOrbitMode(',
  'export function drawAuroraGlassMode(',
  'export function drawWaveCathedralMode(',
  'const bassDrive = Math.pow(clamp(bass * 1.7 + energy * .52 + kick * 2.1), .58)',
  'const bandSpeeds = [.105, .155, .225]',
  'const bandDirections = [1, -1, 1]',
  'const arches = width < 600 ? 7 : 10',
  'const apexGap = width * (.003 + localDrive * (.025 + (1 - progress) * .024))',
  'const spread = 1 + mechanicalDrive * (.16 + distance * .12)'
]) {
  assert.ok(core.includes(required), `Audio Lab calibrated renderer is missing ${required}.`);
}
for (const id of retiredIds) assert.ok(!core.includes(id), `Retired Audio Lab mode ${id} leaked into the renderer module.`);

const hex = read('js/features/visual/visual-engine-hex-reactor.js');
for (const required of [
  'export function drawHexReactorMode(',
  'const beatDrive = Math.pow(clamp(bass * 1.55 + kick * 2.15 + energy * .38), .62)',
  "const travel = time * (.145 + motionDrive * .19)",
  'const counterFront = Math.max(0, 1 - Math.abs(counterPhase - .5) * 6.4)',
  'for (let ring = 0; ring < 4; ring += 1)',
  "context.globalCompositeOperation = 'lighter'"
]) assert.ok(hex.includes(required), `Balanced Hex Reactor renderer is missing ${required}.`);
for (const id of retiredIds) assert.ok(!hex.includes(id), `Retired Audio Lab mode ${id} leaked into Hex Reactor.`);

const base = read('js/features/visual/visual-engine-v2.js');
for (const required of [
  "{ id: 'singularity', label: 'Singularity' }",
  "{ id: 'neon-shatter', label: 'Neon Shatter' }",
  "{ id: 'liquid-chrome', label: 'Liquid Chrome' }",
  "{ id: 'hex-reactor', label: 'Hex Reactor' }",
  "{ id: 'nebula', label: 'Nebula' }",
  "if (!delegatedModeSet.has(mode)) draw($('#lab-visualizer'), mode)",
  'const allowedModes = new Set(',
  'const fragments = width < 520 ? 36 : 54',
  'const spreadX = width * (.32 + intensity * .08)'
]) {
  assert.ok(base.includes(required), `Base Audio Lab renderer is missing ${required}.`);
}
for (const id of retiredIds) assert.ok(!base.includes(id), `Retired Audio Lab mode ${id} leaked into the base renderer.`);

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
  drawNeonShatter: 'a3318ca4cfb3966d0ecf5d4949aedadfe60e398a403bbe77fcaa0a2904159813',
  drawLiquidChrome: 'bc171075042d4fe881a781ba0206482d721f8e1de6fada4357c7b2d944a23967',
  drawSpectrum: '25a86e3763b668fc69734d48439a2c93745ef927a3fcbdddaf2d0f29e0371813'
};
for (const [name, expected] of Object.entries(protectedHashes)) {
  const source = extractFunction(base, name);
  const actual = crypto.createHash('sha256').update(source).digest('hex');
  assert.equal(actual, expected, `${name} is sanctuary-protected and must not change.`);
}
for (const binding of [
  "case 'neon-shatter': drawNeonShatter(ctx, width, height, data, accent, accent2, features); break;",
  "case 'liquid-chrome': drawLiquidChrome(ctx, width, height, data, accent, accent2); break;",
  'default: drawSpectrum(ctx, width, height, data, accent, accent2);'
]) assert.ok(base.includes(binding), `Protected Audio Lab binding changed: ${binding}`);

const reactivity = read('js/features/visual/audio-reactivity.js');
for (const required of [
  'export function createAudioReactivityTracker(',
  'const bassRise = Math.max(0, raw.bass - previousBass)',
  'export function shapeReactiveSpectrum(',
  'features.kick * 1.25'
]) assert.ok(reactivity.includes(required), `Reusable FFT reactivity layer is missing ${required}.`);

const worker = read('sw.js');
for (const required of [
  "'./js/features/visual/audio-reactivity.js'",
  "'./js/features/visual/visual-engine-hex-reactor.js'"
]) assert.ok(worker.includes(required), `The installed PWA must cache ${required}.`);

const build = read('js/build-config.js');
for (const required of [
  "id: '20260806-audiolab-animation-calibration'",
  "cache: 'shinobi-launchpad-v26'",
  "revision: 'audiolab-animation-calibration-1'",
  "display: '2026.08.06.26'",
  "release: 'audiolab-animation-calibration-20260806'"
]) assert.ok(build.includes(required), `Audio Lab animation calibration metadata is missing ${required}.`);

console.log('Audio Lab mechanical motion, band-separated Aurora, balanced Hex Reactor and renderer sanctuary are valid.');
