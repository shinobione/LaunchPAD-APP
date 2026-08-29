import assert from 'node:assert/strict';
import fs from 'node:fs';
import { assertCurrentBuild } from './lib/build-metadata.mjs';

const read = path => fs.readFileSync(path, 'utf8');
const requireAll = (source, values, label) => values.forEach(value => assert.ok(source.includes(value), `${label} is missing ${value}.`));

const feature = read('js/features/feature-13.js');
requireAll(feature, ["const TRACK_ROUTE_PREFIX = '#track='", 'function applyTrackDetailPalette()', 'export function initPhase13'], 'Phase 13 track detail');

const base = read('js/features/visual/visual-engine-v2.js');
requireAll(base, ["{ id: 'spectrum', label: 'Spectrum' }", 'function drawSpectrum(', 'function readSpectrum(target)', 'analyser.getByteFrequencyData(target)'], 'Spectrum reference');

const premium = [
  ['js/features/visual/prism-tunnel.js', ['drawPrismTunnelMode(', 'curtainPoints(', 'traceCurtain(', 'drawSpectralDust(', 'Historical export name retained']],
  ['js/features/visual/pulse-line.js', ['drawPulseLineMode(', 'const SIGNAL_HOLD = new WeakMap()', 'stableSpectrum(', 'waveformPoints(', 'strongestPeaks(', 'const echo = points.map(']],
  ['js/features/visual/chroma-spectrum.js', ['drawChromaSpectrumMode(', 'const barCount = mobile ? 96 : 184', 'const PEAKS = new WeakMap()', 'spectrumGradient(', 'drawRearField(', 'const haze = context.createRadialGradient(']]
];
for (const [file, required] of premium) {
  const source = read(file);
  requireAll(source, required, file);
  for (const forbidden of ['Math.random(', 'requestAnimationFrame(', 'setInterval(', 'shapeMotionTarget(', 'fillText(']) assert.ok(!source.includes(forbidden), `${file} contains ${forbidden}`);
}

const registry = read('js/features/visual/audio-lab-registry.js');
const presetCount = (registry.match(/id: '[^']+'/g) || []).length;
assert.equal(presetCount, 10, 'Audio Lab must keep ten sanctioned presets.');
requireAll(registry, ["id: 'gravity-lens', label: 'Aurora Field'", "id: 'void-bloom', label: 'Pulse Line'", "id: 'creep-signal', label: 'Chroma Spectrum'"], 'Premium registry');

const live = read('js/features/visual/visual-engine-live.js');
requireAll(live, [
  "{ id: 'gravity-lens', label: 'Prism Tunnel', renderer: drawPrismTunnelMode }",
  "{ id: 'void-bloom', label: 'Pulse Line', renderer: drawPulseLineMode }",
  "{ id: 'creep-signal', label: 'Chroma Spectrum', renderer: drawChromaSpectrumMode }",
  'base.readSpectrum?.(raw)', 'reading = readAudioLabSpectrum(raw)',
  'function createAdaptiveLowPunchTracker()', 'function createDirectVisualImpactTracker()',
  'features.visualImpact = visualImpactTracker.update(features)',
  "dataset.audioLabRenderer = 'ten-core-v1'", "dataset.audioLabPresetCount = '10'",
  'const CUSTOM_FRAME_INTERVAL = 1000 / 60'
], 'Live Audio Lab');

const signal = read('js/features/audio-lab-signal.js');
requireAll(signal, ['createDecodedSourceProxy', 'context.decodeAudioData(bytes.slice(0))', "audio.dataset.audioPlaybackPath = 'html5-direct'"], 'Audio isolation');
assert.ok(!signal.includes('captureStream('));
assert.ok(!signal.includes('createMediaStreamSource('));

const worker = read('sw.js');
requireAll(worker, ["'./js/features/visual/prism-tunnel.js'", "'./js/features/visual/pulse-line.js'", "'./js/features/visual/chroma-spectrum.js'", "event.data?.type === 'GET_RELEASE'"], 'PWA shell');

const build = assertCurrentBuild('Phase 13/current release');
assert.ok(build.number >= 127, `Build 127 AudioLAB corrective pass expected, got ${build.display}.`);

await import('./test-milestone-4.mjs');
await import('./test-milestone-6.mjs');
console.log(`Phase 13 remains valid with the shared-FFT ${presetCount}-preset Audio Lab corrective Aurora pass under ${build.display}.`);
