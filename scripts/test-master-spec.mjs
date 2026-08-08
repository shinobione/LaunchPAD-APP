import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import { assertCurrentBuild } from './lib/build-metadata.mjs';

const read = path => fs.readFileSync(path, 'utf8');
const includesAll = (source, required, label) => required.forEach(value => {
  assert.ok(source.includes(value), `${label} is missing ${value}.`);
});

// 1 — Routing, transitions and legal protection.
const feature11 = read('js/features/feature-11.js');
includesAll(feature11, [
  'normalizeLaunchRoute', 'SHAREABLE_ROUTE_PATTERN', 'installRouteTransitions',
  "window.addEventListener('shinobi:route-change', replayRouteTransition)",
  "globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches"
], 'Routing');
const about = read('js/features/about/about-controller.js');
includesAll(about, ['new Date().getFullYear()', 'All Rights Reserved.', 'Unauthorized copying, reproduction, or reverse engineering is strictly prohibited.'], 'Legal notice');

// 2 — Unified catalog schema and release ordering.
const schema = read('js/core/catalog-schema.js');
includesAll(schema, ['normalizeCatalogTrack', 'releaseDate', 'createdAt', 'updatedAt'], 'Catalog schema');
const ordering = read('js/core/catalog-ordering.js');
includesAll(ordering, ['latestActiveTrackEntries', 'recentlyAddedTrackEntries', 'releaseDateUnavailable'], 'Catalog ordering');

// 3 — Track Manager controls and explicit Worker deployment.
const manager3 = [read('cloudflare/admin-worker.parts/20-m3-track-manager-controls.inject.part'), read('cloudflare/admin-worker.parts/18-phase-12-hotfixes.inject.part')].join('\n');
includesAll(manager3, ["TRACK_MANAGER_MILESTONE_3_VERSION='5.6'", 'milestone3InstallReactiveFilters', 'milestone3InstallManualPalette', 'Extraire les couleurs'], 'Track Manager controls');
const deploy = read('.github/workflows/deploy-cloudflare.yml');
includesAll(deploy, ['workflow_dispatch:', "if: github.ref == 'refs/heads/main'", "test \"${{ inputs.confirm }}\" = 'DEPLOY'", "EXPECTED_PUBLIC_VERSION: '2.6'", "EXPECTED_ADMIN_VERSION: '5.7'"], 'Cloudflare deployment');
assert.ok(!deploy.includes('\n  push:'), 'Production Cloudflare Worker deployment must remain manual-only.');

// 4 — Split page/player theme scoping.
const theme = read('js/features/theme-scope.js');
includesAll(theme, ['trackFromRoute', 'playingTrack(audio)', 'applyPagePalette(viewed, played)', 'applyPlayerPalette(played)', "? 'split' : 'unified'"], 'Theme scoping');

// 5 — Discography hierarchy and playback state.
const discography = read('js/features/discography-experience.js');
includesAll(discography, ["const FILTER_GROUP_ORDER = ['genre', 'language', 'content', 'energy', 'era', 'type', 'media', 'year', 'mood']", 'erasFromCatalog', 'mini-equalizer', 'track-card-loader'], 'Discography');
const stabilityStyles = read('css/ui-stability-v39.css');
includesAll(stabilityStyles, ['.album-card.is-current::after', 'top:19px!important', 'top:15px!important'], 'NOW PLAYING alignment');

// 6 — Editorial Home and mobile order.
const home = read('js/features/home-editorial.js');
includesAll(home, ["const DEFAULT_VISUAL_MODE = 'neon-shatter'", 'latestActiveTrackEntries(tracks, 1)', 'home-official-release', 'installVisualSwitcher'], 'Home editorial');
assert.ok(!home.includes('wordmark-first'), 'The retired wordmark-first mobile hero override returned.');
const homeStyles = read('css/home-editorial.css');
assert.ok(homeStyles.includes('grid-template-columns:repeat(2,minmax(0,1fr))'), 'Mobile release actions must use equal-width columns.');

