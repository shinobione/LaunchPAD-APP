import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import { assertCurrentBuild } from './lib/build-metadata.mjs';

const read = path => fs.readFileSync(path, 'utf8');
const includesAll = (source, required, label) => required.forEach(value => assert.ok(source.includes(value), `${label} is missing ${value}.`));

// Routing, legal, catalog, Track Manager deployment and theme contracts.
includesAll(read('js/features/feature-11.js'), ['normalizeLaunchRoute', 'SHAREABLE_ROUTE_PATTERN', 'installRouteTransitions', "window.addEventListener('shinobi:route-change', replayRouteTransition)"], 'Routing');
includesAll(read('js/features/about/about-controller.js'), ['new Date().getFullYear()', 'All Rights Reserved.', 'Unauthorized copying, reproduction, or reverse engineering is strictly prohibited.'], 'Legal notice');
includesAll(read('js/core/catalog-schema.js'), ['normalizeCatalogTrack', 'releaseDate', 'createdAt', 'updatedAt'], 'Catalog schema');
includesAll(read('js/core/catalog-ordering.js'), ['latestActiveTrackEntries', 'recentlyAddedTrackEntries', 'releaseDateUnavailable'], 'Catalog ordering');
const deploy = read('.github/workflows/deploy-cloudflare.yml');
includesAll(deploy, ['workflow_dispatch:', "if: github.ref == 'refs/heads/main'", "test \"${{ inputs.confirm }}\" = 'DEPLOY'", "EXPECTED_PUBLIC_VERSION: '2.6'", "EXPECTED_ADMIN_VERSION: '5.10'"], 'Cloudflare deployment');
assert.ok(!deploy.includes('\n  push:'), 'Production Cloudflare Worker deployment must remain manual-only.');
includesAll(read('js/features/theme-scope.js'), ['trackFromRoute', 'playingTrack(audio)', 'applyPagePalette(viewed, played)', 'applyPlayerPalette(played)'], 'Theme scoping');

