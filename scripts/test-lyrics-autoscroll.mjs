import assert from 'node:assert/strict';
import {
  centeredScrollTop,
  centerElementInScrollContainer
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
  // Deliberately unrelated to the reader. The old implementation incorrectly
  // used this page-relative value and would scroll far beyond the current line.
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

console.log('Lyrics auto-scroll uses reader-relative geometry and clamps safely.');