// 7 — Audio Lab: validated baseline + registry-driven expansion; Spectrum remains trusted reference.
const registry = read('js/features/visual/audio-lab-registry.js');
includesAll(registry, [
  "AUDIO_LAB_DEFAULT_MODE = 'neon-shatter'",
  "id: 'neon-shatter'", "id: 'spectrum'", "id: 'liquid-chrome'", "id: 'pulse-reactor'",
  "AUDIO_LAB_SANCTUARY_IDS = Object.freeze(['spectrum'])"
], 'Audio Lab registry');
for (const retired of ['aurora-glass', 'nebula', 'singularity']) {
  assert.ok(!registry.includes(retired), `Retired Audio Lab preset returned: ${retired}.`);
}
const presetCount = (registry.match(/Object\.freeze\(\{ id:/g) || []).length;
assert.ok(presetCount >= 3, 'Audio Lab must retain the validated three-preset baseline.');

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
includesAll(visualBase, [
  "{ id: 'spectrum', label: 'Spectrum' }",
  'function readSpectrum(target)', 'analyser.getByteFrequencyData(target)',
  'return { resume, setMode, readSpectrum }'
], 'Spectrum reference renderer');
for (const retired of ['drawLiquidChrome(', 'drawNeonShatter(', 'drawSingularity(', 'drawNebula(']) {
  assert.ok(!visualBase.includes(retired), `Legacy base visual returned: ${retired}.`);
}

const live = read('js/features/visual/visual-engine-live.js');
includesAll(live, [
  "{ id: 'neon-shatter', label: 'Neon Shatter', renderer: drawNeonShatterV2Mode }",
  "{ id: 'spectrum', label: 'Spectrum' }",
  "{ id: 'liquid-chrome', label: 'Liquid Chrome', renderer: drawLiquidChromeV2Mode }",
  "{ id: 'pulse-reactor', label: 'Pulse Reactor', renderer: drawPulseReactorMode }",
  'base.readSpectrum?.(raw)',
  'reading = readAudioLabSpectrum(raw)',
  'dataset.audioLabRenderer =',
  `dataset.audioLabPresetCount = '${presetCount}'`,
  'renderMode(labCanvas, customRenderer, raw, getAccent, time, features, mode)',
  'const CUSTOM_FRAME_INTERVAL = 1000 / 60'
], 'Live Audio Lab visuals');
for (const retired of ['aurora-glass', 'nebula', 'singularity', 'readAudioLabAmplitude', 'createAmplitudeDynamicsTracker', 'synthesizePlaybackSpectrum', "'bars'"]) {
  assert.ok(!live.includes(retired), `Retired/parallel Audio Lab path returned: ${retired}.`);
}

const coreModes = read('js/features/visual/visual-engine-core-modes.js');
includesAll(coreModes, [
  'drawNeonShatterV2Mode', 'drawLiquidChromeV2Mode',
  'const impact = clamp(', 'const pulse = clamp(',
  'const gatedDrift = time * activity * .16',
  'const phase = time * activity * .2',
  'const distance = baseDistance * (.58 + impact * 1.48 + localDrive * .92)',
  'spectralDeform = spectral * .092 + neighbour * .032'
], 'Validated baseline FFT modes');
for (const retired of ['drawAuroraGlassMode', 'drawSingularityLiveMode', 'drawNeonShatterAdaptiveMode', 'drawLiquidChromeLiveMode']) {
  assert.ok(!coreModes.includes(retired), `Retired core visual returned: ${retired}.`);
}

const pulseReactor = read('js/features/visual/pulse-reactor.js');
includesAll(pulseReactor, [
  'export function drawPulseReactorMode(',
  'const ringCount = mobile ? 3 : 5',
  'const segmentCount = mobile ? 18 : 32',
  'const spokeCount = mobile ? 16 : 30',
  'const drift = time * activity * .075'
], 'Pulse Reactor');
assert.ok(!pulseReactor.includes('requestAnimationFrame('), 'Pulse Reactor must use the shared renderer scheduler.');
assert.ok(!pulseReactor.includes('setInterval('), 'Pulse Reactor must not self-schedule an autonomous loop.');

const signal = read('js/features/audio-lab-signal.js');
includesAll(signal, [
  'createDecodedSourceProxy', 'fetch(source, {', "mode: 'cors'", 'context.decodeAudioData(bytes.slice(0))',
  'context.createBufferSource()', 'node.start(0, offset)',
  "dataset.audioGraph = 'html5-direct-plus-decoded-buffer-metering'",
  "audio.dataset.audioPlaybackPath = 'html5-direct'", "audio.dataset.audioAnalysisPath = 'decoded-buffer'",
  "audio.addEventListener('loadstart'", "attributeFilter: ['src', 'data-track-id']",
  "window.addEventListener('shinobi:route-change'", 'async function suspendContexts()'
], 'Isolated Audio Lab graph');
assert.ok(!signal.includes('captureStream('));
assert.ok(!signal.includes('createMediaStreamSource('));
assert.ok(!signal.includes('createMirrorSourceProxy'));

const sanctuary = read('js/features/visual/audio-lab-sanctuary.js');
includesAll(sanctuary, ['normalizePresetControls', "controls.dataset.audioLabRegistry = 'sanctioned-v1'", 'video.loop = true', "video.setAttribute('webkit-playsinline', '')"], 'Audio Lab sanctuary');

// 8 — SVGs and badge hierarchy.
const icons = read('js/features/svg-icon-system.js');
includesAll(icons, ["const SVG_NS = 'http://www.w3.org/2000/svg'", 'iconizeNavigation', 'iconizeControls', 'initSvgIconSystem'], 'SVG icons');
const badges = read('js/features/badge-hierarchy.js');
includesAll(badges, ["STATUS_LABELS = new Set(['CLEAN', 'EXPLICIT', 'LYRICS', 'LYRICS SYNCED', 'VIDEO', 'UPCOMING', 'DRAFT'])", 'parentGenre', 'secondary.slice(0, 3)'], 'Badge hierarchy');

// 9 — Mobile Studio, Canvas, admin tools and release wiring.
const lyricsStudio = read('js/features/lyrics-studio.js');
includesAll(lyricsStudio, [
  "video.setAttribute('webkit-playsinline', '')", "video.setAttribute('autoplay', '')", "video.preload = 'auto'",
  "routeToHash({ type: 'studio', id: trackId })", "canvasVideo.addEventListener('canplay'", "canvasVideo.addEventListener('ended'"
], 'Mobile Lyrics Studio');
const mobileStudioStyles = read('css/mobile-studio.css');
includesAll(mobileStudioStyles, ['body.lyrics-studio-open .mobile-nav{', 'visibility:visible!important;', 'bottom:54px!important;'], 'Mobile Studio shell');

const engine = read('js/app-engine.js');
includesAll(engine, ['initThemeScoping({ audio })', 'initDiscographyExperience({ audio })', 'initHomeEditorial()', 'initAudioLabSanctuary({ audio })', 'initSvgIconSystem()', 'initBadgeHierarchy()'], 'Application boot');
const admin = read('js/features/admin-access.js');
includesAll(admin, ['resolveLrcMakerAccess', 'https://shinobione.github.io/lrc-maker/', "label: 'LRC Maker'"], 'Admin access');
const worker = read('sw.js');
includesAll(worker, ["'./js/features/theme-scope.js'", "'./js/features/visual/audio-lab-registry.js'", "'./js/features/visual/audio-lab-sanctuary.js'", "'./js/features/visual/pulse-reactor.js'", "'./js/visual-card-export-guard.js'"], 'PWA shell');

const build = assertCurrentBuild('Master specification/current release');
assert.match(build.id, /^\d{8}-[a-z0-9-]+$/);
assert.match(build.cache, /^shinobi-launchpad-v\d+$/);
assert.match(build.display, /^\d{4}\.\d{2}\.\d{2}\.\d+$/);
assert.ok(build.revision && build.release, 'Build revision/release metadata must be present.');

console.log(`LaunchPAD master specification is regression-protected under ${build.display} (${build.release}) with ${presetCount} sanctioned Audio Lab presets.`);