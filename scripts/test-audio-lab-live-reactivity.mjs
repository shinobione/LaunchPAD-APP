import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = path => fs.readFileSync(path, 'utf8');
const live = read('js/features/visual/visual-engine-live.js');
const premium = read('js/features/visual/visual-engine-premium-modes.js');
const showcase = read('js/features/visual/visual-engine-showcase-v2.js');
const utilities = read('js/features/visual/visual-engine-utils.js');

for (const required of [
  "const DEFAULT_MODE = 'wave-cathedral'",
  'const VISUAL_MODES = [',
  "{ id: 'bars', label: 'Spectrum', renderer: drawSpectrumMode }",
  "{ id: 'liquid-chrome', label: 'Liquid Chrome', renderer: drawLiquidChromeMode }",
  "{ id: 'prism-tunnel', label: 'Prism Tunnel', renderer: drawPrismTunnelMode }",
  "{ id: 'cyber-rain', label: 'Cyber Rain', renderer: drawCyberRainMode }",
  "{ id: 'quantum-grid', label: 'Quantum Grid', renderer: drawQuantumGridMode }",
  'function createSignalPipeline(',
  'analyser.fftSize = 512',
  'analyser.smoothingTimeConstant = .42',
  'bands.sub = averageHz(20, 75)',
  'bands.bass = averageHz(55, 250)',
  'bands.lowMid = averageHz(180, 620)',
  'bands.mid = averageHz(500, 2400)',
  'bands.highMid = averageHz(1800, 6500)',
  'bands.high = averageHz(4200, 12500)',
  'bands.treble = averageHz(9000, 18000)',
  'signal.transients.kick = kick',
  'signal.transients.snare = snare',
  'renderMode(homeCanvas, drawWaveCathedralMode, signal, getAccent, time)',
  'renderMode(labCanvas, MODE_RENDERERS.get(mode), signal, getAccent, time)',
  "document.documentElement.dataset.audioLabRenderer = 'unified-live-v2'",
  "document.documentElement.dataset.audioLabPipeline = 'frequency-bands-transients'",
  'registerMode({ id, label, renderer })'
]) {
  assert.ok(live.includes(required), `Unified Audio Lab integration is missing ${required}.`);
}

assert.ok(!live.includes('createBaseVisualController'), 'The unified renderer must not start the legacy base render loop.');
assert.equal((live.match(/requestAnimationFrame\(render\)/g) || []).length, 3, 'Only the unified render lifecycle should schedule render frames.');
assert.equal((live.match(/function render\(\)/g) || []).length, 1, 'Audio Lab must use one shared render loop.');

for (const required of [
  'export function drawLiquidChromeMode(',
  'const violence = clamp(',
  'signal.intensity * .78',
  'kick * .9',
  'const droplets = 8 + Math.floor(kick * 12)',
  'export function drawSpectrumMode(',
  'export function drawNebulaMode(',
  'export function drawSingularityMode(',
  'export function drawNeonShatterMode('
]) {
  assert.ok(premium.includes(required), `Premium Audio Lab renderer is missing ${required}.`);
}

for (const required of [
  'export function drawPrismTunnelMode(',
  'const speed = .08 + bass * .18 + kick * .14',
  'export function drawCyberRainMode(',
  'const perspectiveX = width / 2 + lane * width * (.18 + phase * .42)',
  'export function drawQuantumGridMode(',
  'const nodes = width < 600 ? 22 : 34',
  'export function drawWaveCathedralMode('
]) {
  assert.ok(showcase.includes(required), `Showcase Audio Lab renderer is missing ${required}.`);
}

for (const required of [
  'export function prepareCanvas(',
  'export function sampleSpectrum(',
  'export function polygonPath(',
  'export function drawSoftVignette('
]) {
  assert.ok(utilities.includes(required), `Shared visual utility is missing ${required}.`);
}

const bridge = read('js/features/visual/visual-engine.js').trim();
assert.equal(bridge, "export { createVisualController } from './visual-engine-live.js';");

const worker = read('sw.js');
for (const file of [
  './js/features/visual/visual-engine-utils.js',
  './js/features/visual/visual-engine-premium-modes.js',
  './js/features/visual/visual-engine-showcase-v2.js'
]) assert.ok(worker.includes(`'${file}'`), `Service worker shell is missing ${file}.`);

const build = read('js/build-config.js');
for (const required of [
  "id: '20260806-audiolab-unified-v2'",
  "cache: 'shinobi-launchpad-v25'",
  "display: '2026.08.06.25'",
  "release: 'audiolab-unified-reactivity-20260806'"
]) assert.ok(build.includes(required), `Unified Audio Lab build metadata is missing ${required}.`);

console.log('Audio Lab uses one analyser, one reactive signal model and one render loop for every visual mode.');