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
], 'Milestone 1 routing');
const about = read('js/features/about/about-controller.js');
includesAll(about, ['new Date().getFullYear()', 'All Rights Reserved.', 'Unauthorized copying, reproduction, or reverse engineering is strictly prohibited.'], 'Milestone 1 legal notice');

// 2 — Unified catalog schema and release ordering.
const schema = read('js/core/catalog-schema.js');
includesAll(schema, ['normalizeCatalogTrack', 'releaseDate', 'createdAt', 'updatedAt'], 'Milestone 2 schema');
const ordering = read('js/core/catalog-ordering.js');
includesAll(ordering, ['latestActiveTrackEntries', 'recentlyAddedTrackEntries', 'releaseDate', 'createdAt', 'updatedAt', 'releaseDateUnavailable'], 'Milestone 2 ordering');

// 3 — Track Manager controls and explicit Worker deployment.
const manager3 = [read('cloudflare/admin-worker.parts/20-m3-track-manager-controls.inject.part'), read('cloudflare/admin-worker.parts/18-phase-12-hotfixes.inject.part')].join('\n');
includesAll(manager3, ["TRACK_MANAGER_MILESTONE_3_VERSION='5.6'", 'milestone3InstallReactiveFilters', 'milestone3InstallManualPalette', 'Extraire les couleurs', 'phase12ManualColorRequest=true'], 'Milestone 3 Track Manager');
const deploy = read('.github/workflows/deploy-cloudflare.yml');
includesAll(deploy, ['workflow_dispatch:', "if: github.ref == 'refs/heads/main'", "test \"${{ inputs.confirm }}\" = 'DEPLOY'", "EXPECTED_PUBLIC_VERSION: '2.6'", "EXPECTED_ADMIN_VERSION: '5.7'", 'Verify private Worker and Cloudflare Access', 'Verify public catalog and media streaming'], 'Cloudflare deployment workflow');
assert.ok(!deploy.includes('\n  push:'), 'Production Cloudflare Worker deployment must remain manual-only.');

// 4 — Split page/player theme scoping.
const theme = read('js/features/theme-scope.js');
includesAll(theme, ['trackFromRoute', 'playingTrack(audio)', 'applyPagePalette(viewed, played)', 'applyPlayerPalette(played)', "const scope = viewed && played && viewed.id !== played.id ? 'split' : 'unified';", 'document.documentElement.dataset.themeScope = scope'], 'Milestone 4 theme scoping');

// 5 — Discography hierarchy, Eras and playback states.
const discography = read('js/features/discography-experience.js');
includesAll(discography, ["const FILTER_GROUP_ORDER = ['genre', 'language', 'content', 'energy', 'era', 'type', 'media', 'year', 'mood']", 'erasFromCatalog', 'installEraTimeline', "signalGroup('Moods', signals.moods)", "signalGroup('Themes', signals.themes)", 'mini-equalizer', 'track-card-loader'], 'Milestone 5 Discography');
const stabilityStyles = read('css/ui-stability-v39.css');
includesAll(stabilityStyles, ['.album-card.is-current::after', 'top:19px!important', 'top:15px!important'], 'NOW PLAYING cover-rail alignment');

// 6 — Editorial Home and canonical mobile order.
const home = read('js/features/home-editorial.js');
includesAll(home, ["const DEFAULT_VISUAL_MODE = 'neon-shatter'", 'latestActiveTrackEntries(tracks, 1)', 'home-official-release', 'installVisualSwitcher', "canvas.addEventListener('touchstart'", "canvas.addEventListener('touchend'"], 'Milestone 6 Home');
assert.ok(!home.includes('wordmark-first'), 'The retired wordmark-first mobile hero override returned.');
const homeStyles = read('css/home-editorial.css');
assert.ok(homeStyles.includes('grid-template-columns:repeat(2,minmax(0,1fr))'), 'Mobile release actions must use equal-width columns.');
const feature11Styles = read('css/feature-11.css');
includesAll(feature11Styles, ['.launchpad-hero .launchpad-banner-rail', 'order: 1;', '.launchpad-hero .hero-body', 'order: 2;'], 'Canonical banner-first mobile Home');

