import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = path => fs.readFileSync(path, 'utf8');

const styles = read('css/feature-12.css');
for (const required of [
  'html,\nbody',
  'overflow-x:clip',
  'overscroll-behavior-x:none',
  '.app-shell',
  '.sidebar',
  '.sidebar .social-dock',
  '.sidebar .social-platform',
  '.player-bar',
  'width:min(250px,88vw)'
]) {
  assert.ok(styles.includes(required), `Desktop overflow guard is missing ${required}.`);
}

const build = read('js/build-config.js');
for (const required of [
  "id: '20260805-audiolab-signal'",
  "cache: 'shinobi-launchpad-v17'",
  "revision: 'desktop-overflow-fix-1'",
  "display: '2026.08.05.17'",
  "release: 'desktop-overflow-fix-20260805'"
]) {
  assert.ok(build.includes(required), `Desktop overflow release metadata is missing ${required}.`);
}

console.log('Desktop and installed-PWA horizontal overflow guards are present.');
