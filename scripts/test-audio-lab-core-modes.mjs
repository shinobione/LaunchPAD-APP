import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = path => fs.readFileSync(path, 'utf8');

const bridge = read('js/features/visual/visual-engine.js').trim();
assert.equal(
  bridge,
  "export { createVisualController } from './visual-engine-core-modes.js';",
  'Audio Lab must load the core-mode compatibility renderer.'
);

const core = read('js/features/visual/visual-engine-core-modes.js');
for (const required of [
  "const CORE_MODES = new Set(['circle', 'bars', 'constellation'])",
  'export function drawOrbitMode(',
  'export function drawConstellationMode(',
  "if (mode === 'circle')",
  "mode !== 'bars'",
  'canvas.dataset.visualMode = mode',
  "button.addEventListener('click'",
  'synthesizePlaybackSpectrum(data',
  'createBaseVisualController(options)'
]) {
  assert.ok(core.includes(required), `Audio Lab core mode renderer is missing ${required}.`);
}

const index = read('index.html');
for (const required of [
  'data-visual="circle">Orbit',
  'data-visual="bars">Spectrum',
  'data-visual="constellation">Constellation'
]) {
  assert.ok(index.includes(required), `Audio Lab control is missing ${required}.`);
}

const worker = read('sw.js');
assert.ok(
  worker.includes("'./js/features/visual/visual-engine-core-modes.js'"),
  'The installed PWA must cache the Audio Lab core renderer.'
);

const build = read('js/build-config.js');
for (const required of [
  "id: '20260805-audiolab-core-modes'",
  "cache: 'shinobi-launchpad-v22'",
  "revision: 'audiolab-core-modes-1'",
  "display: '2026.08.05.22'",
  "release: 'audiolab-core-modes-fix-20260805'"
]) {
  assert.ok(build.includes(required), `Audio Lab release metadata is missing ${required}.`);
}

console.log('Orbit, Spectrum and Constellation use distinct render paths and are cached by the PWA.');
