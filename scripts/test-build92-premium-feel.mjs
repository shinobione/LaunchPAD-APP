import assert from 'node:assert/strict';
import fs from 'node:fs';

const css = fs.readFileSync('css/premium-interactions-v92.css', 'utf8');
const js = fs.readFileSync('js/features/premium-interactions-v92.js', 'utf8');
const buildConfig = fs.readFileSync('js/build-config.js', 'utf8');
const sw = fs.readFileSync('sw.js', 'utf8');

for (const token of [
  '--lp92-instant',
  '--lp92-fast',
  '--lp92-base',
  '--lp92-slow',
  '--lp92-spring',
]) assert.ok(css.includes(token), `Historical Build 92 motion token missing ${token}.`);

for (const marker of [
  '.lp-pressing',
  '.lp-impact-bloom',
  'lp92-control-pop',
  'lp92-bloom',
  'lp92-view-enter',
  '.nav-item.active::before',
  'translate: 0 -5px',
  'scale: .88',
  '@media (prefers-reduced-motion: reduce)',
]) assert.ok(css.includes(marker), `Historical Build 92 premium CSS is missing ${marker}.`);

for (const marker of [
  '__shinobiPremiumInteractionsV92Ready',
  "document.addEventListener('pointerdown'",
  "document.addEventListener('pointerup'",
  "document.addEventListener('click'",
  "document.addEventListener('keydown'",
  "document.addEventListener('keyup'",
  "bloom.className = 'lp-impact-bloom'",
  "element.classList.add('lp-pressing')",
  "element.classList.add('lp-impact')",
]) assert.ok(js.includes(marker), `Historical Build 92 premium runtime is missing ${marker}.`);

assert.doesNotMatch(css, /animation-iteration-count:\s*infinite/i, 'Historical Build 92 must not gain perpetual attention-seeking animation.');
assert.doesNotMatch(css, /transition-delay:/i, 'Historical Build 92 must not delay actual interactions.');
assert.doesNotMatch(js, /preventDefault\s*\(/, 'Historical Build 92 presentation runtime must never intercept click/navigation semantics.');
assert.doesNotMatch(js, /stopPropagation\s*\(/, 'Historical Build 92 presentation runtime must never intercept event ownership.');

const display = /display:\s*'([^']+)'/.exec(buildConfig)?.[1] || '';
const build = Number(display.split('.').at(-1) || 0);
assert.ok(build >= 92, `Current LaunchPAD build must remain Build 92 or later, got ${display}.`);
assert.ok(buildConfig.includes("'css/premium-interactions-v92.css'"), 'Successor builds must keep the Build 92 premium stylesheet installed.');
assert.ok(buildConfig.includes('js/features/premium-interactions-v92.js?v='), 'Successor builds must keep the Build 92 premium runtime installed.');
assert.ok(buildConfig.includes('premiumInteractionsV92'), 'Successor builds must retain the Build 92 runtime dataset marker.');
assert.ok(buildConfig.includes('installPremiumFeel()'), 'Successor builds must retain the Build 92 premium install hook.');
assert.ok(sw.includes("'./css/premium-interactions-v92.css'"), 'Successor PWA shell must retain the Build 92 stylesheet.');
assert.ok(sw.includes("'./js/features/premium-interactions-v92.js'"), 'Successor PWA shell must retain the Build 92 interaction runtime.');

console.log(`Historical LaunchPAD Build 92 premium-feel contract remains intact under successor ${display}.`);
