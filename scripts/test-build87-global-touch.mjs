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

for (const required of [
  "id: '20260810-phase-ux-c2-5-a-global-touch-polish-v87'",
  "cache: 'shinobi-launchpad-v87'",
  "display: '2026.08.10.87'",
  "release: 'phase-ux-c2-5-a-global-touch-polish-20260810'",
  'installGlobalTouchPolish',
  "'css/global-touch-polish-v87.css'",
  "'globalTouchPolishV87'"
]) {
  assert.ok(build.includes(required), `Build 87 bootstrap is missing ${required}.`);
}

for (const forbidden of ['.play(', '.pause(', '.load(', '.currentTime', '.src =']) {
  assert.ok(!css.includes(forbidden), `Build 87 CSS must never own media: ${forbidden}.`);
}

console.log('Build 87 global touch polish is presentation-only, removes touch highlight globally, and preserves focus-visible accessibility.');
