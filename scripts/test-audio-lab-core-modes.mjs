import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import { assertCurrentBuild } from './lib/build-metadata.mjs';

const read = path => fs.readFileSync(path, 'utf8');

const bridge = read('js/features/visual/visual-engine.js').trim();
assert.equal(
  bridge,
  "export { createVisualController } from './visual-engine-live.js';",
  'Audio Lab must load the live sound-reactive renderer.'
);

const retiredIds = [
  ['prism', 'tunnel'], ['cyber', 'rain'], ['quantum', 'grid'], ['tesla', 'veins'],
  ['hyper', 'drive'], ['wave', 'cathedral'], ['hex', 'reactor']
].map(parts => parts.join('-'));

const live = read('js/features/visual/visual-engine-live.js');
for (const required of [
  "const DEFAULT_MODE = 'neon-shatter'",
  "{ id: 'spectrum', label: 'Spectrum' }",
  'drawNeonShatterAdaptiveMode',
  "{ id: 'aurora-glass', label: 'Aurora Glass', renderer: drawAuroraGlassMode }",
  "document.documentElement.dataset.audioLabRenderer = 'hybrid-reactive-v6'",
  'CUSTOM_MOBILE_FRAME_INTERVAL = 1000 / 60',
  "const dprCap = mode === 'neon-shatter' && mobile ? 1.2 : mobile ? 1.5 : 2"
]) assert.ok(live.includes(required), `Live Audio Lab renderer is missing ${required}.`);
for (const forbidden of [...retiredIds, "'bars'", "id: 'circle'", 'drawOrbitMode', 'drawWaveCathedralMode', 'drawHexReactorMode']) {
  assert.ok(!live.includes(forbidden), `Retired Audio Lab mode ${forbidden} leaked into the live registry.`);
}

const core = read('js/features/visual/visual-engine-core-modes.js');
for (const required of [
  'export function drawAuroraGlassMode(',
  'export function drawNeonShatterAdaptiveMode(',
  'const transient = clamp(Math.max(kick, peak))',
  'const spectralIndex = Math.min(',
  'const spectralRipple = Math.sin(',
  'const spectralDeformation = (spectral - bandValue)',
  'const fragments = mobile ? 20 : 52',
  'const cracks = mobile ? 9 : 16'
]) assert.ok(core.includes(required), `Adaptive Audio Lab renderer is missing ${required}.`);
for (const forbidden of ['drawOrbitMode', 'drawWaveCathedralMode', 'Orbit', 'Wave Cathedral', 'wave-cathedral']) {
  assert.ok(!core.includes(forbidden), `Retired renderer ${forbidden} leaked into the core modes module.`);
}
assert.ok(!fs.existsSync('js/features/visual/visual-engine-hex-reactor.js'), 'Retired Hex Reactor module must be deleted.');

const base = read('js/features/visual/visual-engine-v2.js');
for (const required of [
  "{ id: 'singularity', label: 'Singularity' }",
  "{ id: 'neon-shatter', label: 'Neon Shatter' }",
  "{ id: 'liquid-chrome', label: 'Liquid Chrome' }",
  "{ id: 'nebula', label: 'Nebula' }",
  'function drawSpectrum(',
  'function drawLiquidChrome('
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
  const actual = crypto.createHash('sha256').update(extractFunction(base, name)).digest('hex');
  assert.equal(actual, expected, `${name} is sanctuary-protected and must not change.`);
}

const signal = read('js/features/audio-lab-signal.js');
for (const required of [
  'patchMediaElementSource',
  'nativeConnect(context.destination)',
  "if (destination === analyser.context?.destination) return destination",
  'export function readAudioLabAmplitude('
]) assert.ok(signal.includes(required), `Audio signal safety layer is missing ${required}.`);

const worker = read('sw.js');
assert.ok(worker.includes("'./js/features/visual/audio-reactivity.js'"));
assert.ok(worker.includes("'./js/features/visual/audio-lab-registry.js'"));
assert.ok(worker.includes("'./js/features/visual/audio-lab-sanctuary.js'"));
assert.ok(!worker.includes('visual-engine-hex-reactor.js'));

const build = assertCurrentBuild('Audio Lab Build 43');
assert.equal(build.number, 43);
assert.equal(build.release, 'admin-tools-pwa-polish-20260807');

console.log('Audio Lab Spectrum/Liquid Chrome sanctuary, adaptive Neon, reactive Aurora and parallel metering remain valid under Build 43.');
