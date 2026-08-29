import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = path => fs.readFileSync(path, 'utf8');
const live = read('js/features/visual/visual-engine-live.js');

for (const required of [
  "const DEFAULT_MODE = 'neon-ribbon'",
  "{ id: 'neon-shatter', label: 'Neon Shatter', renderer: drawNeonShatterV2Mode }",
  "{ id: 'spectrum', label: 'Spectrum' }",
  "{ id: 'neon-ribbon', label: 'Neon Ribbon', renderer: drawNeonRibbonMode }",
  "{ id: 'gravity-lens', label: 'Neon Horizon', renderer: drawNeonHorizonMode }",
  "{ id: 'void-bloom', label: 'Pulse Line', renderer: drawPulseLineMode }",
  "{ id: 'creep-signal', label: 'Chroma Spectrum', renderer: drawChromaSpectrumMode }",
  "const KINETIC_MODE_IDS = new Set(['pulse-reactor', 'bass-fracture', 'gravity-lens', 'bio-structure', 'void-bloom', 'creep-signal'])",
  'base.readSpectrum?.(raw)', 'reading = readAudioLabSpectrum(raw)', 'boostLiveFeatures(features)',
  'function createAdaptiveLowPunchTracker()', 'relativeContrast', 'relativeFlux', 'relativeRise',
  'function createDirectVisualImpactTracker()', 'punchRise * 3.8', 'kickRise * 2.25', 'contrastRise * 6.5',
  'function applyDirectKineticImpact(context, width, height, mode, features)',
  "mode === 'gravity-lens' || mode === 'void-bloom' || mode === 'creep-signal'",
  'function kineticImpactFeatures(mode, features)', 'punch * 1.08', 'punch * .92',
  'features.punch = adaptivePunch.punch', 'features.visualImpact = visualImpactTracker.update(features)',
  'data.audioLabPunch = values[5]', 'data.audioLabVisualImpact = values[6]',
  "document.documentElement.dataset.audioLabRenderer = 'ten-core-v1'",
  "document.documentElement.dataset.audioLabPresetCount = '10'",
  'const CUSTOM_FRAME_INTERVAL = 1000 / 60'
]) assert.ok(live.includes(required), `Live Audio Lab integration is missing ${required}.`);

for (const forbidden of ['synthesizePlaybackSpectrum', 'readAudioLabAmplitude']) {
  assert.ok(!live.includes(forbidden), `Parallel Audio Lab path leaked into live integration: ${forbidden}.`);
}

const premium = [
  ['js/features/visual/neon-horizon.js', ['drawNeonHorizonMode(', 'const punchWave =', 'const rowCount = 24']],
  ['js/features/visual/pulse-line.js', ['drawPulseLineMode(', 'waveformPath(', 'const flareX =']],
  ['js/features/visual/chroma-spectrum.js', ['drawChromaSpectrumMode(', 'const PEAKS = new WeakMap()', 'const barCount = mobile ? 54 : 104']]
];
for (const [file, required] of premium) {
  const source = read(file);
  required.forEach(value => assert.ok(source.includes(value), `${file} missing ${value}`));
  for (const forbidden of ['requestAnimationFrame(', 'setInterval(', 'Math.random(']) assert.ok(!source.includes(forbidden), `${file} contains ${forbidden}`);
}

const base = read('js/features/visual/visual-engine-v2.js');
for (const required of ['function readSpectrum(target)', 'analyser.getByteFrequencyData(target)', 'function drawSpectrum(', 'return { resume, setMode, readSpectrum }']) {
  assert.ok(base.includes(required), `Shared Spectrum analyser contract is missing ${required}.`);
}

const bridge = read('js/features/visual/visual-engine.js').trim();
assert.equal(bridge, "export { createVisualController } from './visual-engine-live.js';");
console.log('Audio Lab keeps shared-FFT live reactivity and exposes the Build 122 premium visual pack.');
