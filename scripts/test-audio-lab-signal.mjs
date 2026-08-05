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

const engine = fs.readFileSync('js/app-engine.js', 'utf8');
assert.ok(engine.includes("import(versioned('./features/audio-lab-signal.js'))"));
assert.ok(engine.indexOf('initAudioLabSignalBridge({ audio });') < engine.indexOf("await import(versioned('./app-main.js'))"), 'AudioLab signal bridge must be installed before the player module creates its analyser.');

const worker = fs.readFileSync('cloudflare/public-worker-v25.js', 'utf8');
for (const required of [
  "Access-Control-Allow-Origin', '*'",
  "Cross-Origin-Resource-Policy', 'cross-origin'",
  "Timing-Allow-Origin', '*'",
  'PUBLIC_WORKER_VERSION = 2.5'
]) assert.ok(worker.includes(required), `Public media Worker is missing ${required}.`);

console.log('AudioLab live signal, waveform recovery, playback fallback and public media CORS are guarded.');
