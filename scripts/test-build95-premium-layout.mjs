import assert from 'node:assert/strict';
import fs from 'node:fs';

const js = fs.readFileSync('js/features/premium-interactions-v92.js', 'utf8');
const css = fs.readFileSync('css/c3-c4-layout-polish-v95.css', 'utf8');
const buildConfig = fs.readFileSync('js/build-config.js', 'utf8');

for (const marker of [
  "id: '20260811-phase-ux-c3-c4-smooth-layout-v95'",
  "cache: 'shinobi-launchpad-v95'",
  "revision: 'premium-interaction-motion-5'",
  "display: '2026.08.11.95'",
  "release: 'phase-ux-c3-c4-smooth-layout-20260811'",
  "'css/c3-c4-layout-polish-v95.css'",
]) assert.ok(buildConfig.includes(marker), `Build 95 config is missing ${marker}.`);

for (const marker of [
  "routeAnimation.id = 'lp95-route-transition'",
  'lastAnimatedRoute',
  'lastAnimatedAt',
  "duration: 280",
  "transform: 'translate3d(0, 10px, 0)'",
  'reorderDesktopNavigation',
  "nav.insertBefore(albums, favorites)",
  'NO_BLOOM_SELECTOR',
]) assert.ok(js.includes(marker), `Build 95 runtime is missing ${marker}.`);

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
]) assert.ok(css.includes(marker), `Build 95 layout CSS is missing ${marker}.`);

assert.doesNotMatch(js, /filter:\s*'[^']*blur/i, 'Build 95 route transition must not animate blur.');
assert.doesNotMatch(js, /scale\(/i, 'Build 95 route transition runtime must avoid scale-based page motion.');
assert.doesNotMatch(js, /preventDefault\s*\(/, 'Build 95 premium runtime must not intercept navigation semantics.');
assert.doesNotMatch(js, /stopPropagation\s*\(/, 'Build 95 premium runtime must not own event propagation.');
assert.doesNotMatch(css, /animation-iteration-count:\s*infinite/i, 'Build 95 layout polish must not add perpetual attention motion.');

console.log('LaunchPAD Build 95 passed smooth-route, nav-order, Eras, Lyrics, Audio Lab, Album scalability and Show/Hide Tracks guards.');