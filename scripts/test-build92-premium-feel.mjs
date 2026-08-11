import assert from 'node:assert/strict';
import fs from 'node:fs';

const css = fs.readFileSync('css/premium-interactions-v92.css', 'utf8');
const js = fs.readFileSync('js/features/premium-interactions-v92.js', 'utf8');
const buildConfig = fs.readFileSync('js/build-config.js', 'utf8');
const sw = fs.readFileSync('sw.js', 'utf8');

for (const marker of [
  "id: '20260811-phase-ux-c3-c1-premium-feel-v92'",
  "cache: 'shinobi-launchpad-v92'",
  "revision: 'premium-interaction-motion-2'",
  "display: '2026.08.11.92'",
  "release: 'phase-ux-c3-c1-premium-feel-20260811'",
  "'css/premium-interactions-v92.css'",
  'js/features/premium-interactions-v92.js?v=',
  'premiumInteractionsV92',
  'installPremiumFeel()',
]) assert.ok(buildConfig.includes(marker), `Build 92 config is missing ${marker}.`);

assert.ok(sw.includes("'./css/premium-interactions-v92.css'"), 'Build 92 premium stylesheet must be cached in the PWA shell.');
assert.ok(sw.includes("'./js/features/premium-interactions-v92.js'"), 'Build 92 premium interaction runtime must be cached in the PWA shell.');

for (const token of [
  '--lp92-instant',
  '--lp92-fast',
  '--lp92-base',
  '--lp92-slow',
  '--lp92-spring',
]) assert.ok(css.includes(token), `Missing Build 92 motion token ${token}.`);

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
]) assert.ok(css.includes(marker), `Build 92 premium CSS is missing ${marker}.`);

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
]) assert.ok(js.includes(marker), `Build 92 premium runtime is missing ${marker}.`);

assert.doesNotMatch(css, /animation-iteration-count:\s*infinite/i, 'Build 92 must not introduce perpetual attention-seeking animation.');
assert.doesNotMatch(css, /transition-delay:/i, 'Build 92 must not delay actual interactions.');
assert.doesNotMatch(js, /preventDefault\s*\(/, 'Build 92 presentation runtime must never intercept click/navigation semantics.');
assert.doesNotMatch(js, /stopPropagation\s*\(/, 'Build 92 presentation runtime must never intercept event ownership.');

console.log('LaunchPAD Build 92 premium feel passed identity, PWA cache, durable press, click bloom, stronger depth, keyboard and reduced-motion guards.');
