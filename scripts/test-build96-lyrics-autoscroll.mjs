import assert from 'node:assert/strict';
import fs from 'node:fs';

const engine = fs.readFileSync('js/features/lyrics/lyrics-engine.js', 'utf8');
const css = fs.readFileSync('css/c3-c5-lyrics-v96.css', 'utf8');
const buildConfig = fs.readFileSync('js/build-config.js', 'utf8');

const isBuild96 = buildConfig.includes("display: '2026.08.11.96'");
const isSuccessor = /display:\s*'2026\.08\.11\.(?:9[7-9]|[1-9]\d{2,})'/.test(buildConfig);
assert.ok(isBuild96 || isSuccessor, 'Build 96 guard must run on Build 96 or a later C3-C successor.');

for (const marker of [
  "id: '20260811-phase-ux-c3-c5-lyrics-autoscroll-v96'",
  "cache: 'shinobi-launchpad-v96'",
  "release: 'phase-ux-c3-c5-lyrics-autoscroll-20260811'",
  "'css/c3-c5-lyrics-v96.css'",
]) {
  if (isBuild96) assert.ok(buildConfig.includes(marker), `Build 96 config is missing ${marker}.`);
}

for (const marker of [
  'let routeSyncFrame = 0',
  'function scheduleRouteSyncReconcile()',
  'routeSyncFrame = requestAnimationFrame(() =>',
  "window.addEventListener('shinobi:route-change', scheduleRouteSyncReconcile)",
  "!activeElement.classList.contains('active')",
  'forceCenter: lyricsViewActive()',
  'if (lyricsViewActive()) scheduleRouteSyncReconcile();',
]) assert.ok(engine.includes(marker), `Build 96 Lyrics runtime is missing ${marker}.`);

for (const marker of [
  '.main-content:has(#view-lyrics.active:not(.lyrics-studio-mode))',
  'height: calc(100dvh - 88px)',
  '#view-lyrics.active:not(.lyrics-studio-mode)',
  'height: calc(100% - 82px)',
  'grid-template-rows: auto minmax(0, 1fr)',
  'overflow-y: auto !important',
  'overscroll-behavior-y: contain',
  'scrollbar-gutter: stable',
]) assert.ok(css.includes(marker), `Build 96 Lyrics viewport CSS is missing ${marker}.`);

assert.doesNotMatch(engine, /scrollIntoView\s*\(/, 'Build 96 Lyrics must remain reader-relative, not page-relative.');
assert.doesNotMatch(css, /#view-lyrics\.lyrics-studio-mode\s*\{/, 'Build 96 corrective must not own Studio mode layout.');
assert.doesNotMatch(css, /@media\s*\(max-width:\s*760px\)/, 'Build 96 corrective must remain desktop-only.');

console.log('LaunchPAD Build 96 passed normal-Lyrics viewport lock, internal scroll-host and route-settled auto-scroll guards.');