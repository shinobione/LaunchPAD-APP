import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = path => fs.readFileSync(path, 'utf8');
const live = read('js/features/visual/visual-engine-live.js');

for (const required of [
  "const DEFAULT_MODE = 'wave-cathedral'",
  "const reading = readAudioLabSpectrum(raw)",
  'synthesizePlaybackSpectrum(raw, Number(audio.currentTime) || 0)',
  'Math.pow(raw[index] / 255, .72)',
  'const attack = boosted > smoothed[index] ? .58 : .2',
  'renderMode(homeCanvas, drawWaveCathedralMode, reactive, getAccent, time)',
  'const customRenderer = CUSTOM_RENDERERS.get(mode)',
  "homeTitle.textContent = 'Wave Cathedral'",
  "document.documentElement.dataset.audioLabRenderer = 'live-analyser'",
  "document.documentElement.dataset.audioLabFeed = reading.state"
]) {
  assert.ok(live.includes(required), `Live Audio Lab integration is missing ${required}.`);
}

const waveIndex = live.indexOf("{ id: 'wave-cathedral'");
const orbitIndex = live.indexOf("{ id: 'circle'");
assert.ok(waveIndex >= 0 && waveIndex < orbitIndex, 'Wave Cathedral must be the first selectable custom effect.');

const bridge = read('js/features/visual/visual-engine.js').trim();
assert.equal(bridge, "export { createVisualController } from './visual-engine-live.js';");

const worker = read('cloudflare/public-worker-v26.js');
assert.ok(worker.includes("PUBLIC_WORKER_VERSION = 2.6"));
assert.ok(worker.includes("payload.crossOriginResourcePolicy = 'cross-origin'"));
assert.ok(worker.includes("headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')"));

console.log('Audio Lab custom effects use live analyser data, Wave Cathedral is first/default, and public Worker v2.6 health is hardened.');
