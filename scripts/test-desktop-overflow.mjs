import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = path => fs.readFileSync(path, 'utf8');

const styles = read('css/feature-12.css');
for (const required of [
  'html,\nbody{','overflow-x:clip!important','overscroll-behavior-x:none','.app-shell,\n.main-content,\n.sidebar{',
  'html::-webkit-scrollbar:horizontal','body::-webkit-scrollbar:horizontal','.app-shell::-webkit-scrollbar:horizontal',
  '.main-content::-webkit-scrollbar:horizontal','.sidebar::-webkit-scrollbar:horizontal','display:none!important','height:0!important',
  '.sidebar .main-nav','.sidebar .side-player','.sidebar .social-dock','.sidebar .social-platform','box-sizing:border-box',
  'text-overflow:ellipsis','@media(min-width:761px)','height:100dvh','grid-template-columns:230px minmax(0,1fr)',
  'grid-template-rows:minmax(0,1fr) 88px','grid-row:1 / 3','overflow-y:auto','overscroll-behavior-y:contain',
  'scrollbar-gutter:stable','grid-row:2','position:relative','padding-bottom:32px'
]) assert.ok(styles.includes(required), `Desktop fixed-shell guard is missing ${required}.`);

const desktopStart = styles.indexOf('@media(min-width:761px)');
const mobileStart = styles.indexOf('@media(max-width:760px)');
assert.ok(desktopStart >= 0 && mobileStart > desktopStart, 'Desktop shell media block must precede the mobile block.');
const desktopShellBlock = styles.slice(desktopStart, mobileStart);
for (const required of ['overflow:hidden!important','.app-shell{','.sidebar{','.main-content{','.player-bar{']) {
  assert.ok(desktopShellBlock.includes(required), `Desktop shell block is missing ${required}.`);
}

const typography = read('css/typography-refresh.css');
for (const required of [
  '--font-ui:"Manrope",Inter,Arial,sans-serif','--font-display:"Outfit","Manrope",Inter,Arial,sans-serif',
  '.page-intro h1','.hero h1','.about-card h2','.lyrics-track-panel h2','.lyric-line',
  'font-family:var(--font-display)','letter-spacing:-.045em'
]) assert.ok(typography.includes(required), `LaunchPAD typography refresh is missing ${required}.`);
assert.ok(!/font-family:\s*serif(?:[;,}])/i.test(typography));

const build = read('js/build-config.js');
for (const required of [
  "id: '20260807-unified-v40'",
  "cache: 'shinobi-launchpad-v40'",
  "revision: 'cloudflare-main-reconciliation-1'",
  "display: '2026.08.07.40'",
  "release: 'unified-v40-20260807'",
  'const initialStylesheets = new WeakSet',
  'if (initialStylesheets.has(link)) return link;',
  'function installTypographyStylesheet()',
  "ensureBuildStylesheet('link[data-launchpad-typography]', 'css/typography-refresh.css'",
  "ensureBuildStylesheet('link[data-ui-stability-v39]', 'css/ui-stability-v39.css'",
  'installNavigationStability();'
]) assert.ok(build.includes(required), `Build 40 runtime metadata/stability is missing ${required}.`);

const activeId = build.match(/const config = Object\.freeze\(\{[\s\S]*?id:\s*'([^']+)'/)?.[1];
assert.equal(activeId, '20260807-unified-v40', 'The active runtime cache key must match Build 40.');

console.log('Desktop fixed shell, typography and single-paint Build 40 runtime are valid.');
