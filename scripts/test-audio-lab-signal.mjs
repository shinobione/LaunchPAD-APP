import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  synthesizePlaybackSpectrum,
  waveformToSpectrum
} from '../js/features/audio-lab-signal.js';

const fallbackA = new Uint8Array(64);
const fallbackB = new Uint8Array(64);
synthesizePlaybackSpectrum(fallbackA, 1.25);
synthesizePlaybackSpectrum(fallbackB, 1.75);

assert.ok(Math.max(...fallbackA) > 40, 'Playback fallback must create visible spectrum energy.');
assert.notDeepEqual([...fallbackA], [...fallbackB], 'Playback fallback must evolve with playback time.');
assert.ok(fallbackA.slice(0, 12).reduce((sum, value) => sum + value, 0) > fallbackA.slice(-12).reduce((sum, value) => sum + value, 0), 'Playback fallback must preserve stronger low-frequency energy.');

const waveform = new Uint8Array(256);
for (let index = 0; index < waveform.length; index += 1) {
  waveform[index] = 128 + Math.round(Math.sin(index / 7) * 36 + Math.sin(index / 19) * 18);
}
const waveformSpectrum = new Uint8Array(64);
const rms = waveformToSpectrum(waveformSpectrum, waveform);
assert.ok(rms > .05, 'Waveform recovery must detect a meaningful signal.');
assert.ok(Math.max(...waveformSpectrum) > 20, 'Waveform recovery must produce visible frequency data.');

const silentWaveform = new Uint8Array(256).fill(128);
const silentSpectrum = new Uint8Array(64);
assert.equal(waveformToSpectrum(silentSpectrum, silentWaveform), 0);
assert.equal(Math.max(...silentSpectrum), 0);

const signal = fs.readFileSync('js/features/audio-lab-signal.js', 'utf8');
for (const required of [
  'function mediaIdentity()',
  'function invalidateCapture(reason',
  "audio.addEventListener('emptied', () => invalidateCapture('emptied'))",
  "audio.addEventListener('loadstart', () => invalidateCapture('loadstart'))",
  "attributeFilter: ['src', 'data-track-id']",
  'if (stream && captureIdentity && identity && captureIdentity !== identity)',
  "invalidateCapture('source-attribute')",
  "if (CAPTURE_STATE !== 'synthetic')",
  "markCapture('connected')",
  "markSignal('warming-capture')"
]) assert.ok(signal.includes(required), `Track-switch capture recovery is missing ${required}.`);
assert.ok(
  signal.indexOf("audio.addEventListener('loadstart', () => invalidateCapture('loadstart'))")
    < signal.indexOf("audio.addEventListener(type, connectCurrentTrack)"),
  'The old capture stream must be invalidated before new-media readiness reconnects it.'
);

const engine = fs.readFileSync('js/app-engine.js', 'utf8');
assert.ok(engine.includes("import(versioned('./features/audio-lab-signal.js'))"));
assert.ok(engine.indexOf('initAudioLabSignalBridge({ audio });') < engine.indexOf("await import(versioned('./app-main.js'))"), 'AudioLab signal bridge must be installed before the player module creates its analyser.');

const worker = fs.readFileSync('cloudflare/public-worker-v26.js', 'utf8');
for (const required of [
  "Access-Control-Allow-Origin', '*'",
  "Cross-Origin-Resource-Policy', 'cross-origin'",
  "Timing-Allow-Origin', '*'",
  "Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0'",
  'PUBLIC_WORKER_VERSION = 2.6',
  "payload.crossOriginResourcePolicy = 'cross-origin'"
]) assert.ok(worker.includes(required), `Public media Worker v2.6 is missing ${required}.`);

console.log('AudioLab live signal, track-switch capture renewal, honest fallback and public media v2.6 CORS are guarded.');