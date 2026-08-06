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
  "id: '20260806-m6-home-editorial'","cache: 'shinobi-launchpad-v33'","revision: 'home-editorial-switcher-1'","display: '2026.08.06.33'","release: 'home-editorial-switcher-20260806'",
  "id: '20260806-m5-discography-eras'","cache: 'shinobi-launchpad-v32'","revision: 'discography-eras-cards-1'","display: '2026.08.06.32'","release: 'discography-eras-cards-20260806'",
  "id: '20260806-m4-theme-scoping'","cache: 'shinobi-launchpad-v31'","revision: 'theme-scoping-1'","display: '2026.08.06.31'","release: 'theme-scoping-20260806'",
  "id: '20260806-m2-catalog-ordering'","cache: 'shinobi-launchpad-v30'","revision: 'catalog-ordering-1'","display: '2026.08.06.30'","release: 'catalog-ordering-20260806'",
  "id: '20260806-m1-routing-legal'","cache: 'shinobi-launchpad-v29'","revision: 'routing-navigation-legal-1'","display: '2026.08.06.29'","release: 'routing-navigation-legal-20260806'",
  "id: '20260806-pwa-single-update'","cache: 'shinobi-launchpad-v28'","revision: 'pwa-single-update-1'","display: '2026.08.06.28'","release: 'pwa-single-update-20260806'",
  "id: '20260806-audiolab-rms-clarity'","cache: 'shinobi-launchpad-v27'","revision: 'audiolab-rms-clarity-1'","display: '2026.08.06.27'","release: 'audiolab-rms-clarity-20260806'",
  "id: '20260806-audiolab-animation-calibration'","cache: 'shinobi-launchpad-v26'","revision: 'audiolab-animation-calibration-1'","display: '2026.08.06.26'","release: 'audiolab-animation-calibration-20260806'",
  "id: '20260806-audiolab-catalog-reactivity'","cache: 'shinobi-launchpad-v25'","revision: 'audiolab-catalog-reactivity-1'","display: '2026.08.06.25'","release: 'audiolab-catalog-reactivity-20260806'",
  "id: '20260805-audiolab-live-reactivity'","cache: 'shinobi-launchpad-v24'","revision: 'audiolab-live-reactivity-1'","display: '2026.08.05.24'","release: 'audiolab-live-reactivity-20260805'",
  "id: '20260805-audiolab-core-modes'","cache: 'shinobi-launchpad-v23'","id: '20260805-fixed-shell'","cache: 'shinobi-launchpad-v21'",
  "revision: 'fixed-shell-scroll-boundary-1'","display: '2026.08.05.21'","release: 'fixed-shell-scroll-boundary-20260805'",
  "id: '20260805-mobile-hero-order'","cache: 'shinobi-launchpad-v20'","id: '20260805-native-scrollbar-fix'","cache: 'shinobi-launchpad-v19'",
  'function installTypographyStylesheet()',"new URL('css/typography-refresh.css', document.baseURI)",'installTypographyStylesheet();'
]) assert.ok(build.includes(required), `PWA release metadata is missing ${required}.`);

const activeId = build.match(/const config = Object\.freeze\(\{[\s\S]*?id:\s*'([^']+)'/)?.[1];
assert.equal(activeId, '20260806-m6-home-editorial', 'The active runtime cache key must match Build 33.');
assert.ok(build.includes("const stylesheetVersion = visualTest ? '20260805-audiolab-core-modes' : config.id"));

console.log('Desktop fixed shell and typography remain valid under Build 33.');
