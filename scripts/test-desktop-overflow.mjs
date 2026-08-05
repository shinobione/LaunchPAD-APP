import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = path => fs.readFileSync(path, 'utf8');

const styles = read('css/feature-12.css');
for (const required of [
  '.sidebar{',
  'overflow-x:clip',
  '.sidebar .main-nav',
  '.sidebar .side-player',
  '.sidebar .social-dock',
  '.sidebar .social-platform',
  'box-sizing:border-box',
  'text-overflow:ellipsis'
]) {
  assert.ok(styles.includes(required), `Desktop sidebar overflow guard is missing ${required}.`);
}

assert.ok(!styles.includes('html,\nbody{'), 'Overflow fix must not clip the entire application document.');
assert.ok(!styles.includes('.app-shell{\n  width:100%'), 'Overflow fix must remain scoped to the sidebar.');

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

console.log('Desktop and installed-PWA sidebar overflow guards are present.');