// Studio integration boundary. The base runtime remains the proven Phase 4A read-only source;
// Build 66 added validation-only POST. Track Manager v5.10 / bridge v1.2 keeps that boundary
// and adds a backward-compatible no-preflight transport for real-browser Cloudflare Access.
const adminRuntime = read('cloudflare/admin-worker.parts/01-runtime.part');
includesAll(adminRuntime, [
  'const STUDIO_ALLOWED_ORIGIN = "https://shinobione.github.io"',
  'const STUDIO_BRIDGE_VERSION = "1.0"',
  'url.pathname === "/api/studio/health"',
  'url.pathname === "/api/studio/tracks"',
  '"Access-Control-Allow-Methods": "GET, OPTIONS"',
  'write: []',
  'if (["POST", "PUT", "PATCH", "DELETE"].includes(request.method))',
  'enforceSameOrigin(request, url)'
], 'Studio Phase 4A base runtime');
assert.ok(!/request\.method\s*===\s*["'](?:POST|PUT|PATCH|DELETE)["'][\s\S]{0,180}\/api\/studio\//.test(adminRuntime), 'Base Studio runtime must remain write-free.');

const studioValidation = read('cloudflare/admin-worker.parts/03d-studio-metadata-validation.part');
includesAll(studioValidation, [
  'STUDIO_METADATA_VALIDATION_INTENT = "metadata-validate-v1"',
  '/metadata\\/validate$/',
  'requestedMethod === "POST" && metadataValidation',
  'x-shinobiwan-studio-intent',
  'contentType !== "application/json" && contentType !== "text/plain"',
  'contentType === "text/plain"',
  'payload.intent !== STUDIO_METADATA_VALIDATION_INTENT',
  'expectedUpdatedAt',
  'code: "STALE_MANIFEST"',
  'validationOnly: true',
  'simple-post-v1',
  'json-preflight-v1',
  'inspectTrackQuality'
], 'Studio Phase 4B.1A metadata validation');
for (const forbiddenMutation of ['writeManifest(', 'writeCatalogIndex(', '.put(', '.delete(', 'saveTrack(', 'saveThumbnail(', 'deleteTrack(']) {
  assert.ok(!studioValidation.includes(forbiddenMutation), `Studio metadata validation must not mutate production state: ${forbiddenMutation}`);
}

const adminBuilder = read('scripts/build-admin-worker.mjs');
includesAll(adminBuilder, [
  "'5.9'",
  'version: "5.10"',
  '<span class="version-pill">v5.10</span>',
  'trackManagerVersion: "5.10"',
  'const STUDIO_BRIDGE_VERSION = "1.2";',
  'validate: ["metadata"]',
  'write: []',
  'isStudioMetadataValidation',
  'assertStudioMetadataValidationRequest(request)',
  'else enforceSameOrigin(request, url)',
  'validateStudioTrackMetadata(studioMetadataValidationRoute[1], request, env, user)'
], 'Track Manager v5.10 assembler ancestry');

// Discography/Home contracts.
const discography = read('js/features/discography-experience.js');
includesAll(discography, ["const FILTER_GROUP_ORDER = ['genre', 'language', 'content', 'energy', 'era', 'type', 'media', 'year', 'mood']", 'mini-equalizer', 'track-card-loader'], 'Discography');
includesAll(discography, [
  'data-era-action-strip', 'data-era-selected-label', 'data-era-scroll="-1"', 'data-era-scroll="1"',
  'function centerActiveEraOnMobile(', "window.addEventListener('shinobi:catalog-filtered'", 'centerActiveEraOnMobile(timeline)',
  "button.textContent = `▶ Play Era · ${playback.indexes.length} tracks`"
], 'Build 72 Era affordance');
const discographyCss = read('css/discography-experience.css');
includesAll(discographyCss, [
  '.era-selected-action{', '.era-timeline-mobile-controls{', 'content:"SELECTED"', 'min-width:min(54vw,188px)',
  '.era-can-scroll-left.era-can-scroll-right .era-timeline-track{'
], 'Build 72 mobile Era discoverability');
const about = read('js/features/about/about-controller.js');
includesAll(about, ["art.src = 'assets/Lune-ShinoBiWan.png'", "art.className = 'about-signature-art'", 'installSignatureArt()'], 'About moon artwork');
const aboutCss = read('css/about-enhancements.css');
includesAll(aboutCss, [
  '.brand-wordmark::after{', "mask:url('../assets/logo.png') left center / contain no-repeat", '.about-signature-art{'
], 'Build 77 brand artwork');
assert.ok(!aboutCss.includes('NinJa-ShinoBiWan.png'), 'Build 77 must keep the Ninja out of the Home hero.');
includesAll(read('js/features/home-editorial.js'), ["const DEFAULT_VISUAL_MODE = 'neon-shatter'", 'latestActiveTrackEntries(tracks, 1)', 'installVisualSwitcher'], 'Home editorial');

const feature11Media = read('js/features/feature-11.js');
includesAll(feature11Media, [
  "const VIDEO_SELECTOR = 'video.track-video-player'",
  'VIDEO_TERMINAL_STALL_WINDOW', "video.addEventListener('ended'", "video[VIDEO_RECOVERY_HANDLER]?.('terminal-stall')",
  'installAudioClockStability', "audio.dispatchEvent(new Event('timeupdate'))"
], 'Build 77 Track Video ownership boundary');
for (const forbiddenMediaRecovery of [
  'video.load()', "recoverLoop('boundary')", "video.addEventListener('stalled'", "video.addEventListener('waiting'",
  "video.track-video-player, video.lyrics-studio-canvas-video"
]) {
  assert.ok(!feature11Media.includes(forbiddenMediaRecovery), `Track Video recovery must not reintroduce protected-media reload/pre-boundary/cross-owner churn: ${forbiddenMediaRecovery}`);
}

const lyricsStudioMedia = read('js/features/lyrics-studio.js');
includesAll(lyricsStudioMedia, [
  "video.autoplay = false",
  'video.loop = true',
  "video.setAttribute('loop', '')",
  "video.preload = 'none'",
  'canvasVideo.src = canvasVideo.dataset.src',
  'canvasVideo.load()',
  'canvasVideo.play()',
  "canvasVideo.addEventListener('playing'",
  "canvasVideo.addEventListener('error'",
  'function installSingleCommitSeek()',
  "seek.addEventListener('input', preview, { capture: true })",
  "seek.addEventListener('pointerup', commit, { capture: true })",
  'event.stopImmediatePropagation()',
  "window.dispatchEvent(new CustomEvent('shinobi:seek-preview'",
  "window.dispatchEvent(new CustomEvent('shinobi:seek-commit'",
  'lyrics-mobile-track-open',
  "button.textContent = 'Open track →'",
  "routeToHash({ type: 'track', id: track.id })",
  'setStudioMode(false, { restoreScroll: false })',
  '{ recenter: false }'
], 'Build 84 base Lyrics Studio native-loop/single-commit/Show Track contract');
for (const forbiddenCanvasRecovery of [
  'CANVAS_LOCAL_RECOVERY_LIMIT',
  'CANVAS_LOCAL_STALL_GRACE_MS',
  'prepareCanvasSource(',
  'scheduleLocalCanvasRecovery',
  'restartLocalCanvas',
  'URL.createObjectURL',
  'URL.revokeObjectURL',
  "fetch(track.video",
  "canvasVideo.setAttribute('data-transport', 'blob')",
  "canvasVideo.addEventListener('ended'",
  "canvasVideo.addEventListener('waiting'",
  "canvasVideo.addEventListener('stalled'",
  "playCanvas('local-loop')",
  "playCanvas('audio-playing')",
  "audio.addEventListener('seeking'",
  "audio.addEventListener('seeked'",
  "audio.addEventListener('playing'",
  'androidMobileStudioCanvasDisabled',
  'androidCanvasDisabled',
  'MOBILE SAFE VISUAL',
  "window.addEventListener('pageshow'",
  "document.addEventListener('visibilitychange'"
]) {
  assert.ok(!lyricsStudioMedia.includes(forbiddenCanvasRecovery), `Build 86 must keep Lyrics Studio under one native-loop owner: ${forbiddenCanvasRecovery}`);
}
const mobilePanelStart = lyricsStudioMedia.indexOf('function setMobilePanelCollapsed(');
const mobilePanelEnd = lyricsStudioMedia.indexOf('\n  function setCanvasButtonState', mobilePanelStart);
assert.ok(mobilePanelStart >= 0 && mobilePanelEnd > mobilePanelStart, 'Build 84+ mobile panel transition is missing.');
assert.ok(!lyricsStudioMedia.slice(mobilePanelStart, mobilePanelEnd).includes('playCanvas('), 'Build 84+ Show Track must never touch Canvas playback.');

const loopParity = read('js/features/studio-loop-parity-v85.js');
includesAll(loopParity, [
  "const CANVAS_SELECTOR = 'video.lyrics-studio-canvas-video'",
  "video.preload = 'auto'",
  "video.setAttribute('preload', 'auto')",
  "video.removeAttribute('poster')",
  "video.dataset.loopParity = 'track-video-v1'",
  "video.addEventListener('loadeddata'",
  "video.addEventListener('playing'",
  "attributeFilter: ['poster']",
  "button.textContent = 'Track page →'"
], 'Build 85 passive Studio loop parity ancestry');
for (const forbiddenParityOwnership of ['.play(', '.pause(', '.load(', '.currentTime', '.src =']) {
  assert.ok(!loopParity.includes(forbiddenParityOwnership), `Build 85 loop parity must remain passive: ${forbiddenParityOwnership}`);
}

const smartCanvas = read('js/features/smart-canvas.js');
includesAll(smartCanvas, ["const CANVAS_SELECTOR = 'video.track-video-player';", 'new IntersectionObserver', "reason: 'another-canvas-started'"] , 'Build 83 Track-only Smart Canvas');
assert.ok(!smartCanvas.includes('video.lyrics-studio-canvas-video'), 'Smart Canvas must never register the Lyrics Studio Canvas after Build 83.');

const trackVideos = read('js/features/track-videos.js');
includesAll(trackVideos, [
  'function releaseVideoDecoder(video, panel)',
  "video.removeAttribute('src')",
  'function teardownTrackVideoRoute(view)',
  'if (!view || currentTrack()) return',
  "window.addEventListener('hashchange', syncRouteVideoState)",
  "window.addEventListener('shinobi:route-change', syncRouteVideoState)",
  'releaseVideoDecoder(video, panel)',
  'openStudioRoute(studioButton.dataset.trackStudioAction)'
], 'Build 81 Track route video decoder teardown');

const queueUi = read('js/features/queue-ui.js');
includesAll(queueUi, [
  'function focusWithoutScroll(element)',
  "element?.focus?.({ preventScroll: true })",
  "focusWithoutScroll(panel.querySelector('[data-queue-action=\"close\"]'))",
  'focusWithoutScroll(lastFocused)'
], 'Build 81 Studio-safe Queue focus');

const mobileStudioCss = read('css/mobile-studio.css');
includesAll(mobileStudioCss, [
  'body.lyrics-studio-open .queue-panel{',
  'z-index:620!important',
  'body.lyrics-studio-open.queue-open::before{',
  'z-index:619!important',
  'lyrics-mobile-track-open',
  'grid-template-columns:48px minmax(0,1fr)',
  'width:36px',
  'height:64px'
], 'Build 84 Queue stacking and stable mobile Show Track Canvas geometry');
assert.ok(!mobileStudioCss.includes('grid-template-columns:minmax(92px,116px) minmax(0,1fr)'), 'Build 84+ must not enlarge the mobile Canvas surface on Show Track.');
const loopParityCss = read('css/studio-loop-parity-v85.css');
includesAll(loopParityCss, ['.lyrics-mobile-track-open{', 'width:auto!important', 'justify-self:end!important'], 'Build 85 compact Track page action ancestry');

const mobilePlayerPolish = read('css/mobile-player-polish-v86.css');
includesAll(mobilePlayerPolish, [
  '.lyrics-track-panel .lyrics-cover-wrap',
  'opacity:0!important',
  'visibility:hidden!important',
  '.lyrics-mobile-track-open',
  'display:none!important',
  '-webkit-tap-highlight-color:transparent!important',
  '.mobile-favorite-trigger.active:hover',
  '.mobile-queue-trigger:hover'
], 'Build 86 mobile player/UI presentation guard');

const libraryMemory = read('js/features/library-memory.js');
includesAll(libraryMemory, [
  'const hasTrackId = trackId => typeof trackId === \'string\' && getTrackIndex(trackId) >= 0',
  'raw.favorites.filter(hasTrackId)',
  'raw.history.filter(hasTrackId)',
  'if (!hasTrackId(trackId)) return',
  'return hasTrackId(audio.dataset.trackId) ? audio.dataset.trackId : null',
  'renderView();',
  'decorateCards();',
  'updateButtons();',
  "button.classList.toggle('active', active)",
  "button.setAttribute('aria-pressed', String(active))"
], 'Build 86 dynamic Favorites state/visual refresh ancestry');
assert.ok(!libraryMemory.includes('const trackIds = new Set('), 'Build 81 Favorites must not freeze the catalog membership at module load.');

const uiController = read('js/features/ui/ui-controller.js');
includesAll(uiController, [
  "ensureStylesheet('css/player-routing-v83.css')",
  "currentTrack.removeAttribute('data-view-target')",
  "identity.className = 'current-track-identity'",
  "identity.dataset.viewTarget = 'lyrics'",
  "identity.setAttribute('role', 'button')",
  "identity.setAttribute('tabindex', '0')"
], 'Build 83 mini-player identity route');
assert.ok(!uiController.includes("currentTrack.dataset.viewTarget = 'lyrics'"), 'Build 83 must not route the full mini-player container to Lyrics.');

const playerRoutingCss = read('css/player-routing-v83.css');
includesAll(playerRoutingCss, ['.current-track-identity{', 'cursor:pointer', '.current-track-identity:focus-visible{'], 'Build 83 mini-player identity styling');

const mobileLyricsRouting = read('js/ui-polish-v62.js');
for (const retiredWorkaround of ['INTERACTIVE_SELECTOR', 'nestedInteractiveControl', 'if (nestedInteractiveControl(event.target, entry)) return;']) {
  assert.ok(!mobileLyricsRouting.includes(retiredWorkaround), `Build 82 workaround must stay retired after structural routing fix: ${retiredWorkaround}`);
}

const lyricsEngineMedia = read('js/features/lyrics/lyrics-engine.js');
includesAll(lyricsEngineMedia, [
  'let seekInProgress = false', 'function beginSeek(time)', 'function settleSeek(time = audio.currentTime)',
  "window.addEventListener('shinobi:seek-preview'", "window.addEventListener('shinobi:seek-commit'",
  "audio.addEventListener('seeking'", "audio.addEventListener('seeked'",
  "update(time, { behavior: 'auto', forceCenter: true, allowScroll: true })"
], 'Build 77 Lyrics seek settlement ancestry');

const androidStudioSafe = read('js/features/android-studio-safe-mode.js');
includesAll(androidStudioSafe, [
  "/Android/i.test(navigator.userAgent || '')",
  "window.matchMedia?.('(max-width:760px)')",
  'globalThis.__shinobiAndroidStudioSourceGuard = true'
], 'Build 81 inert Android Studio bootstrap marker');
for (const forbiddenAndroidStudioMutation of [
  'MutationObserver',
  'cloneNode(',
  'replaceWith(',
  'insertBefore(',
  'globalThis.fetch =',
  'nativeFetch',
  'document.createElement(\'video\')',
  'audio.pause()',
  'audio.load()'
]) {
  assert.ok(!androidStudioSafe.includes(forbiddenAndroidStudioMutation), `Android Studio bootstrap must stay inert: ${forbiddenAndroidStudioMutation}`);
}

// Audio Lab registry and sanctuary reference.
const registry = read('js/features/visual/audio-lab-registry.js');
includesAll(registry, [
  "AUDIO_LAB_DEFAULT_MODE = 'neon-shatter'", "id: 'neon-shatter'", "id: 'spectrum'", "id: 'liquid-chrome'",
  "id: 'pulse-reactor'", "id: 'bass-fracture'", "id: 'gravity-lens'", "id: 'bio-structure'", "id: 'void-bloom'", "id: 'creep-signal'",
  "AUDIO_LAB_SANCTUARY_IDS = Object.freeze(['spectrum'])"
], 'Audio Lab registry');
for (const retired of ['aurora-glass', 'nebula', 'singularity']) assert.ok(!registry.includes(retired), `Retired Audio Lab preset returned: ${retired}.`);
const presetCount = (registry.match(/Object\.freeze\(\{ id:/g) || []).length;
assert.equal(presetCount, 9, 'Audio Lab must expose exactly nine sanctioned presets.');

const visualBase = read('js/features/visual/visual-engine-v2.js');
function extractFunction(source, name) {
  const start = source.indexOf(`  function ${name}(`);
  assert.ok(start >= 0, `Protected renderer ${name} is missing.`);
  const brace = source.indexOf('{', start);
  let depth = 0;
  for (let index = brace; index < source.length; index += 1) {
    if (source[index] === '{') depth += 1;
    if (source[index] === '}' && --depth === 0) return source.slice(start, index + 1).replace(/^  /gm, '');
  }
  throw new Error(`Protected renderer ${name} is malformed.`);
}
const spectrumHash = '25a86e3763b668fc69734d48439a2c93745ef927a3fcbdddaf2d0f29e0371813';
const actualSpectrumHash = crypto.createHash('sha256').update(extractFunction(visualBase, 'drawSpectrum')).digest('hex');
assert.equal(actualSpectrumHash, spectrumHash, 'Spectrum sanctuary hash changed.');
includesAll(visualBase, ["{ id: 'spectrum', label: 'Spectrum' }", 'function readSpectrum(target)', 'analyser.getByteFrequencyData(target)', 'return { resume, setMode, readSpectrum }'], 'Spectrum reference renderer');

const coreModes = read('js/features/visual/visual-engine-core-modes.js');
includesAll(coreModes, ['drawNeonShatterV2Mode', 'drawLiquidChromeV2Mode', 'const gatedDrift = time * activity * .16', 'const phase = time * activity * .2'], 'Validated baseline FFT modes');

const motion = read('js/features/visual/motion-spring.js');
includesAll(motion, [
  'const FRAME_STATES = new WeakMap()', 'phases: new Map()', 'export function beginMotionFrame(', 'export function springChannel(',
  'export function shapeAudioDrive(', 'export function advanceMotionPhase(', 'state.phase += state.speed * frame.dt',
  'const targetSpeed = drive > gate', 'channel.velocity'
], 'Shared kinetic motion');

const pulse = read('js/features/visual/pulse-reactor.js');
includesAll(pulse, [
  'shapeAudioDrive(', "advanceMotionPhase(motion, 'reactor-flow'", 'const centerTravel =', 'const driftX =',
  'const ringCount = mobile ? 3 : 4', 'const segmentCount = mobile ? 14 : 24', 'const spokeCount = mobile ? 10 : 18'
], 'Pulse Reactor kinetic flow');
const fracture = read('js/features/visual/bass-fracture.js');
includesAll(fracture, [
  'shapeAudioDrive(', "advanceMotionPhase(motion, 'tectonic-flow'", 'const bodyTravel =', 'const bodyRotation =',
  'const motionScale = mobile ? 1.66 : 1.34', 'const sectorCount = mobile ? 12 : 16', 'const crackCount = mobile ? 8 : 12'
], 'Bass Fracture kinetic flow');
const lens = read('js/features/visual/gravity-lens.js');
includesAll(lens, [
  'shapeAudioDrive(', "advanceMotionPhase(motion, 'gravity-flow'", 'const centerTravel =', 'const globalTilt =',
  'const bandCount = mobile ? 4 : 6', 'const streamCount = mobile ? 8 : 14'
], 'Gravity Lens kinetic flow');
const bio = read('js/features/visual/bio-structure.js');
includesAll(bio, [
  'shapeAudioDrive(', "advanceMotionPhase(motion, 'bio-flow'", 'const driftRadius =', 'const bodyTilt =',
  'const ribCount = mobile ? 5 : 8', 'const veinCount = mobile ? 8 : 14'
], 'Bio Structure kinetic flow');
const bloom = read('js/features/visual/void-bloom.js');
includesAll(bloom, [
  'export function drawVoidBloomMode(', 'shapeAudioDrive(', "advanceMotionPhase(motion, 'void-bloom-flow'",
  'const petalCount = mobile ? 7 : 11', 'const veinCount = mobile ? 7 : 16',
  "springChannel(motion, 'open'", 'context.bezierCurveTo(', 'context.quadraticCurveTo('
], 'Void Bloom kinetic flow');
const creep = read('js/features/visual/creep-signal.js');
includesAll(creep, [
  'export function drawCreepSignalMode(', 'shapeAudioDrive(', "advanceMotionPhase(motion, 'creep-flow'",
  'const nodeCount = mobile ? 9 : 14', 'const branchCount = mobile ? 6 : 10', 'const pulseCount = mobile ? 7 : 12',
  "springChannel(motion, 'mass'", 'const forwardDrift =', 'context.quadraticCurveTo('
], 'Creep Signal kinetic flow');
for (const isolated of [pulse, fracture, lens, bio, bloom, creep]) {
  assert.ok(!isolated.includes('requestAnimationFrame('), 'Isolated visual must use the shared renderer scheduler.');
  assert.ok(!isolated.includes('setInterval('), 'Isolated visual must not self-schedule an autonomous loop.');
  assert.ok(!isolated.includes('Math.random('), 'Isolated visual geometry must remain deterministic.');
  assert.ok(!isolated.includes('shapeMotionTarget('), 'Build 56 soft-knee compression must not remain in kinetic renderers.');
}

const live = read('js/features/visual/visual-engine-live.js');
includesAll(live, [
  "{ id: 'bio-structure', label: 'Bio Structure', renderer: drawBioStructureMode }",
  "{ id: 'void-bloom', label: 'Void Bloom', renderer: drawVoidBloomMode }",
  "{ id: 'creep-signal', label: 'Creep Signal', renderer: drawCreepSignalMode }",
  'base.readSpectrum?.(raw)', 'reading = readAudioLabSpectrum(raw)',
  "const KINETIC_MODE_IDS = new Set(['pulse-reactor', 'bass-fracture', 'gravity-lens', 'bio-structure', 'void-bloom', 'creep-signal'])",
  'function createAdaptiveLowPunchTracker()', 'relativeContrast', 'relativeFlux', 'relativeRise', 'subLift',
  'function createDirectVisualImpactTracker()', 'punchRise * 3.8', 'kickRise * 2.25', 'contrastRise * 6.5',
  'function applyDirectKineticImpact(context, width, height, mode, features)', "mode === 'void-bloom'", "mode === 'creep-signal'",
  'features.visualImpact = visualImpactTracker.update(features)', 'data.audioLabVisualImpact = values[6]',
  'function kineticImpactFeatures(mode, features)', 'features.punch = adaptivePunch.punch',
  "dataset.audioLabRenderer = 'nine-core-v1'", `dataset.audioLabPresetCount = '${presetCount}'`,
  "mode === 'bass-fracture' || mode === 'gravity-lens' || mode === 'bio-structure' || mode === 'void-bloom' || mode === 'creep-signal' ? 1.05",
  'const CUSTOM_FRAME_INTERVAL = 1000 / 60'
], 'Live Audio Lab visuals');
for (const retired of ['aurora-glass', 'nebula', 'singularity', 'synthesizePlaybackSpectrum', "'bars'"]) assert.ok(!live.includes(retired), `Retired Audio Lab path returned: ${retired}.`);

const signal = read('js/features/audio-lab-signal.js');
includesAll(signal, ['createDecodedSourceProxy', 'context.decodeAudioData(bytes.slice(0))', 'context.createBufferSource()', "audio.dataset.audioPlaybackPath = 'html5-direct'", "audio.dataset.audioAnalysisPath = 'decoded-buffer'"], 'Isolated Audio Lab graph');
assert.ok(!signal.includes('captureStream('));
assert.ok(!signal.includes('createMediaStreamSource('));

includesAll(read('js/features/lyrics-studio.js'), ["video.setAttribute('webkit-playsinline', '')", "routeToHash({ type: 'studio', id: trackId })", 'video.loop = true', 'lyrics-mobile-track-open', "routeToHash({ type: 'track', id: track.id })"], 'Mobile Lyrics Studio');
includesAll(read('js/features/admin-access.js'), [
  'resolveLrcMakerAccess', 'https://shinobione.github.io/lrc-maker/', "label: 'LRC Maker'",
  'resolveSonicTraceAccess', 'https://shinobione.github.io/LM-IA-Analayse/', "label: 'SonicTrace'", "initials: 'ST'"
], 'Admin access');
includesAll(read('css/pwa.css'), [
  '.sonic-trace-access{', '.sonic-trace-access:hover{', '.sonic-trace-access>span{',
  'linear-gradient(135deg,#28dcb8,#00e5ff)', '.sonic-trace-access>strong{', '.sonic-trace-access>b{color:#66efff}'
], 'SonicTrace admin badge');
const worker = read('sw.js');
includesAll(worker, ["'./js/features/visual/motion-spring.js'", "'./js/features/visual/pulse-reactor.js'", "'./js/features/visual/bass-fracture.js'", "'./js/features/visual/gravity-lens.js'", "'./js/features/visual/bio-structure.js'", "'./js/features/visual/void-bloom.js'", "'./js/features/visual/creep-signal.js'"], 'PWA shell');

const buildSource = read('js/build-config.js');
includesAll(buildSource, [
  'installStudioLoopParity',
  "'css/studio-loop-parity-v85.css'",
  '`js/features/studio-loop-parity-v85.js?v=${encodeURIComponent(config.id)}`',
  "script.dataset.studioLoopParityV85 = 'true'",
  'installMobilePlayerPolish',
  "'css/mobile-player-polish-v86.css'"
], 'Build 86 loop parity + mobile player polish bootstrap');

const build = assertCurrentBuild('Master specification/current release');
assert.equal(build.id, '20260810-phase-ux-c2-5-a-mobile-player-ui-polish-v86');
assert.equal(build.cache, 'shinobi-launchpad-v86');
assert.equal(build.display, '2026.08.10.86');
assert.equal(build.release, 'phase-ux-c2-5-a-mobile-player-ui-polish-20260810');
assert.equal(build.revision, 'mobile-player-ui-polish-1');

console.log(`LaunchPAD master specification is regression-protected under ${build.display} (${build.release}); Build 86 preserves Build 85 passive Canvas parity and Build 84 layout-only Show Track while removing the physical cover underlay during active Canvas playback, hiding the temporary Track-page escape action and scoping Android touch/focus visuals to the actual mini-player controls. Build 81 Track video teardown, Queue stacking/focus and dynamic Favorites membership, Build 77 single-commit seek and settled Lyrics autoscroll, supplied Moon/gold brand art and historical v5.10 bridge ancestry remain protected with ${presetCount} sanctioned Audio Lab presets.`);
