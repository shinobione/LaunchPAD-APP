import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = path => fs.readFileSync(path, 'utf8');
const live = read('js/features/visual/visual-engine-live.js');

for (const required of [
  "const DEFAULT_MODE = 'neon-shatter'",
  "{ id: 'neon-shatter', label: 'Neon Shatter', renderer: drawNeonShatterV2Mode }",
  "{ id: 'spectrum', label: 'Spectrum' }",
  "{ id: 'liquid-chrome', label: 'Liquid Chrome', renderer: drawLiquidChromeV2Mode }",
  "{ id: 'pulse-reactor', label: 'Pulse Reactor', renderer: drawPulseReactorMode }",
  'externalHomeRenderer: false',
  'base.readSpectrum?.(raw)',
  'reading = readAudioLabSpectrum(raw)',
  'const features = tracker.update(raw)',
  'boostLiveFeatures(features)',
  'renderMode(labCanvas, customRenderer, raw, getAccent, time, features, mode)',
  "mode === 'neon-shatter' ? 1 : mode === 'pulse-reactor' ? 1.1 : 1.35",
  'const CUSTOM_FRAME_INTERVAL = 1000 / 60',
  'const TELEMETRY_INTERVAL = 120',
  'base.setMode(mode)',
  "document.documentElement.dataset.audioLabRenderer = 'four-core-v1'",
  "document.documentElement.dataset.audioLabPresetCount = '4'",
  'data.audioLabBass = values[1]',
  'data.audioLabMid = values[2]',
  'data.audioLabHigh = values[3]'
]) assert.ok(live.includes(required), `Live Audio Lab integration is missing ${required}.`);

for (const forbidden of [
  'aurora-glass',
  'nebula',
  'singularity',
  "'bars'",
  'wave-cathedral',
  "id: 'circle'",
  'hex-reactor',
  'drawAuroraGlassMode',
  'drawSingularityLiveMode',
  'drawNeonShatterAdaptiveMode',
  'drawLiquidChromeLiveMode',
  'shapeReactiveSpectrum(raw, shaped, features)',
  'synthesizePlaybackSpectrum',
  'readAudioLabAmplitude'
]) {
  assert.ok(!live.includes(forbidden), `Retired or parallel Audio Lab path leaked into live integration: ${forbidden}.`);
}

const core = read('js/features/visual/visual-engine-core-modes.js');
for (const required of [
  'drawNeonShatterV2Mode',
  'drawLiquidChromeV2Mode',
  'const impact = clamp(',
  'const pulse = clamp(',
  'const gatedDrift = time * activity * .16',
  'const phase = time * activity * .2',
  'localDrive * .92',
  'spectralDeform = spectral * .092'
]) {
  assert.ok(core.includes(required), `FFT-driven visual renderer is missing ${required}.`);
}

const reactor = read('js/features/visual/pulse-reactor.js');
for (const required of [
  'drawPulseReactorMode',
  'const activity = clamp(',
  'const impact = clamp(',
  'const drift = time * activity * .075',
  'const ringCount = mobile ? 3 : 5',
  'const segmentCount = mobile ? 18 : 32',
  'const spokeCount = mobile ? 16 : 30',
  'sampleAt(data, progress',
  'sampleAt(data, .46 + progress * .54)'
]) {
  assert.ok(reactor.includes(required), `Pulse Reactor FFT/mobile renderer is missing ${required}.`);
}

// Time may provide tiny drift, but only when the shared audio signal has
// energy. Silence therefore produces stable imagery instead of fake animation.
assert.ok(core.includes('const gatedDrift = time * activity * .16'));
assert.ok(core.includes('const phase = time * activity * .2'));
assert.ok(reactor.includes('const drift = time * activity * .075'));
assert.ok(!core.includes('time * .55'));
assert.ok(!core.includes('time * .83'));
assert.ok(!reactor.includes('requestAnimationFrame('));
assert.ok(!reactor.includes('setInterval('));

const base = read('js/features/visual/visual-engine-v2.js');
for (const required of [
  'function readSpectrum(target)',
  'analyser.getByteFrequencyData(target)',
  'function drawSpectrum(',
  'return { resume, setMode, readSpectrum }'
]) {
  assert.ok(base.includes(required), `Shared Spectrum analyser contract is missing ${required}.`);
}
for (const forbidden of ['drawNebula(', 'drawSingularity(', 'drawNeonShatter(', 'drawLiquidChrome(']) {
  assert.ok(!base.includes(forbidden), `Legacy renderer remains in the Spectrum reference engine: ${forbidden}.`);
}

const bridge = read('js/features/visual/visual-engine.js').trim();
assert.equal(bridge, "export { createVisualController } from './visual-engine-live.js';");
console.log('Audio Lab custom visuals consume Spectrum’s analyser; Pulse Reactor is mobile-budgeted and signal-first.');
