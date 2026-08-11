import assert from 'node:assert/strict';
import fs from 'node:fs';

const js = fs.readFileSync('js/features/premium-interactions-v92.js', 'utf8');
const css = fs.readFileSync('css/premium-interactions-v93.css', 'utf8');
const buildConfig = fs.readFileSync('js/build-config.js', 'utf8');

const isBuild94 = buildConfig.includes("display: '2026.08.11.94'");
const isSuccessor = /display:\s*'2026\.08\.11\.(?:9[5-9]|[1-9]\d{2,})'/.test(buildConfig);
assert.ok(isBuild94 || isSuccessor, 'Build 94 guard must run on Build 94 or a later C3-C successor.');

for (const marker of [
  'ROUTE_INTENT_SELECTOR',
  "window.addEventListener('shinobi:route-change'",
  "window.addEventListener('hashchange'",
  "window.addEventListener('popstate'",
  "typeof Element.prototype.animate !== 'function'",
  'scheduleRouteTransition({ beforeRoute })',
]) assert.ok(js.includes(marker), `Build 94 ancestry is missing ${marker}.`);

assert.ok(
  js.includes("routeAnimation.id = 'lp94-route-transition'") || js.includes("routeAnimation.id = 'lp95-route-transition'"),
  'Build 94 route-animation ownership must survive successor tuning.'
);

for (const marker of [
  '.project-album-actions .text-button[data-open-album]',
  '.track-detail-album-link',
  '> .lp-impact-bloom',
  'animation: none !important',
  'text-shadow: 0 0 9px',
]) assert.ok(css.includes(marker), `Build 94 tuning ancestry is missing ${marker}.`);

assert.doesNotMatch(js, /preventDefault\s*\(/, 'Premium runtime must not intercept navigation semantics.');
assert.doesNotMatch(js, /stopPropagation\s*\(/, 'Premium runtime must not own event propagation.');
assert.doesNotMatch(js, /stopImmediatePropagation\s*\(/, 'Premium runtime must not own immediate propagation.');
assert.doesNotMatch(css, /animation-iteration-count:\s*infinite/i, 'C3-C premium tuning must not introduce perpetual attention motion.');
assert.doesNotMatch(css, /transition-delay:/i, 'C3-C premium tuning must not delay real interactions.');

console.log('LaunchPAD Build 94 ancestry guard passed for WAAPI route replay, Open project cleanup and event ownership.');