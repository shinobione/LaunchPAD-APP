import assert from 'node:assert/strict';
import fs from 'node:fs';

const js = fs.readFileSync('js/features/premium-interactions-v92.js', 'utf8');
const css = fs.readFileSync('css/premium-interactions-v93.css', 'utf8');
const buildConfig = fs.readFileSync('js/build-config.js', 'utf8');

for (const marker of [
  "id: '20260811-phase-ux-c3-c3-real-route-transitions-v94'",
  "cache: 'shinobi-launchpad-v94'",
  "revision: 'premium-interaction-motion-4'",
  "display: '2026.08.11.94'",
  "release: 'phase-ux-c3-c3-real-route-transitions-20260811'",
]) assert.ok(buildConfig.includes(marker), `Build 94 config is missing ${marker}.`);

for (const marker of [
  'ROUTE_INTENT_SELECTOR',
  "window.addEventListener('shinobi:route-change'",
  "window.addEventListener('hashchange'",
  "window.addEventListener('popstate'",
  "typeof Element.prototype.animate !== 'function'",
  "routeAnimation.id = 'lp94-route-transition'",
  "duration: 340",
  "transform: 'translate3d(0, 24px, 0) scale(.98)'",
  'scheduleRouteTransition({ beforeRoute })',
]) assert.ok(js.includes(marker), `Build 94 runtime is missing ${marker}.`);

for (const marker of [
  '.project-album-actions .text-button[data-open-album]',
  '.track-detail-album-link',
  '> .lp-impact-bloom',
  'animation: none !important',
  'text-shadow: 0 0 9px',
]) assert.ok(css.includes(marker), `Build 94 tuning is missing ${marker}.`);

assert.doesNotMatch(js, /preventDefault\s*\(/, 'Build 94 premium runtime must not intercept navigation semantics.');
assert.doesNotMatch(js, /stopPropagation\s*\(/, 'Build 94 premium runtime must not own event propagation.');
assert.doesNotMatch(js, /stopImmediatePropagation\s*\(/, 'Build 94 premium runtime must not own immediate propagation.');
assert.doesNotMatch(css, /animation-iteration-count:\s*infinite/i, 'Build 94 must not introduce perpetual attention motion.');
assert.doesNotMatch(css, /transition-delay:/i, 'Build 94 must not delay real interactions.');

console.log('LaunchPAD Build 94 passed WAAPI route replay, pushState intent coverage, Open project glow cleanup and event-ownership guards.');
