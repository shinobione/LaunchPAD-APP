import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = path => fs.readFileSync(path, 'utf8');
const live = read('js/features/visual/visual-engine-live.js');

for (const required of [
  "const DEFAULT_MODE = 'neon-shatter'",
  "{ id: 'spectrum', label: 'Spectrum' }",
  "{ id: 'neon-shatter', label: 'Neon Shatter', renderer: drawNeonShatterAdaptiveMode }",
  "{ id: 'aurora-glass', label: 'Aurora Glass', renderer: drawAuroraGlassMode }",
  'externalHomeRenderer: false',
  'const reading = readAudioLabSpectrum(raw)',
  'synthesizePlaybackSpectrum(raw, Number(audio.currentTime) || 0)',
  'const features = tracker.update(raw)',
  'const amplitudeReading = readAudioLabAmplitude(waveform)',
  'const amplitude = amplitudeTracker.update(',
  'Object.assign(features, amplitude)',
  'shapeReactiveSpectrum(raw, shaped, features)',
  'const attack = shaped[index] > reactive[index] ? .78 : .2',
  'renderMode(labCanvas, customRenderer, reactive, getAccent, time, features, mode)',
  'const customRenderer = CUSTOM_RENDERERS.get(mode)',
  "const dprCap = mode === 'neon-shatter' && mobile ? 1.2 : mobile ? 1.5 : 2",
  'CUSTOM_MOBILE_FRAME_INTERVAL = 1000 / 60',
  'base.setMode(mode)',
  "homeTitle.textContent = 'Neon Shatter'",
  "document.documentElement.dataset.audioLabRenderer = 'hybrid-reactive-v6'",
  "document.documentElement.dataset.audioLabSpectrum = controls?.querySelector('[data-visual=\"spectrum\"]') ? 'restored' : 'missing'",
  'function updateTelemetry(reading, features)',
  'data.audioLabRms = values[2]',
  'data.audioLabPeak = values[3]',
  'data.audioLabDynamics = values[4]',
  "new CustomEvent('shinobi:visual-mode'"
]) assert.ok(live.includes(required), `Live Audio Lab integration is missing ${required}.`);

for (const forbidden of [
  "'bars'",
  'wave-cathedral',
  "id: 'circle'",
  'hex-reactor',
  'drawWaveCathedralMode',
  'drawOrbitMode',
  'drawHexReactorMode',
  'visual-engine-hex-reactor.js'
]) assert.ok(!live.includes(forbidden), `Retired Audio Lab mode leaked into live integration: ${forbidden}.`);

const core = read('js/features/visual/visual-engine-core-modes.js');
for (const required of [
  'drawNeonShatterAdaptiveMode',
  'const fragments = mobile ? 20 : 52',
  'const cracks = mobile ? 9 : 16',
  'const transient = clamp(Math.max(kick, peak))',
  'const spectralIndex = Math.min(',
  'const spectralRipple = Math.sin(',
  'const spectralDeformation = (spectral - bandValue)'
]) assert.ok(core.includes(required), `Adaptive visual renderer is missing ${required}.`);

const bridge = read('js/features/visual/visual-engine.js').trim();
assert.equal(bridge, "export { createVisualController } from './visual-engine-live.js';");

const worker = read('cloudflare/public-worker-v26.js');
assert.ok(worker.includes('PUBLIC_WORKER_VERSION = 2.6'));
assert.ok(worker.includes("payload.crossOriginResourcePolicy = 'cross-origin'"));
assert.ok(worker.includes("headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')"));

console.log('Audio Lab restores Spectrum, renders mobile-adaptive Neon Shatter and drives Aurora directly from live spectral/transient data.');
