import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = path => fs.readFileSync(path, 'utf8');

const bridge = read('js/features/visual/visual-engine.js').trim();
assert.equal(
  bridge,
  "export { createVisualController } from './visual-engine-live.js';",
  'Audio Lab must load the unified sound-reactive renderer.'
);

const live = read('js/features/visual/visual-engine-live.js');
for (const required of [
  "import { readAudioLabSpectrum, synthesizePlaybackSpectrum }",
  "const DEFAULT_MODE = 'wave-cathedral'",
  "{ id: 'wave-cathedral', label: 'Wave Cathedral', renderer: drawWaveCathedralMode }",
  "{ id: 'bars', label: 'Spectrum', renderer: drawSpectrumMode }",
  'const reading = readAudioLabSpectrum(raw)',
  'const normalized = clamp((raw[index] - noiseFloor) / usableRange)',
  'const attack = shaped > smoothed[index] ? .56 : .145',
  'bands.bass = averageHz(55, 250)',
  'signal.transients.kick = kick',
  'renderMode(homeCanvas, drawWaveCathedralMode, signal, getAccent, time)',
  'renderMode(labCanvas, MODE_RENDERERS.get(mode), signal, getAccent, time)',
  "homeTitle.textContent = 'Wave Cathedral'",
  "document.documentElement.dataset.audioLabRenderer = 'unified-live-v2'",
  "document.documentElement.dataset.audioLabFeed = signal.state",
  'controls.replaceChildren()',
  "button.addEventListener('click'"
]) {
  assert.ok(live.includes(required), `Unified Audio Lab renderer is missing ${required}.`);
}
assert.ok(!live.includes('createBaseVisualController'), 'The legacy render loop must not run beside the unified controller.');

const showcase = read('js/features/visual/visual-engine-showcase-v2.js');
for (const required of [
  'export function drawOrbitMode(',
  'export function drawPrismTunnelMode(',
  'export function drawAuroraGlassMode(',
  'export function drawCyberRainMode(',
  'export function drawWaveCathedralMode(',
  'export function drawQuantumGridMode('
]) {
  assert.ok(showcase.includes(required), `Audio Lab showcase renderer is missing ${required}.`);
}
assert.ok(!showcase.includes('drawConstellationMode'), 'Constellation renderer must remain removed.');

const premium = read('js/features/visual/visual-engine-premium-modes.js');
for (const required of [
  'export function drawSpectrumMode(',
  'export function drawSingularityMode(',
  'export function drawNeonShatterMode(',
  'export function drawLiquidChromeMode(',
  'const violence = clamp('
]) {
  assert.ok(premium.includes(required), `Audio Lab premium renderer is missing ${required}.`);
}

const index = read('index.html');
for (const required of [
  'data-visual="circle">Orbit',
  'data-visual="bars">Spectrum'
]) {
  assert.ok(index.includes(required), `Audio Lab bootstrap control is missing ${required}.`);
}

const worker = read('sw.js');
for (const required of [
  "'./js/features/visual/visual-engine-live.js'",
  "'./js/features/visual/visual-engine-utils.js'",
  "'./js/features/visual/visual-engine-premium-modes.js'",
  "'./js/features/visual/visual-engine-showcase-v2.js'"
]) {
  assert.ok(worker.includes(required), `The installed PWA must cache ${required}.`);
}

const build = read('js/build-config.js');
for (const required of [
  "id: '20260806-audiolab-unified-v2'",
  "cache: 'shinobi-launchpad-v25'",
  "revision: 'audiolab-unified-reactivity-1'",
  "display: '2026.08.06.25'",
  "release: 'audiolab-unified-reactivity-20260806'"
]) {
  assert.ok(build.includes(required), `Audio Lab unified-reactivity metadata is missing ${required}.`);
}

console.log('Wave Cathedral is first/default and every Audio Lab effect shares the Build 25 live analyser pipeline.');