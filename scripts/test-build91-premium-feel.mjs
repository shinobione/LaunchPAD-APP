import assert from 'node:assert/strict';
import fs from 'node:fs';

const css = fs.readFileSync('css/premium-interactions-v91.css', 'utf8');
const buildConfig = fs.readFileSync('js/build-config.js', 'utf8');
const sw = fs.readFileSync('sw.js', 'utf8');

for (const marker of [
  "id: '20260811-phase-ux-c3-c-premium-feel-v91'",
  "cache: 'shinobi-launchpad-v91'",
  "display: '2026.08.11.91'",
  "release: 'phase-ux-c3-c-premium-feel-20260811'",
  "'css/premium-interactions-v91.css'",
  'installPremiumFeel()',
]) assert.ok(buildConfig.includes(marker), `Build 91 config is missing ${marker}.`);

assert.ok(sw.includes("'./css/premium-interactions-v91.css'"), 'Build 91 premium stylesheet must be part of the PWA shell cache.');

for (const token of [
  '--lp-motion-instant',
  '--lp-motion-fast',
  '--lp-motion-base',
  '--lp-ease-out',
  '--lp-press-scale',
]) assert.ok(css.includes(token), `Missing LaunchPAD motion token ${token}`);

assert.match(css, /:active[\s\S]*scale:/, 'LaunchPAD must expose tactile press feedback.');
assert.match(css, /\.view\.active[\s\S]*animation:/, 'View transitions need a short orientation cue.');
assert.match(css, /@media \(prefers-reduced-motion: reduce\)/, 'Reduced motion support is mandatory.');
assert.match(css, /animation: none !important/, 'Reduced motion must suppress C3-C view/feedback animation.');
assert.doesNotMatch(css, /animation-iteration-count:\s*infinite/i, 'C3-C must not add perpetual attention-seeking motion.');
assert.doesNotMatch(css, /transition-delay:/i, 'C3-C must not delay real interactions.');

console.log('LaunchPAD Build 91 premium feel passed build identity, PWA cache, press, view motion and reduced-motion guards.');