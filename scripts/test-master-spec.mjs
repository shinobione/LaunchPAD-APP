import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';

const read = path => fs.readFileSync(path, 'utf8');
const includesAll = (source, required, label) => required.forEach(value => {
  assert.ok(source.includes(value), `${label} is missing ${value}.`);
});

// 1 — Routing, navigation transitions and legal protection.
const feature11 = read('js/features/feature-11.js');
includesAll(feature11, [
  'normalizeLaunchRoute',
  'SHAREABLE_ROUTE_PATTERN',
  'installRouteTransitions',
  "window.addEventListener('shinobi:route-change', replayRouteTransition)",
  "globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches"
], 'Milestone 1 routing');
const about = read('js/features/about/about-controller.js');
includesAll(about, [
  'new Date().getFullYear()',
  'All Rights Reserved.',
  'Unauthorized copying, reproduction, or reverse engineering is strictly prohibited.'
], 'Milestone 1 legal notice');

// 2 — Unified catalog schema, release ordering, Latest and Recently Added.
const schema = read('js/core/catalog-schema.js');
includesAll(schema, ['normalizeCatalogTrack', 'releaseDate', 'createdAt', 'updatedAt'], 'Milestone 2 schema');
const ordering = read('js/core/catalog-ordering.js');
includesAll(ordering, [
  'latestActiveTrackEntries',
  'recentlyAddedTrackEntries',
  'releaseDate',
  'createdAt',
  'updatedAt',
  'releaseDateUnavailable'
], 'Milestone 2 ordering');

// 3 — Reactive Track Manager filters, manual palette and automatic deployment.
const manager3 = [
  read('cloudflare/admin-worker.parts/20-m3-track-manager-controls.inject.part'),
  read('cloudflare/admin-worker.parts/18-phase-12-hotfixes.inject.part')
].join('\n');
includesAll(manager3, [
  "TRACK_MANAGER_MILESTONE_3_VERSION='5.6'",
  'milestone3InstallReactiveFilters',
  'milestone3InstallManualPalette',
  'Extraire les couleurs',
  'phase12ManualColorRequest=true'
], 'Milestone 3 Track Manager');
const deploy = read('.github/workflows/deploy-cloudflare.yml');
includesAll(deploy, [
  "branches:\n      - main",
  "EXPECTED_PUBLIC_VERSION: '2.6'",
  "EXPECTED_ADMIN_VERSION: '5.7'",
  'Verify private Worker and Cloudflare Access',
  'Verify public catalog and media streaming'
], 'Cloudflare deployment workflow');

// 4 — Split page/player theme scoping.
const theme = read('js/features/theme-scope.js');
includesAll(theme, [
  'trackFromRoute',
  'playingTrack(audio)',
  'applyPagePalette(viewed, played)',
  'applyPlayerPalette(played)',
  "const scope = viewed && played && viewed.id !== played.id ? 'split' : 'unified';",
  'document.documentElement.dataset.themeScope = scope'
], 'Milestone 4 theme scoping');

// 5 — Discography hierarchy, Eras, embedded metadata and playback states.
const discography = read('js/features/discography-experience.js');
includesAll(discography, [
  "const FILTER_GROUP_ORDER = ['genre', 'language', 'content', 'energy', 'era', 'type', 'media', 'year', 'mood']",
  'erasFromCatalog',
  'installEraTimeline',
  "signalGroup('Moods', signals.moods)",
  "signalGroup('Themes', signals.themes)",
  'mini-equalizer',
  'track-card-loader'
], 'Milestone 5 Discography');

// 6 — Editorial Home and Neon Shatter visual switcher.
const home = read('js/features/home-editorial.js');
includesAll(home, [
  "const DEFAULT_VISUAL_MODE = 'neon-shatter'",
  'latestActiveTrackEntries(tracks, 1)',
  'home-official-release',
  'installVisualSwitcher',
  "canvas.addEventListener('touchstart'",
  "canvas.addEventListener('touchend'",
  "hero.dataset.mobileHeaderOrder = 'wordmark-first'"
], 'Milestone 6 Home');

