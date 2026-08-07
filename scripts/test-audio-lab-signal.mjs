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
assert.ok(Math.max(...fallbackA) > 40);
assert.notDeepEqual([...fallbackA], [...fallbackB]);

const waveform = new Uint8Array(256);
for (let index = 0; index < waveform.length; index += 1) {
  waveform[index] = 128 + Math.round(Math.sin(index / 7) * 36 + Math.sin(index / 19) * 18);
}
const waveformSpectrum = new Uint8Array(64);
assert.ok(waveformToSpectrum(waveformSpectrum, waveform) > .05);
assert.ok(Math.max(...waveformSpectrum) > 20);

const signal = fs.readFileSync('js/features/audio-lab-signal.js', 'utf8');
for (const required of [
  'function createMirrorSourceProxy(context, audio, nativeCreateMediaElementSource)',
  "mirror.dataset.audioLabMirror = 'true'",
  "document.documentElement.dataset.audioGraph = 'html5-direct-plus-mirror-metering'",
  "audio.dataset.audioPlaybackPath = 'html5-direct'",
  'nativeCreateMediaElementSource.call(context, mirror)',
  "audio.addEventListener('loadstart'",
  "attributeFilter: ['src', 'data-track-id']",
  "audio.addEventListener('timeupdate'",
  "audio.addEventListener('seeking'",
  "window.addEventListener('shinobi:route-change'",
  "document.addEventListener('pointerdown'",
  'MIRROR_PROXIES.forEach(proxy => proxy.suspend?.())',
  "markMeter('running')"
]) assert.ok(signal.includes(required), `Mirror metering is missing ${required}.`);
assert.ok(!signal.includes('captureStream('), 'Audio Lab must not depend on captureStream for production metering.');
assert.ok(!signal.includes('createMediaStreamSource('), 'Audio Lab mirror metering must not reuse the retired MediaStream graph.');

const engine = fs.readFileSync('js/app-engine.js', 'utf8');
assert.ok(engine.includes("import(versioned('./features/audio-lab-signal.js'))"));
assert.ok(engine.indexOf('initAudioLabSignalBridge({ audio });') < engine.indexOf("await import(versioned('./app-main.js'))"));

const worker = fs.readFileSync('cloudflare/public-worker-v26.js', 'utf8');
for (const required of [
  "Access-Control-Allow-Origin', '*'",
  "Cross-Origin-Resource-Policy', 'cross-origin'",
  "Timing-Allow-Origin', '*'",
  'PUBLIC_WORKER_VERSION = 2.6'
]) assert.ok(worker.includes(required), `Public media Worker v2.6 is missing ${required}.`);

console.log('Audio Lab uses a source-switch-safe mirror meter while audible playback stays on native HTML5 audio.');