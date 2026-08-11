import assert from 'node:assert/strict';
import fs from 'node:fs';

const buildConfig = fs.readFileSync('js/build-config.js', 'utf8');
const audio = fs.readFileSync('js/features/audio-readiness.js', 'utf8');
const mobileNav = fs.readFileSync('js/features/mobile-navigation.js', 'utf8');
const mobileCss = fs.readFileSync('css/mobile-navigation.css', 'utf8');
const correctiveCss = fs.readFileSync('css/c3-c9-corrective-v100.css', 'utf8');
const premium = fs.readFileSync('js/features/premium-interactions-v92.js', 'utf8');

const isBuild99 = buildConfig.includes("release: 'phase-ux-c3-c8-mobile-reactivity-20260812'");
const isBuild100 = buildConfig.includes("release: 'phase-ux-c3-c9-mobile-menu-focus-20260812'");
assert.ok(isBuild99 || isBuild100, 'Build 99 ancestry guard only supports Build 99 or its Build 100 successor.');

for (const marker of [
  'const WAITING_SPINNER_DELAY_MS = 360',
  'const PLAYBACK_PROGRESS_EPSILON = 0.025',
  'function notePlaybackProgress()',
  "audio.addEventListener('timeupdate', notePlaybackProgress)",
  "audio.addEventListener('waiting', () => {",
  'const noRecentProgress = performance.now() - lastProgressAt',
  'const lacksFutureData = audio.readyState < HTMLMediaElement.HAVE_FUTURE_DATA',
  "if (advanced && playbackRequested && !audio.paused && !audio.ended) {\n      setRequestState('playing');",
]) assert.ok(audio.includes(marker), `Build 99 stall-aware playback state is missing ${marker}.`);

assert.doesNotMatch(
  audio,
  /audio\.addEventListener\('waiting',[\s\S]{0,180}setRequestState\('starting'\);\s*\}\);/,
  'Waiting must not immediately force the player into loading state.'
);

for (const marker of [
  "const MOBILE_QUERY = '(max-width: 760px)'",
  "const LOCKED_VIEWPORT = 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover'",
  'function lockMobileViewport(media)',
  "document.addEventListener('click', event => {",
  "toggleMenu({ keyboard: event.detail === 0 })",
  "sync(media.matches && sidebar.classList.contains('open'))",
  "ensureStylesheet('css/c3-c9-corrective-v100.css', 'c3C9CorrectiveV100')",
]) assert.ok(mobileNav.includes(marker), `Build 100 mobile navigation corrective is missing ${marker}.`);

assert.doesNotMatch(mobileNav, /addEventListener\('pointerdown'/, 'Build 100 drawer must have a single click event owner, not pointerdown + click.');
assert.doesNotMatch(mobileNav, /TOUCH_CLICK_SUPPRESS_MS|suppressTouchClickUntil/, 'Build 100 must remove synthetic-click suppression state.');

for (const marker of [
  'backdrop-filter:none!important',
  '-webkit-backdrop-filter:none!important',
  'transition:transform 145ms cubic-bezier(.22,.61,.36,1)!important',
  'touch-action:manipulation',
  'transition:opacity 95ms linear',
]) assert.ok(mobileCss.includes(marker), `Build 99 lightweight drawer CSS is missing ${marker}.`);

assert.doesNotMatch(
  mobileCss,
  /@media\(max-width:760px\)[\s\S]*?\.sidebar\{[\s\S]*?transition:\s*\.3s/,
  'Mobile sidebar must not retain the legacy transition-all 300ms behavior.'
);

for (const marker of [
  'touch-action: pan-x pan-y',
  '.player-bar .transport button:not(.main-play)',
  '.player-bar input[type="range"]',
  'box-shadow: none !important',
]) assert.ok(correctiveCss.includes(marker), `Build 100 corrective CSS is missing ${marker}.`);

for (const marker of [
  "const MOBILE_PERFORMANCE_QUERY = '(max-width: 760px), (hover: none) and (pointer: coarse)'",
  'function mobilePerformanceMode()',
  'function premiumMotionSuppressed()',
  'if (premiumMotionSuppressed() || element.matches(NO_BLOOM_SELECTOR)) return;',
  "if (premiumMotionSuppressed() || typeof Element.prototype.animate !== 'function') return;",
  'if (mobilePerformanceMode()) return;',
]) assert.ok(premium.includes(marker), `Build 99 mobile premium-motion bypass is missing ${marker}.`);

console.log('LaunchPAD Build 99 ancestry + Build 100 corrective protect stall-aware playback, single-owner mobile navigation, locked mobile zoom and clean desktop player chrome.');
