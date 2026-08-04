import fs from 'node:fs';

const read = path => fs.readFileSync(path, 'utf8');
const fail = message => { throw new Error(message); };

const readiness = read('js/features/audio-readiness.js');
for (const required of [
  'PLAY_START_WATCHDOG_MS',
  'prepareSourceInsideGesture',
  'refreshCurrentSource({ forceLoad: true })',
  'recoverPendingStart',
  'audio.networkState === HTMLMediaElement.NETWORK_EMPTY',
  'audio.networkState === HTMLMediaElement.NETWORK_NO_SOURCE'
]) {
  if (!readiness.includes(required)) fail(`Audio readiness is missing ${required}.`);
}

const resilience = read('js/features/resilience-accessibility.js');
for (const required of [
  "const track = getTrack(audio.dataset.trackId)",
  "audio.setAttribute('src', source)",
  "audio.dataset.forceLoad = 'true'",
  "window.setTimeout(restartPlayback, 320)"
]) {
  if (!resilience.includes(required)) fail(`Audio Retry is missing ${required}.`);
}

const browserTest = read('tests/audio-startup-smoke.html');
for (const required of [
  'Direct Studio playback never recovered.',
  'Retry did not rebuild the catalog audio source.',
  'STUDIO AUDIO READY WATCHDOG SOURCE REBUILD RETRY'
]) {
  if (!browserTest.includes(required)) fail(`Studio audio browser regression is missing ${required}.`);
}

const visualRunner = read('scripts/capture-visuals.sh');
if (!visualRunner.includes('run_audio_startup_smoke')) {
  fail('Studio audio startup browser regression is not wired into CI.');
}

console.log('Direct Studio playback watchdog, source rebuild and Retry recovery are covered.');
