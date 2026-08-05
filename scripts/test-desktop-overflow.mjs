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
  'text-overflow:ellipsis',
  '@media(min-width:761px)',
  'height:100dvh',
  'grid-template-columns:230px minmax(0,1fr)',
  'grid-template-rows:minmax(0,1fr) 88px',
  'grid-row:1 / 3',
  'overflow-y:auto',
  'overscroll-behavior-y:contain',
  'scrollbar-gutter:stable',
  'grid-row:2',
  'position:relative',
  'padding-bottom:32px'
]) {
  assert.ok(styles.includes(required), `Desktop fixed-shell guard is missing ${required}.`);
}

const desktopStart = styles.indexOf('@media(min-width:761px)');
const mobileStart = styles.indexOf('@media(max-width:760px)');
assert.ok(desktopStart >= 0 && mobileStart > desktopStart, 'Desktop shell media block must precede the mobile block.');
const desktopShellBlock = styles.slice(desktopStart, mobileStart);
for (const required of [
  'overflow:hidden!important',
  '.app-shell{',
  '.sidebar{',
  '.main-content{',
  '.player-bar{'
]) {
  assert.ok(desktopShellBlock.includes(required), `Desktop shell block is missing ${required}.`);
}

const build = read('js/build-config.js');
for (const required of [
  "id: '20260805-fixed-shell'",
  "cache: 'shinobi-launchpad-v21'",
  "revision: 'fixed-shell-scroll-boundary-1'",
  "display: '2026.08.05.21'",
  "release: 'fixed-shell-scroll-boundary-20260805'",
  "id: '20260805-mobile-hero-order'",
  "cache: 'shinobi-launchpad-v20'",
  "id: '20260805-native-scrollbar-fix'",
  "cache: 'shinobi-launchpad-v19'"
]) {
  assert.ok(build.includes(required), `PWA release metadata is missing ${required}.`);
}

const activeId = build.match(/const config = Object\.freeze\(\{[\s\S]*?id:\s*'([^']+)'/)?.[1];
assert.equal(activeId, '20260805-fixed-shell', 'The active stylesheet cache key must match the fixed-shell release.');

console.log('Desktop viewport, sidebar and player stay fixed while main-content owns vertical scrolling.');
