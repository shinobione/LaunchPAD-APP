import assert from 'node:assert/strict';
import fs from 'node:fs';

const buildConfig = fs.readFileSync('js/build-config.js', 'utf8');
const boot = fs.readFileSync('js/app-engine-recovery.js', 'utf8');
const runtime = fs.readFileSync('js/features/responsiveness-v98.js', 'utf8');

const display = /display:\s*'\d{4}\.\d{2}\.\d{2}\.(\d+)'/.exec(buildConfig);
const buildNumber = Number(display?.[1]);
const isBuild98 = buildNumber === 98;
assert.ok(Number.isFinite(buildNumber) && buildNumber >= 98, 'Build 98 guard must run on Build 98 or a later successor.');

for (const marker of [
  "id: '20260812-phase-ux-c3-c7-responsiveness-v98'",
  "cache: 'shinobi-launchpad-v98'",
  "display: '2026.08.12.98'",
  "release: 'phase-ux-c3-c7-responsiveness-20260812'",
]) {
  if (isBuild98) assert.ok(buildConfig.includes(marker), `Build 98 config is missing ${marker}.`);
}

for (const marker of [
  'function installBootMenuBridge()',
  "button.addEventListener('click', toggle)",
  'const removeBootMenuBridge = installBootMenuBridge()',
  "await import(versioned('./app-main.js'))",
  'removeBootMenuBridge()',
  'function scheduleIdleEnhancements(callback)',
  "import(versioned('./features/responsiveness-v98.js'))",
  'initResponsivenessV98({ audio })',
  'scheduleIdleEnhancements(async () =>',
  "import(versioned('./features/listening-history-summary.js'))",
  "import(versioned('./features/visual-card.js'))",
  "import(versioned('./features/smart-canvas.js'))",
]) assert.ok(boot.includes(marker), `Build 98 boot ancestry is missing ${marker}.`);

for (const marker of [
  'PLAYBACK_PROGRESS_EPSILON',
  "audio.dataset.playbackRequestState === 'starting'",
  "dispatchPlaybackState(audio, 'playing')",
  'function installMobileLyricsFetchLimiter()',
  'MOBILE_LYRICS_FETCH_LIMIT = 2',
  "path.includes('/lyrics')",
  "document.querySelector('#view-lyrics.active')",
  'function installTrackSignalFirstPaint()',
  "node.matches?.('#view-track, .track-detail-copy, .track-detail-signal-groups')",
  "signals.classList.add('track-detail-hero-signals')",
]) assert.ok(runtime.includes(marker), `Build 98 runtime ancestry is missing ${marker}.`);

assert.doesNotMatch(boot, /stopImmediatePropagation\s*\(/, 'Build 98 boot bridge must not steal application event propagation.');
assert.doesNotMatch(runtime, /audio\.currentTime\s*=/, 'Build 98 playback-state repair must not own audio seeking.');
assert.doesNotMatch(runtime, /audio\.play\s*\(/, 'Build 98 playback-state repair must not own playback start.');
assert.doesNotMatch(runtime, /audio\.pause\s*\(/, 'Build 98 playback-state repair must not own playback pause.');

console.log('LaunchPAD Build 98 ancestry remains intact for early interaction, staged boot, playback repair, mobile fetch limiting and Track Detail signals.');