// 7 — Audio Lab definitive registry, calibration and sanctuary hashes.
const registry = read('js/features/visual/audio-lab-registry.js');
includesAll(registry, [
  "AUDIO_LAB_DEFAULT_MODE = 'neon-shatter'",
  "id: 'spectrum'",
  "id: 'liquid-chrome'",
  "id: 'aurora-glass'",
  "id: 'nebula'",
  "id: 'singularity'",
  "AUDIO_LAB_SANCTUARY_IDS = Object.freeze(['spectrum', 'liquid-chrome'])"
], 'Milestone 7 registry');
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
const sanctuary = read('js/features/visual/audio-lab-sanctuary.js');
includesAll(sanctuary, [
  'normalizePresetControls',
  "controls.dataset.audioLabRegistry = 'sanctioned-v1'",
  'setTextIfChanged(button, VIEW_LABELS.video)',
  'setTextIfChanged(button, VIEW_LABELS.player)',
  'video.loop = true',
  "video.setAttribute('webkit-playsinline', '')"
], 'Milestone 7 sanctuary');

// 8 — Unified currentColor SVGs and the three-level badge hierarchy.
const icons = read('js/features/svg-icon-system.js');
includesAll(icons, [
  "const SVG_NS = 'http://www.w3.org/2000/svg'",
  "svg.setAttribute('stroke', 'currentColor')",
  'iconizeNavigation',
  'iconizeControls',
  'initSvgIconSystem'
], 'Milestone 8 SVG icons');
const badges = read('js/features/badge-hierarchy.js');
includesAll(badges, [
  "STATUS_LABELS = new Set(['CLEAN', 'EXPLICIT', 'LYRICS', 'LYRICS SYNCED', 'VIDEO', 'UPCOMING', 'DRAFT'])",
  "if (admin && status === 'draft') statuses.push('DRAFT')",
  'parentGenre',
  'secondary.slice(0, 3)',
  'secondary.length - 3',
  'TECHNICAL_TAG.test(label)'
], 'Milestone 8 badge hierarchy');
const manager8 = read('cloudflare/admin-worker.parts/21-m8-svg-badges.inject.part');
includesAll(manager8, [
  "TRACK_MANAGER_MILESTONE_8_VERSION='5.7'",
  "svg.setAttribute('stroke','currentColor')",
  "if(status==='draft')result.push('DRAFT')",
  'tags.slice(0,3)',
  "pill.textContent='v5.7'"
], 'Milestone 8 Track Manager');

// 9 — Final release wiring.
const engine = read('js/app-engine.js');
includesAll(engine, [
  'initThemeScoping({ audio })',
  'initDiscographyExperience({ audio })',
  'initHomeEditorial()',
  'initAudioLabSanctuary({ audio })',
  'initSvgIconSystem()',
  'initBadgeHierarchy()'
], 'Application boot');
const worker = read('sw.js');
includesAll(worker, [
  "'./js/features/theme-scope.js'",
  "'./js/features/discography-experience.js'",
  "'./js/features/home-editorial.js'",
  "'./js/features/visual/audio-lab-registry.js'",
  "'./js/features/visual/audio-lab-sanctuary.js'",
  "'./js/features/svg-icon-system.js'",
  "'./js/features/badge-hierarchy.js'"
], 'PWA shell');
const build = read('js/build-config.js');
includesAll(build, [
  "id: '20260807-unified-v40'",
  "cache: 'shinobi-launchpad-v40'",
  "revision: 'cloudflare-main-reconciliation-1'",
  "display: '2026.08.07.40'",
  "release: 'unified-v40-20260807'"
], 'Final release metadata');

console.log('All nine LaunchPAD master-spec sections are present and regression-protected under unified Build 40.');
