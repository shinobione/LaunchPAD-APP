import fs from 'node:fs';

const read = path => fs.readFileSync(path, 'utf8');
const fail = message => { throw new Error(message); };

const readiness = read('js/features/audio-readiness.js');
for (const required of [
  "audio.preload = 'auto'",
  "audio.setAttribute('preload', 'auto')",
  'navigator.userActivation?.isActive',
  'PLAY_START_WATCHDOG_MS',
  'prepareSourceInsideGesture',
  'refreshCurrentSource({ forceLoad: true })',
  'recoverPendingStart',
  "audio.dataset.playbackRequestState = 'idle'",
  'audio.shinobiRetryPlayback',
  "event.stopImmediatePropagation()",
  'audio.networkState === HTMLMediaElement.NETWORK_EMPTY',
  'audio.networkState === HTMLMediaElement.NETWORK_NO_SOURCE'
]) {
  if (!readiness.includes(required)) fail(`Audio readiness is missing ${required}.`);
}

const signal = read('js/features/audio-lab-signal.js');
for (const required of [
  'function captureMethod(audio)',
  'function createCaptureSourceProxy(context, audio)',
  'context.createMediaStreamSource(scopedStream)',
  "document.documentElement.dataset.audioGraph = 'html5-direct-plus-capture-metering'",
  "document.documentElement.dataset.audioGraph = 'html5-direct-plus-synthetic-metering'",
  "audio.dataset.audioPlaybackPath = 'html5-direct'",
  'async function suspendContexts()',
  "window.addEventListener('pagehide'",
  'patchAudioContextClass(globalThis.AudioContext, audio)'
]) {
  if (!signal.includes(required)) fail(`Background-safe Audio Lab metering is missing ${required}.`);
}
if (!signal.includes("if (element === audio) {\n        ACTIVE_CONTEXTS.add(this);\n        return createCaptureSourceProxy(this, audio);")) {
  fail('The primary audio element must never be routed through MediaElementAudioSourceNode.');
}

const publicWorker = read('cloudflare/public-worker.js');
for (const required of [
  'request.headers.get("range")',
  'bucket.get(key, { range: parsedRange })',
  'headers.set("Accept-Ranges", "bytes")',
  'headers.set("Content-Range"',
  'status: 206',
  'headers.set("Content-Length", String(object.range.length))'
]) {
  if (!publicWorker.includes(required)) fail(`Range-safe R2 streaming is missing ${required}.`);
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

const player = read('js/features/player-experience.js');
for (const required of [
  "const SITE_TITLE = 'ShinoBiWan LaunchPAD'",
  'return getTrack(audio.dataset.trackId) || null',
  'function syncDocumentTitle()',
  'const titleObserver = new MutationObserver',
  "titleObserver.observe(titleElement",
  "window.addEventListener('shinobi:route-change', scheduleSync)",
  "audio.dataset.playbackRequestState === 'starting'",
  'function setPlaybackDatasetIfChanged(button, state)',
  "setPlaybackDatasetIfChanged(button, 'loading')",
  '#view-lyrics.lyrics-studio-mode .lyrics-track-select'
]) {
  if (!player.includes(required)) fail(`Studio player reliability is missing ${required}.`);
}

const lyrics = read('js/features/lyrics/lyrics-engine.js');
for (const required of [
  'export function seekAudioToTimestamp',
  'requestTimestamp',
  "['loadedmetadata', 'durationchange', 'canplay']",
  'startSyncClock',
  'timestamp - lastSyncAt >= 90'
]) {
  if (!lyrics.includes(required)) fail(`Lyrics seek reliability is missing ${required}.`);
}

const browserTest = read('tests/audio-startup-smoke.html');
for (const required of [
  'The tab title followed the viewed route instead of the loaded audio track.',
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

console.log('Buffered native playback, capture-only Audio Lab metering, Range streaming and playback recovery are covered.');
