import assert from 'node:assert/strict';
import fs from 'node:fs';

const buildConfig = fs.readFileSync('js/build-config.js', 'utf8');
const audio = fs.readFileSync('js/features/audio-readiness.js', 'utf8');
const mobileNav = fs.readFileSync('js/features/mobile-navigation.js', 'utf8');
const mobileCss = fs.readFileSync('css/mobile-navigation.css', 'utf8');
const premium = fs.readFileSync('js/features/premium-interactions-v92.js', 'utf8');

for (const marker of [
  "id: '20260812-phase-ux-c3-c8-mobile-reactivity-v99'",
  "cache: 'shinobi-launchpad-v99'",
  "display: '2026.08.12.99'",
  "release: 'phase-ux-c3-c8-mobile-reactivity-20260812'",
]) assert.ok(buildConfig.includes(marker), `Build 99 config is missing ${marker}.`);

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
  "const TOUCH_CLICK_SUPPRESS_MS = 650",
  "document.addEventListener('pointerdown', event => {",
  "event.pointerType !== 'touch' && event.pointerType !== 'pen'",
  'suppressTouchClickUntil = performance.now() + TOUCH_CLICK_SUPPRESS_MS',
  "toggleMenu({ keyboard: false })",
  "toggleMenu({ keyboard: event.detail === 0 })",
]) assert.ok(mobileNav.includes(marker), `Build 99 mobile input path is missing ${marker}.`);

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
  "const MOBILE_PERFORMANCE_QUERY = '(max-width: 760px), (hover: none) and (pointer: coarse)'",
  'function mobilePerformanceMode()',
  'function premiumMotionSuppressed()',
  'if (premiumMotionSuppressed() || element.matches(NO_BLOOM_SELECTOR)) return;',
  "if (premiumMotionSuppressed() || typeof Element.prototype.animate !== 'function') return;",
  'if (mobilePerformanceMode()) return;',
]) assert.ok(premium.includes(marker), `Build 99 mobile premium-motion bypass is missing ${marker}.`);

console.log('LaunchPAD Build 99 protects touch-first mobile navigation, lightweight drawer rendering, mobile premium-motion bypass and stall-aware player state.');
