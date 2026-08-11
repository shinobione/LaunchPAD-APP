import assert from 'node:assert/strict';
import fs from 'node:fs';

const js = fs.readFileSync('js/features/premium-interactions-v92.js', 'utf8');
const css = fs.readFileSync('css/c3-c4-layout-polish-v95.css', 'utf8');
const buildConfig = fs.readFileSync('js/build-config.js', 'utf8');

const isBuild95 = buildConfig.includes("display: '2026.08.11.95'");
const isSuccessor = /display:\s*'2026\.08\.11\.(?:9[6-9]|[1-9]\d{2,})'/.test(buildConfig);
assert.ok(isBuild95 || isSuccessor, 'Build 95 guard must run on Build 95 or a later C3-C successor.');

for (const marker of [
  "routeAnimation.id = 'lp95-route-transition'",
  'lastAnimatedRoute',
  'lastAnimatedAt',
  "duration: 280",
  "transform: 'translate3d(0, 10px, 0)'",
  'reorderDesktopNavigation',
  "nav.insertBefore(albums, favorites)",
  'NO_BLOOM_SELECTOR',
]) assert.ok(js.includes(marker), `Build 95 runtime ancestry is missing ${marker}.`);

for (const marker of [
  '.nav-item.active::before',
  '.era-timeline-track::-webkit-scrollbar',
  '.project-album-toggle::before',
  'Show tracks · ',
  'Hide tracks · ',
  '.album-collection:not(.has-album-focus):has(.project-album:nth-child(5))',
  '.main-content:has(#view-lyrics.active)',
  "height: clamp(500px,calc(100dvh - 330px),620px)",
  '.main-content:has(#view-lab.active)',
  "height: clamp(420px,calc(100dvh - 355px),650px) !important",
  '#view-lab .lab-controls',
  'overflow: visible !important',
]) assert.ok(css.includes(marker), `Build 95 layout ancestry is missing ${marker}.`);

assert.doesNotMatch(js, /filter:\s*'[^']*blur/i, 'Build 95+ route transition must not animate blur.');
assert.doesNotMatch(js, /scale\(/i, 'Build 95+ route transition runtime must avoid scale-based page motion.');
assert.doesNotMatch(js, /preventDefault\s*\(/, 'Build 95+ premium runtime must not intercept navigation semantics.');
assert.doesNotMatch(js, /stopPropagation\s*\(/, 'Build 95+ premium runtime must not own event propagation.');
assert.doesNotMatch(css, /animation-iteration-count:\s*infinite/i, 'Build 95 layout ancestry must not add perpetual attention motion.');

console.log('LaunchPAD Build 95 ancestry guard passed for smooth routes, nav order, Eras, Audio Lab, Album scalability and Show/Hide Tracks.');