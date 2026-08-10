import assert from 'node:assert/strict';
import fs from 'node:fs';

const css = fs.readFileSync('css/global-touch-polish-v87.css', 'utf8');
const build = fs.readFileSync('js/build-config.js', 'utf8');

for (const required of [
  '@media (hover:none), (pointer:coarse)',
  '-webkit-tap-highlight-color:transparent!important',
  ':focus:not(:focus-visible)',
  '[role="button"]',
  '[role="link"]',
  '[tabindex]',
  'input,',
  'select,',
  'textarea'
]) {
  assert.ok(css.includes(required), `Build 87 global touch polish is missing ${required}.`);
}

assert.ok(!css.includes('user-select:none'), 'Build 87 must not disable text selection globally.');
assert.ok(!/\*\s*\{[^}]*outline\s*:\s*none/i.test(css), 'Build 87 must not remove focus outlines from every element.');
assert.ok(css.includes(':focus:not(:focus-visible)'), 'Build 87 must preserve real focus-visible states.');

// Build 87 is an inherited presentation layer. Future builds must keep the
// installation contract without being forced to keep Build 87 as the current
// release forever.
for (const required of [
  'installGlobalTouchPolish',
  "'css/global-touch-polish-v87.css'",
  "'globalTouchPolishV87'"
]) {
  assert.ok(build.includes(required), `Build 87 ancestry is missing ${required}.`);
}

for (const forbidden of ['.play(', '.pause(', '.load(', '.currentTime', '.src =']) {
  assert.ok(!css.includes(forbidden), `Build 87 CSS must never own media: ${forbidden}.`);
}

console.log('Build 87 global touch polish ancestry remains active, presentation-only, and focus-visible safe under the current LaunchPAD build.');
