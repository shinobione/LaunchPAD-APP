import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = path => fs.readFileSync(path, 'utf8');
const live = read('js/features/visual/visual-engine-live.js');

for (const required of [
  "const DEFAULT_MODE = 'neon-shatter'",
  "{ id: 'aurora-glass', label: 'Aurora Glass', renderer: drawAuroraGlassMode }",
  'externalHomeRenderer: false',
  'const reading = readAudioLabSpectrum(raw)',
  'synthesizePlaybackSpectrum(raw, Number(audio.currentTime) || 0)',
  'const features = tracker.update(raw)',
  'const amplitudeReading = readAudioLabAmplitude(waveform)',
  'const amplitude = amplitudeTracker.update(',
  'Object.assign(features, amplitude)',
  'shapeReactiveSpectrum(raw, shaped, features)',
  'const attack = shaped[index] > reactive[index] ? .72 : .18',
  'renderMode(homeCanvas, customRenderer, reactive, getAccent, time, features)',
  'const customRenderer = CUSTOM_RENDERERS.get(mode)',
  'base.setMode(mode)',
  "homeTitle.textContent = 'Neon Shatter'",
  "document.documentElement.dataset.audioLabRenderer = 'hybrid-reactive-v5'",
  'function updateTelemetry(reading, features)',
  'data.audioLabRms = values[2]',
  'data.audioLabPeak = values[3]',
  'data.audioLabDynamics = values[4]',
  "new CustomEvent('shinobi:visual-mode'"
]) assert.ok(live.includes(required), `Live Audio Lab integration is missing ${required}.`);

for (const forbidden of [
  'wave-cathedral',
  "id: 'circle'",
  'hex-reactor',
  'drawWaveCathedralMode',
  'drawOrbitMode',
  'drawHexReactorMode',
  'visual-engine-hex-reactor.js'
]) assert.ok(!live.includes(forbidden), `Retired Audio Lab mode leaked into live integration: ${forbidden}.`);

const bridge = read('js/features/visual/visual-engine.js').trim();
assert.equal(bridge, "export { createVisualController } from './visual-engine-live.js';");

const worker = read('cloudflare/public-worker-v26.js');
assert.ok(worker.includes('PUBLIC_WORKER_VERSION = 2.6'));
assert.ok(worker.includes("payload.crossOriginResourcePolicy = 'cross-origin'"));
assert.ok(worker.includes("headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')"));

console.log('Audio Lab uses live RMS/peak dynamics, Neon Shatter as Home default, Aurora as a custom mode and no retired renderer routes.');
