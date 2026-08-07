import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = path => fs.readFileSync(path, 'utf8');
const live = read('js/features/visual/visual-engine-live.js');

for (const required of [
  "const DEFAULT_MODE = 'neon-shatter'",
  "{ id: 'spectrum', label: 'Spectrum' }",
  "{ id: 'neon-shatter', label: 'Neon Shatter', renderer: drawNeonShatterAdaptiveMode }",
  "{ id: 'aurora-glass', label: 'Aurora Glass', renderer: drawAuroraGlassMode }",
  "{ id: 'liquid-chrome', label: 'Liquid Chrome', renderer: drawLiquidChromeLiveMode }",
  "{ id: 'singularity', label: 'Singularity', renderer: drawSingularityLiveMode }",
  'externalHomeRenderer: false',
  'reading = readAudioLabSpectrum(raw)',
  'const features = tracker.update(raw)',
  'readAudioLabAmplitude(waveform)',
  'Object.assign(features, amplitude)',
  'boostLiveFeatures(features)',
  'renderMode(labCanvas, customRenderer, raw, getAccent, time, features, mode)',
  "const dprCap = mode === 'neon-shatter' && mobile ? 1 : mobile ? 1.35 : 2",
  'CUSTOM_MOBILE_FRAME_INTERVAL = 1000 / 60',
  'const TELEMETRY_INTERVAL = 120',
  'base.setMode(mode)',
  "homeTitle.textContent = 'Neon Shatter'",
  "document.documentElement.dataset.audioLabRenderer = 'signal-first-v9'",
  "document.documentElement.dataset.audioLabSpectrum = controls?.querySelector('[data-visual=\"spectrum\"]') ? 'restored' : 'missing'",
  'function updateTelemetry(reading, features, now)',
  'data.audioLabRms = values[2]',
  'data.audioLabPeak = values[3]',
  'data.audioLabDynamics = values[4]'
]) assert.ok(live.includes(required), `Live Audio Lab integration is missing ${required}.`);

for (const forbidden of [
  "'bars'",
  'wave-cathedral',
  "id: 'circle'",
  'hex-reactor',
  'drawWaveCathedralMode',
  'drawOrbitMode',
  'drawHexReactorMode',
  'shapeReactiveSpectrum(raw, shaped, features)',
  'renderMode(labCanvas, customRenderer, reactive'
]) {
  assert.ok(!live.includes(forbidden), `Retired or over-smoothed Audio Lab path leaked into live integration: ${forbidden}.`);
}

const core = read('js/features/visual/visual-engine-core-modes.js');
for (const required of [
  'drawNeonShatterAdaptiveMode',
  'drawAuroraGlassMode',
  'drawLiquidChromeLiveMode',
  'drawSingularityLiveMode',
  'const fragments = mobile ? 22 : 54',
  'const cracks = mobile ? 10 : 18',
  'const radialDrive = .72 + value * .82',
  'const spectralLift = (spectral - bandValue * .36)',
  'const baseRadius = .247',
  'const outerReach = minSide * .37'
]) {
  assert.ok(core.includes(required), `Signal-first visual renderer is missing ${required}.`);
}

// Neon/Aurora geometry must not be primarily time-driven. Build 50 permits only
// tiny energy-gated drift; spectral bins/deltas are the main deformation inputs.
assert.ok(core.includes('const tinyDrift = Math.sin(time * .31) * energy * .025'));
assert.ok(core.includes('const microDrift = Math.sin(time * .23) * energy * .018'));
assert.ok(!core.includes('time * speed * (2.1'));
assert.ok(!core.includes('time * (1.15 + beatDrive * 2.7)'));

const signal = read('js/features/audio-lab-signal.js');
for (const required of [
  'createDecodedSourceProxy',
  'fetch(source, {',
  'context.decodeAudioData(bytes.slice(0))',
  'context.createBufferSource()',
  "dataset.audioGraph = 'html5-direct-plus-decoded-buffer-metering'",
  "markMeter('running')"
]) {
  assert.ok(signal.includes(required), `Decoded meter is missing ${required}.`);
}
assert.ok(!signal.includes('captureStream('));
assert.ok(!signal.includes('createMirrorSourceProxy'));

const bridge = read('js/features/visual/visual-engine.js').trim();
assert.equal(bridge, "export { createVisualController } from './visual-engine-live.js';");
console.log('Audio Lab signal-first renderers consume the same decoded FFT feed as Spectrum, with moderate Liquid/Singularity scale gains.');
