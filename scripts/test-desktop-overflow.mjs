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
  "id: '20260805-native-scrollbar-fix'",
  "cache: 'shinobi-launchpad-v19'",
  "revision: 'native-scrollbar-cache-bust-1'",
  "display: '2026.08.05.19'",
  "release: 'native-scrollbar-cache-bust-20260805'"
]) {
  assert.ok(build.includes(required), `Native scrollbar release metadata is missing ${required}.`);
}

const activeId = build.match(/const config = Object\.freeze\(\{[\s\S]*?id:\s*'([^']+)'/)?.[1];
assert.equal(activeId, '20260805-native-scrollbar-fix', 'The active stylesheet cache key must change with the release.');

console.log('Installed-PWA native horizontal scrollbar suppression and stylesheet cache bust are present.');
