import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = path => fs.readFileSync(path, 'utf8');
const live = read('js/features/visual/visual-engine-live.js');

for (const required of [
  "const DEFAULT_MODE = 'wave-cathedral'",
  'const reading = readAudioLabSpectrum(raw)',
  'synthesizePlaybackSpectrum(raw, Number(audio.currentTime) || 0)',
  'const features = tracker.update(raw)',
  'shapeReactiveSpectrum(raw, shaped, features)',
  'const attack = shaped[index] > reactive[index] ? .72 : .18',
  'renderMode(homeCanvas, drawWaveCathedralMode, reactive, getAccent, time, features)',
  'const customRenderer = CUSTOM_RENDERERS.get(mode)',
  'base.setMode(mode)',
  "homeTitle.textContent = 'Wave Cathedral'",
  "document.documentElement.dataset.audioLabRenderer = 'fft-transient-v2'"
]) assert.ok(live.includes(required), `Live Audio Lab integration is missing ${required}.`);

const waveIndex = live.indexOf("{ id: 'wave-cathedral'");
const orbitIndex = live.indexOf("{ id: 'circle'");
const auroraIndex = live.indexOf("{ id: 'aurora-glass'");
assert.ok(waveIndex >= 0 && waveIndex < orbitIndex && orbitIndex < auroraIndex, 'Wave Cathedral, Orbit and Aurora Glass must be registered in the intended order.');

const bridge = read('js/features/visual/visual-engine.js').trim();
assert.equal(bridge, "export { createVisualController } from './visual-engine-live.js';");

const worker = read('cloudflare/public-worker-v26.js');
assert.ok(worker.includes('PUBLIC_WORKER_VERSION = 2.6'));
assert.ok(worker.includes("payload.crossOriginResourcePolicy = 'cross-origin'"));
assert.ok(worker.includes("headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')"));

console.log('Audio Lab uses reusable FFT envelopes and kick transients while Wave Cathedral remains the default.');
