import assert from 'node:assert/strict';
import fs from 'node:fs';

const buildConfig = fs.readFileSync('js/build-config.js', 'utf8');
const css = fs.readFileSync('css/c3-c6-mobile-v97.css', 'utf8');
const picker = fs.readFileSync('js/features/mobile-cleanup-v97.js', 'utf8');
const content = fs.readFileSync('js/features/content/content-controller.js', 'utf8');

for (const marker of [
  "id: '20260811-phase-ux-c3-c6-mobile-cleanup-v97'",
  "cache: 'shinobi-launchpad-v97'",
  "display: '2026.08.11.97'",
  "release: 'phase-ux-c3-c6-mobile-cleanup-20260811'",
  "'css/c3-c6-mobile-v97.css'",
  "'js/features/mobile-cleanup-v97.js'",
]) assert.ok(buildConfig.includes(marker), `Build 97 config is missing ${marker}.`);

for (const marker of [
  '#view-home #recently-added-section',
  'display: none !important',
  '#view-analytics .project-album-head',
  'grid-template-columns: 82px minmax(0,1fr)',
  '#view-analytics .project-tags',
  'overflow-x: auto !important',
  '#view-analytics .project-album-toggle',
  '.lp97-lyrics-picker-list',
  'background: rgba(10,7,17,.985)',
  'max-height: min(280px, 44dvh)',
]) assert.ok(css.includes(marker), `Build 97 CSS is missing ${marker}.`);

for (const marker of [
  "const SELECTOR = '#lyrics-track-select'",
  "select.classList.add('lp97-native-track-select')",
  "picker.className = 'lp97-lyrics-picker'",
  "list.role = 'listbox'",
  "select.dispatchEvent(new Event('change', { bubbles: true }))",
  "view.classList.contains('lyrics-studio-mode')",
  "picker.hidden = studioMode",
  "new MutationObserver(syncMode).observe(view",
]) assert.ok(picker.includes(marker), `Build 97 Lyrics picker is missing ${marker}.`);

for (const marker of [
  'function mobileAlbumLayout()',
  "matchMedia?.('(max-width: 760px)')",
  "collection.classList.remove('has-album-focus')",
  'if (mobileAlbumLayout()) {\n    callback();',
  'if (mobileAlbumLayout()) return;',
  'Independent mobile accordions',
  'setAlbumTrackListExpanded(view, toggle, shouldExpand);',
]) assert.ok(content.includes(marker), `Build 97 mobile Album behavior is missing ${marker}.`);

assert.doesNotMatch(picker, /stopPropagation\s*\(/, 'Build 97 picker must not steal application click propagation.');
assert.doesNotMatch(picker, /stopImmediatePropagation\s*\(/, 'Build 97 picker must not steal immediate propagation.');

const mobileBypassIndex = content.indexOf('if (mobileAlbumLayout()) {\n    callback();');
const documentTransitionIndex = content.indexOf('document.startViewTransition(callback)');
assert.ok(
  mobileBypassIndex >= 0 && documentTransitionIndex > mobileBypassIndex,
  'Mobile Album behavior must bypass document View Transitions before the desktop branch.'
);

console.log('LaunchPAD Build 97 passed mobile Home, Album stability and dark Lyrics picker guards.');
