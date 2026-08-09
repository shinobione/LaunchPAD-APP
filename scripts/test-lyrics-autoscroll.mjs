import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  centeredScrollTop,
  centerElementInScrollContainer,
  seekAudioToTimestamp
} from '../js/features/lyrics/lyrics-engine.js';

const scrollCalls = [];
const reader = {
  scrollTop: 120,
  clientHeight: 240,
  scrollHeight: 1400,
  getBoundingClientRect() {
    return { top: 420, bottom: 660, height: 240 };
  },
  scrollTo(options) {
    scrollCalls.push(options);
    this.scrollTop = options.top;
  }
};

const line = {
  offsetTop: 1230,
  offsetHeight: 52,
  getBoundingClientRect() {
    return { top: 1000, bottom: 1052, height: 52 };
  }
};

const expected = 606;
assert.equal(centeredScrollTop(reader, line), expected);
assert.equal(centerElementInScrollContainer(reader, line, 'auto'), true);
assert.deepEqual(scrollCalls.at(-1), { top: expected, behavior: 'auto' });
assert.notEqual(scrollCalls.at(-1).top, line.offsetTop);

const aboveReader = {
  offsetTop: -900,
  offsetHeight: 40,
  getBoundingClientRect() {
    return { top: -200, bottom: -160, height: 40 };
  }
};
assert.equal(centeredScrollTop({ ...reader, scrollTop: 0 }, aboveReader), 0);

const belowReader = {
  offsetTop: 9000,
  offsetHeight: 40,
  getBoundingClientRect() {
    return { top: 9000, bottom: 9040, height: 40 };
  }
};
const maximum = reader.scrollHeight - reader.clientHeight;
assert.equal(centeredScrollTop({ ...reader, scrollTop: 0 }, belowReader), maximum);

const readyAudio = {
  readyState: 1,
  duration: 220,
  currentTime: 0
};
assert.equal(seekAudioToTimestamp(readyAudio, 42.5), true);
assert.equal(readyAudio.currentTime, 42.5);

let fastSeekValue = null;
const fastSeekAudio = {
  readyState: 2,
  duration: 220,
  fastSeek(value) { fastSeekValue = value; }
};
assert.equal(seekAudioToTimestamp(fastSeekAudio, 73.25), true);
assert.equal(fastSeekValue, 73.25);

const unreadyAudio = {
  readyState: 0,
  duration: Number.NaN,
  currentTime: 0
};
assert.equal(seekAudioToTimestamp(unreadyAudio, 18), false);
assert.equal(unreadyAudio.currentTime, 0);
assert.equal(seekAudioToTimestamp(readyAudio, Number.NaN), false);

const engineSource = fs.readFileSync('js/features/lyrics/lyrics-engine.js', 'utf8');
for (const marker of [
  'let seekInProgress = false',
  'function beginSeek(time)',
  'function settleSeek(time = audio.currentTime)',
  "window.addEventListener('shinobi:seek-preview'",
  "window.addEventListener('shinobi:seek-commit'",
  "audio.addEventListener('seeking'",
  "audio.addEventListener('seeked'",
  "update(time, { behavior: 'auto', forceCenter: true, allowScroll: true })",
  'if (syncFrame || !syncSurfaceActive() || seekInProgress) return;'
]) {
  assert.ok(engineSource.includes(marker), `Build 77 Lyrics seek settlement is missing ${marker}.`);
}
assert.ok(!engineSource.includes("['seeking', 'seeked', 'loadedmetadata', 'durationchange']"), 'Build 77 must not collapse seeking and seeked into the old shared scroll handler.');

const studioSource = fs.readFileSync('js/features/lyrics-studio.js', 'utf8');
for (const marker of [
  'function installSingleCommitSeek()',
  "seek.addEventListener('input', preview, { capture: true })",
  "seek.addEventListener('pointerup', commit, { capture: true })",
  "seek.addEventListener('change', commit, { capture: true })",
  'event.stopImmediatePropagation()',
  "window.dispatchEvent(new CustomEvent('shinobi:seek-preview'",
  "window.dispatchEvent(new CustomEvent('shinobi:seek-commit'"
]) {
  assert.ok(studioSource.includes(marker), `Build 77 single-commit seek is missing ${marker}.`);
}

console.log('Lyrics auto-scroll, timestamp seeking and Build 77 single-commit seek settlement are regression-protected.');
