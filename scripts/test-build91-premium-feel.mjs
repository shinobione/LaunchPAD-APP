import assert from 'node:assert/strict';
import fs from 'node:fs';

const css = fs.readFileSync('css/premium-interactions-v91.css', 'utf8');
const buildConfig = fs.readFileSync('js/build-config.js', 'utf8');

for (const token of [
  '--lp-motion-instant',
  '--lp-motion-fast',
  '--lp-motion-base',
  '--lp-ease-out',
  '--lp-press-scale',
]) assert.ok(css.includes(token), `Historical Build 91 motion token missing ${token}`);

assert.match(css, /:active[\s\S]*scale:/, 'Historical Build 91 must retain tactile press feedback.');
assert.match(css, /\.view\.active[\s\S]*animation:/, 'Historical Build 91 must retain its view transition cue.');
assert.match(css, /@media \(prefers-reduced-motion: reduce\)/, 'Historical Build 91 reduced-motion behavior must remain documented in code.');
assert.doesNotMatch(css, /animation-iteration-count:\s*infinite/i, 'Historical Build 91 must not gain perpetual attention-seeking motion.');
assert.doesNotMatch(css, /transition-delay:/i, 'Historical Build 91 must not delay real interactions.');

const display = /display:\s*'([^']+)'/.exec(buildConfig)?.[1] || '';
const build = Number(display.split('.').at(-1) || 0);
assert.ok(build >= 91, `Current LaunchPAD build must remain Build 91 or later, got ${display}.`);
assert.ok(buildConfig.includes('installPremiumFeel()'), 'Successor builds must keep an explicit premium interaction install hook.');

console.log(`Historical LaunchPAD Build 91 premium-feel contract remains intact under successor ${display}.`);
