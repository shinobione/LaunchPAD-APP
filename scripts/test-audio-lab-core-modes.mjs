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
  "{ id: 'prism-tunnel', label: 'Prism Tunnel' }",
  "{ id: 'aurora-glass', label: 'Aurora Glass' }",
  "{ id: 'cyber-rain', label: 'Cyber Rain' }",
  "{ id: 'wave-cathedral', label: 'Wave Cathedral' }",
  "{ id: 'quantum-grid', label: 'Quantum Grid' }",
  "const OVERLAY_MODES = new Set(['circle', ...SHOWCASE_MODES.map(mode => mode.id)])",
  'export function drawOrbitMode(',
  'export function drawPrismTunnelMode(',
  'export function drawAuroraGlassMode(',
  'export function drawCyberRainMode(',
  'export function drawWaveCathedralMode(',
  'export function drawQuantumGridMode(',
  "controls.querySelector('[data-visual=\"constellation\"]')?.remove()",
  "case 'prism-tunnel': drawPrismTunnelMode(...args); break;",
  "case 'aurora-glass': drawAuroraGlassMode(...args); break;",
  "case 'cyber-rain': drawCyberRainMode(...args); break;",
  "case 'wave-cathedral': drawWaveCathedralMode(...args); break;",
  "case 'quantum-grid': drawQuantumGridMode(...args); break;",
  "controls.style.overflowX = 'auto'",
  'canvas.dataset.visualMode = mode',
  "button.addEventListener('click'",
  'synthesizePlaybackSpectrum(data',
  'createBaseVisualController(options)'
]) {
  assert.ok(core.includes(required), `Audio Lab showcase renderer is missing ${required}.`);
}
assert.ok(!core.includes('drawConstellationMode'), 'Constellation renderer must be removed.');

const index = read('index.html');
for (const required of [
  'data-visual="circle">Orbit',
  'data-visual="bars">Spectrum'
]) {
  assert.ok(index.includes(required), `Audio Lab control is missing ${required}.`);
}

const worker = read('sw.js');
assert.ok(
  worker.includes("'./js/features/visual/visual-engine-core-modes.js'"),
  'The installed PWA must cache the Audio Lab showcase renderer.'
);

const build = read('js/build-config.js');
for (const required of [
  "id: '20260805-audiolab-core-modes'",
  "cache: 'shinobi-launchpad-v23'",
  "revision: 'audiolab-showcase-five-1'",
  "display: '2026.08.05.23'",
  "release: 'audiolab-showcase-five-20260805'"
]) {
  assert.ok(build.includes(required), `Audio Lab showcase release metadata is missing ${required}.`);
}

console.log('Constellation is removed and five distinct premium Audio Lab effects are installed under Build 23.');