// 7 — Audio Lab registry, protected renderers and isolated decoded-buffer metering.
const registry = read('js/features/visual/audio-lab-registry.js');
includesAll(registry, ["AUDIO_LAB_DEFAULT_MODE = 'neon-shatter'", "id: 'spectrum'", "id: 'liquid-chrome'", "id: 'aurora-glass'", "id: 'nebula'", "id: 'singularity'", "AUDIO_LAB_SANCTUARY_IDS = Object.freeze(['spectrum', 'liquid-chrome'])"], 'Milestone 7 registry');
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
const protectedHashes = {
  drawLiquidChrome: 'bc171075042d4fe881a781ba0206482d721f8e1de6fada4357c7b2d944a23967',
  drawSpectrum: '25a86e3763b668fc69734d48439a2c93745ef927a3fcbdddaf2d0f29e0371813'
};
for (const [name, expected] of Object.entries(protectedHashes)) {
  const actual = crypto.createHash('sha256').update(extractFunction(visualBase, name)).digest('hex');
  assert.equal(actual, expected, `${name} sanctuary hash changed.`);
}
const live = read('js/features/visual/visual-engine-live.js');
includesAll(live, [
  "{ id: 'spectrum', label: 'Spectrum' }",
  'drawNeonShatterAdaptiveMode',
  "dataset.audioLabRenderer = 'hybrid-reactive-v8'",
  'function boostLiveFeatures(features)',
  'features.kick = clamp(features.kick * 2.25',
  'CUSTOM_MOBILE_FRAME_INTERVAL = 1000 / 60',
  'const TELEMETRY_INTERVAL = 120'
], 'Build 48 live visuals');
assert.ok(!live.includes("'bars'"), 'Legacy bars alias must not replace Spectrum.');
const coreModes = read('js/features/visual/visual-engine-core-modes.js');
includesAll(coreModes, ['drawAuroraGlassMode', 'drawNeonShatterAdaptiveMode', 'const spectralIndex = Math.min(', 'const spectralRipple = Math.sin(', 'const fragments = mobile ? 20 : 52'], 'Adaptive modes');
const signal = read('js/features/audio-lab-signal.js');
includesAll(signal, [
  'createDecodedSourceProxy',
  'fetch(source, {',
  "mode: 'cors'",
  'context.decodeAudioData(bytes.slice(0))',
  'context.createBufferSource()',
  'node.start(0, offset)',
  "dataset.audioGraph = 'html5-direct-plus-decoded-buffer-metering'",
  "audio.dataset.audioPlaybackPath = 'html5-direct'",
  "audio.dataset.audioAnalysisPath = 'decoded-buffer'",
  "audio.addEventListener('loadstart'",
  "attributeFilter: ['src', 'data-track-id']",
  "window.addEventListener('shinobi:route-change'",
  "document.addEventListener('pointerdown'",
  'async function suspendContexts()'
], 'Build 48 isolated audio graph');
assert.ok(!signal.includes('captureStream('), 'captureStream must stay retired from Audio Lab metering.');
assert.ok(!signal.includes('createMediaStreamSource('), 'MediaStream metering must stay retired.');
assert.ok(!signal.includes('createMirrorSourceProxy'), 'The failed hidden HTMLAudio mirror path must stay retired.');
const sanctuary = read('js/features/visual/audio-lab-sanctuary.js');
includesAll(sanctuary, ['normalizePresetControls', "controls.dataset.audioLabRegistry = 'sanctioned-v1'", 'video.loop = true', "video.setAttribute('webkit-playsinline', '')"], 'Milestone 7 sanctuary');

// 8 — SVGs and badge hierarchy.
const icons = read('js/features/svg-icon-system.js');
includesAll(icons, ["const SVG_NS = 'http://www.w3.org/2000/svg'", "svg.setAttribute('stroke', 'currentColor')", 'iconizeNavigation', 'iconizeControls', 'initSvgIconSystem'], 'Milestone 8 SVG icons');
const badges = read('js/features/badge-hierarchy.js');
includesAll(badges, ["STATUS_LABELS = new Set(['CLEAN', 'EXPLICIT', 'LYRICS', 'LYRICS SYNCED', 'VIDEO', 'UPCOMING', 'DRAFT'])", "if (admin && status === 'draft') statuses.push('DRAFT')", 'parentGenre', 'secondary.slice(0, 3)', 'secondary.length - 3', 'TECHNICAL_TAG.test(label)'], 'Milestone 8 badge hierarchy');

// 9 — Final release wiring, persistent admin tools and PWA shell.
const engine = read('js/app-engine.js');
includesAll(engine, ['initThemeScoping({ audio })', 'initDiscographyExperience({ audio })', 'initHomeEditorial()', 'initAudioLabSanctuary({ audio })', 'initSvgIconSystem()', 'initBadgeHierarchy()', "'css/admin-tools.css'"], 'Application boot');
const admin = read('js/features/admin-access.js');
includesAll(admin, ['resolveLrcMakerAccess', 'return resolveAdminAccess({ search, storage, desktop });', 'https://shinobione.github.io/lrc-maker/', "label: 'LRC Maker'", 'storage, desktop: media.matches'], 'Persistent admin LRC Maker access');
const adminStyles = read('css/admin-tools.css');
includesAll(adminStyles, ['.top-actions .admin-tool-access', 'border-radius:999px', '.top-actions .lrc-maker-access', '--admin-tool-disc:#d76cff'], 'Admin tool pill styling');
const pwaStyles = read('css/pwa.css');
includesAll(pwaStyles, ['.track-manager-access,', '.lrc-maker-access{', 'text-decoration:none!important', 'background:#d76cff'], 'Admin tool CSS fallback');
const worker = read('sw.js');
includesAll(worker, ["'./js/features/theme-scope.js'", "'./js/features/visual/audio-lab-registry.js'", "'./js/features/visual/audio-lab-sanctuary.js'", "'./js/visual-card-export-guard.js'", "'./css/admin-tools.css'"], 'PWA shell');

const build = assertCurrentBuild('Master specification');
assert.equal(build.number, 48);
assert.equal(build.id, '20260807-audiolab-decoded-buffer-v48');
assert.equal(build.cache, 'shinobi-launchpad-v48');
assert.equal(build.revision, 'audiolab-decoded-buffer-1');
assert.equal(build.display, '2026.08.07.48');
assert.equal(build.release, 'audiolab-decoded-buffer-20260807');

console.log('All nine LaunchPAD master-spec sections are regression-protected under Build 48.');