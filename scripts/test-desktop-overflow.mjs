import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = path => fs.readFileSync(path, 'utf8');

const styles = read('css/feature-12.css');
for (const required of [
  'html,\nbody{',
  'overflow-x:hidden',
  'overscroll-behavior-x:none',
  '.app-shell{',
  'overflow-x:clip',
  '.sidebar{',
  '.sidebar .main-nav',
  '.sidebar .side-player',
  '.sidebar .social-dock',
  '.sidebar .social-platform',
  'box-sizing:border-box',
  'text-overflow:ellipsis'
]) {
  assert.ok(styles.includes(required), `Desktop root overflow guard is missing ${required}.`);
}

const build = read('js/build-config.js');
for (const required of [
  "id: '20260805-audiolab-signal'",
  "cache: 'shinobi-launchpad-v18'",
  "revision: 'root-overflow-lock-1'",
  "display: '2026.08.05.18'",
  "release: 'root-overflow-lock-20260805'"
]) {
  assert.ok(build.includes(required), `Root overflow release metadata is missing ${required}.`);
}

console.log('Desktop and installed-PWA root horizontal overflow guards are present.');
