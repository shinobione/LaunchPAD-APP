import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = path => fs.readFileSync(path, 'utf8');

const bridge = read('js/features/visual/visual-engine.js').trim();
assert.equal(
  bridge,
  "export { createVisualController } from './visual-engine-live.js';",
  'Audio Lab must load the live sound-reactive renderer.'
);

const live = read('js/features/visual/visual-engine-live.js');
for (const required of [
  "import { readAudioLabSpectrum, synthesizePlaybackSpectrum }",
  "const DEFAULT_MODE = 'wave-cathedral'",
  "{ id: 'wave-cathedral', label: 'Wave Cathedral', renderer: drawWaveCathedralMode }",
  'const reading = readAudioLabSpectrum(raw)',
  'Math.pow(raw[index] / 255, .72)',
  'const attack = boosted > smoothed[index] ? .58 : .2',
  'renderMode(homeCanvas, drawWaveCathedralMode, reactive, getAccent, time)',
  "homeTitle.textContent = 'Wave Cathedral'",
  "document.documentElement.dataset.audioLabRenderer = 'live-analyser'",
  "document.documentElement.dataset.audioLabFeed = reading.state",
  'controls.prepend(defaultButton)',
  "button.addEventListener('click'"
]) {
  assert.ok(live.includes(required), `Live Audio Lab renderer is missing ${required}.`);
}

const core = read('js/features/visual/visual-engine-core-modes.js');
for (const required of [
  'export function drawOrbitMode(',
  'export function drawPrismTunnelMode(',
  'export function drawAuroraGlassMode(',
  'export function drawCyberRainMode(',
  'export function drawWaveCathedralMode(',
  'export function drawQuantumGridMode('
]) {
  assert.ok(core.includes(required), `Audio Lab showcase renderer is missing ${required}.`);
}
assert.ok(!core.includes('drawConstellationMode'), 'Constellation renderer must remain removed.');

const index = read('index.html');
for (const required of [
  'data-visual="circle">Orbit',
  'data-visual="bars">Spectrum'
]) {
  assert.ok(index.includes(required), `Audio Lab control is missing ${required}.`);
}

const worker = read('sw.js');
for (const required of [
  "'./js/features/visual/visual-engine-core-modes.js'",
  "'./js/features/visual/visual-engine-live.js'"
]) {
  assert.ok(worker.includes(required), `The installed PWA must cache ${required}.`);
}

const build = read('js/build-config.js');
for (const required of [
  "id: '20260805-audiolab-live-reactivity'",
  "cache: 'shinobi-launchpad-v24'",
  "revision: 'audiolab-live-reactivity-1'",
  "display: '2026.08.05.24'",
  "release: 'audiolab-live-reactivity-20260805'"
]) {
  assert.ok(build.includes(required), `Audio Lab live-reactivity metadata is missing ${required}.`);
}

console.log('Wave Cathedral is first and default, Home uses it, and showcase effects read the live analyser under Build 24.');