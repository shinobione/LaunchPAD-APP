import assert from 'node:assert/strict';
import fs from 'node:fs';

const css = fs.readFileSync('css/premium-interactions-v93.css', 'utf8');
const buildConfig = fs.readFileSync('js/build-config.js', 'utf8');

for (const marker of [
  '--lp93-route-duration: 260ms',
  '--lp93-bloom-duration: 285ms',
  '.lab-controls .chip.active',
  '@keyframes lp93-route-enter',
  '@keyframes lp93-bloom',
  'scale: 4.6',
  '@media (prefers-reduced-motion: reduce)',
]) assert.ok(css.includes(marker), `Historical Build 93 tuning is missing ${marker}.`);

assert.doesNotMatch(css, /scale:\s*9(?:\D|$)/, 'Build 93 ancestry must not regress to Build 92 scale-9 flash.');
assert.doesNotMatch(css, /animation-iteration-count:\s*infinite/i, 'Build 93 ancestry must not gain perpetual motion.');
assert.doesNotMatch(css, /transition-delay:/i, 'Build 93 ancestry must not delay real interactions.');

const display = /display:\s*'([^']+)'/.exec(buildConfig)?.[1] || '';
const build = Number(display.split('.').at(-1) || 0);
assert.ok(build >= 93, `Current LaunchPAD build must remain Build 93 or later, got ${display}.`);
assert.ok(buildConfig.includes('installPremiumFeelTuning()'), 'Successor builds must keep the Build 93 tuning layer installed.');

console.log(`Historical LaunchPAD Build 93 tuning remains intact under successor ${display}.`);
