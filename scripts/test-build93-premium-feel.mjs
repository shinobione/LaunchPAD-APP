import assert from 'node:assert/strict';
import fs from 'node:fs';

const css = fs.readFileSync('css/premium-interactions-v93.css', 'utf8');
const buildConfig = fs.readFileSync('js/build-config.js', 'utf8');
const sw = fs.readFileSync('sw.js', 'utf8');

for (const marker of [
  "id: '20260811-phase-ux-c3-c2-transition-glow-v93'",
  "cache: 'shinobi-launchpad-v93'",
  "revision: 'premium-interaction-motion-3'",
  "display: '2026.08.11.93'",
  "release: 'phase-ux-c3-c2-transition-glow-20260811'",
  "'css/premium-interactions-v92.css'",
  "'css/premium-interactions-v93.css'",
  'premiumInteractionsV93',
  'installPremiumFeel()',
  'installPremiumFeelTuning()',
]) assert.ok(buildConfig.includes(marker), `Build 93 config is missing ${marker}.`);

const v92Index = buildConfig.indexOf('installPremiumFeel();');
const v93Index = buildConfig.indexOf('installPremiumFeelTuning();');
assert.ok(v92Index >= 0 && v93Index > v92Index, 'Build 93 tuning must load after the inherited Build 92 interaction layer.');

assert.ok(sw.includes("'./css/premium-interactions-v92.css'"), 'Build 92 inherited premium stylesheet must remain cached.');
assert.ok(sw.includes("'./css/premium-interactions-v93.css'"), 'Build 93 tuning stylesheet must be cached in the PWA shell.');

for (const marker of [
  '--lp93-route-duration: 260ms',
  '--lp93-bloom-duration: 285ms',
  '.lab-controls .chip.active',
  '.view.active.route-entering',
  'animation: lp93-route-enter',
  '@keyframes lp93-route-enter',
  '@keyframes lp93-bloom',
  'scale: 4.6',
  '@media (prefers-reduced-motion: reduce)',
]) assert.ok(css.includes(marker), `Build 93 tuning CSS is missing ${marker}.`);

assert.doesNotMatch(
  css,
  /\.view\.active,\s*\n\.view\.active\.route-entering\s*\{[\s\S]*animation:\s*lp93-route-enter/i,
  'Build 93 must not assign the route replay animation to the ordinary persistent active-view state.'
);
assert.doesNotMatch(css, /scale:\s*9(?:\D|$)/, 'Build 93 corrective bloom must not repeat Build 92 scale-9 flash.');
assert.doesNotMatch(css, /animation-iteration-count:\s*infinite/i, 'Build 93 must not add perpetual motion.');
assert.doesNotMatch(css, /transition-delay:/i, 'Build 93 must not delay real interactions.');

console.log('LaunchPAD Build 93 passed distinct route replay, reduced click bloom, Audio Lab active-chip cleanup, cache and reduced-motion guards.');
