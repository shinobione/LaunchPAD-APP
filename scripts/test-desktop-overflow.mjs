import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = path => fs.readFileSync(path, 'utf8');

const styles = read('css/feature-12.css');
for (const required of [
  'html,\nbody{',
  'overflow-x:clip!important',
  'overscroll-behavior-x:none',
  '.app-shell,\n.main-content,\n.sidebar{',
  'html::-webkit-scrollbar:horizontal',
  'body::-webkit-scrollbar:horizontal',
  '.app-shell::-webkit-scrollbar:horizontal',
  '.main-content::-webkit-scrollbar:horizontal',
  '.sidebar::-webkit-scrollbar:horizontal',
  'display:none!important',
  'height:0!important',
  '.sidebar .main-nav',
  '.sidebar .side-player',
  '.sidebar .social-dock',
  '.sidebar .social-platform',
  'box-sizing:border-box',
  'text-overflow:ellipsis'
]) {
  assert.ok(styles.includes(required), `Desktop native scrollbar guard is missing ${required}.`);
}

const build = read('js/build-config.js');
for (const required of [
  "id: '20260805-mobile-hero-order'",
  "cache: 'shinobi-launchpad-v20'",
  "revision: 'mobile-hero-order-1'",
  "display: '2026.08.05.20'",
  "release: 'mobile-hero-order-fix-20260805'",
  "id: '20260805-native-scrollbar-fix'",
  "cache: 'shinobi-launchpad-v19'"
]) {
  assert.ok(build.includes(required), `PWA release metadata is missing ${required}.`);
}

const activeId = build.match(/const config = Object\.freeze\(\{[\s\S]*?id:\s*'([^']+)'/)?.[1];
assert.equal(activeId, '20260805-mobile-hero-order', 'The active stylesheet cache key must match the current release.');

console.log('Installed-PWA native scrollbar suppression remains present under the mobile hero cache refresh.');
