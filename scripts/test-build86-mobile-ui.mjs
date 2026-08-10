import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = path => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

const build = read('js/build-config.js');
for (const token of [
  "id: '20260810-phase-ux-c2-5-a-mobile-player-ui-polish-v86'",
  "cache: 'shinobi-launchpad-v86'",
  "display: '2026.08.10.86'",
  "release: 'phase-ux-c2-5-a-mobile-player-ui-polish-20260810'",
  "'css/mobile-player-polish-v86.css'",
  "data-mobile-player-polish-v86"
]) assert.ok(build.includes(token), `Build 86 config missing: ${token}`);

const css = read('css/mobile-player-polish-v86.css');
for (const token of [
  '.lyrics-track-panel .lyrics-cover-wrap',
  'opacity:0!important',
  'visibility:hidden!important',
  '.lyrics-mobile-track-open',
  'display:none!important',
  '-webkit-tap-highlight-color:transparent!important',
  '.mobile-favorite-trigger.active:hover',
  '.mobile-queue-trigger:hover'
]) assert.ok(css.includes(token), `Build 86 mobile CSS missing: ${token}`);

for (const forbidden of [
  'currentTime=',
  '.play(',
  '.pause(',
  '.load(',
  'setAttribute(\'src\'',
  'removeAttribute(\'src\''
]) assert.ok(!css.includes(forbidden), `Build 86 presentation layer must not own media lifecycle: ${forbidden}`);

const loopParity = read('js/features/studio-loop-parity-v85.js');
for (const forbidden of ['audio.play(', 'audio.pause(', 'audio.load(', 'currentTime =']) {
  assert.ok(!loopParity.includes(forbidden), `Build 85/86 loop parity ancestry must remain passive: ${forbidden}`);
}

const memory = read('js/features/library-memory.js');
for (const token of [
  'renderView();',
  'decorateCards();',
  'updateButtons();',
  "button.classList.toggle('active', active)",
  "button.setAttribute('aria-pressed', String(active))"
]) assert.ok(memory.includes(token), `Favorite state refresh contract missing: ${token}`);

console.log('Build 86 mobile player/UI polish regression guards passed.');
