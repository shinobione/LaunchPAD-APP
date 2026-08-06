import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  compareTracksNewestFirst,
  latestActiveTrackEntries,
  releaseSortTimestamp
} from '../js/core/catalog-ordering.js';

const read = path => fs.readFileSync(path, 'utf8');

const dated = { id: 'dated', releaseDate: '2026-08-01', createdAt: '2026-01-01', status: 'published' };
const fallback = { id: 'fallback', createdAt: '2026-07-01', status: 'published' };
const older = { id: 'older', releaseDate: '2025-12-01', status: 'published' };
const draft = { id: 'draft', releaseDate: '2027-01-01', status: 'draft' };

assert.equal(releaseSortTimestamp(dated), Date.parse('2026-08-01'));
assert.equal(releaseSortTimestamp(fallback), Date.parse('2026-07-01'));
assert.deepEqual([older, fallback, dated].sort(compareTracksNewestFirst).map(track => track.id), ['dated', 'fallback', 'older']);
assert.deepEqual(latestActiveTrackEntries([older, draft, fallback, dated], 5).map(entry => entry.track.id), ['dated', 'fallback', 'older']);

const feature = read('js/features/feature-11.js');
for (const required of [
  'normalizeLaunchRoute',
  'SHAREABLE_ROUTE_PATTERN',
  'LEGACY_DISCOGRAPHY_PATH',
  'launchRootPath',
  "window.history.replaceState(null, '', target)",
  'installRouteTransitions',
  "window.addEventListener('shinobi:route-change', replayRouteTransition)",
  "globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches",
  'renderLatestReleases',
  'latestActiveTrackEntries(tracks, 5)',
  "button.textContent = expanded ? 'Player' : 'Video'",
  "video.preload = 'auto'",
  "video.addEventListener('ended'",
  "video.addEventListener('stalled'",
  "audio?.addEventListener('play'",
  "audio?.addEventListener('pause'"
]) assert.ok(feature.includes(required), `Feature 11 app module is missing ${required}.`);

const routeStyles = read('css/feature-11.css');
for (const required of [
  '.view.active',
  '.view.active.route-entering',
  'route-view-enter 240ms',
  'route-view-replay 240ms',
  '@media (prefers-reduced-motion: reduce)',
  'transform: translate3d(0, 8px, 0)',
  'opacity: 0'
]) assert.ok(routeStyles.includes(required), `Route transition styles are missing ${required}.`);
assert.ok(!routeStyles.includes('height 240ms'), 'Route transitions must not animate layout properties.');

const about = read('js/features/about/about-controller.js');
for (const required of [
  "legalNotice.className = 'about-legal-notice'",
  'new Date().getFullYear()',
  '© ${new Date().getFullYear()} ShinoBiWan. All Rights Reserved.',
  'Unauthorized copying, reproduction, or reverse engineering is strictly prohibited.',
  'info.append(heading, buildLine, cacheLine, legalNotice)'
]) assert.ok(about.includes(required), `About legal notice is missing ${required}.`);

const aboutStyles = read('css/about-enhancements.css');
for (const required of [
  '.about-legal-notice',
  'flex:1 0 100%',
  'font-size:8px',
  'opacity:.72'
]) assert.ok(aboutStyles.includes(required), `About legal styling is missing ${required}.`);

const videoUI = read('js/features/track-videos.js');
for (const required of [
  "badge.textContent = 'VIDEO'",
  "button.textContent = 'Video'",
  "button.textContent = opening ? 'Player' : 'Video'",
  "video.preload = 'auto'",
  "video.setAttribute('webkit-playsinline', '')"
]) assert.ok(videoUI.includes(required), `Track video UI is missing ${required}.`);
assert.ok(!videoUI.includes("badge.textContent = 'CANVAS'"));
assert.ok(!videoUI.includes("button.textContent = 'Open Canvas'"));

const remote = read('js/core/remote-catalog.js');
for (const required of ['createdAt,','updatedAt,',"status: item.status || 'published'",'active: item.active !== false',"releaseDate: firstTimestamp(item.releaseDate"]) {
  assert.ok(remote.includes(required), `Remote catalog harmonization is missing ${required}.`);
}

const engine = read('js/app-engine.js');
for (const required of ['feature11.normalizeLaunchRoute()','feature11.prepareFeature11Catalog()','feature11.initFeature11({ audio })','css/feature-11.css']) {
  assert.ok(engine.includes(required), `Feature 11 boot wiring is missing ${required}.`);
}

const mobileStyles = routeStyles;
assert.ok(mobileStyles.includes('.launchpad-hero .hero-body'));
assert.ok(mobileStyles.includes('order: 1'));
assert.ok(mobileStyles.includes('.launchpad-hero .launchpad-banner-rail'));
assert.ok(mobileStyles.includes('order: 2'));

const managerServer = read('cloudflare/admin-worker.parts/03c-feature-11-sorting-server.part');
for (const required of [
  "TRACK_MANAGER_FEATURE_11_SERVER_VERSION='5.3'",
  'buildCanonicalTrackSummariesV53',
  'feature11ServerBuildCanonicalTrackSummaries',
  'releaseDate: manifest.releaseDate',
  'createdAt: manifest.createdAt',
  'return feature11ServerSortTracks(enriched)'
]) assert.ok(managerServer.includes(required), `Track Manager server sorting is missing ${required}.`);

const managerClient = read('cloudflare/admin-worker.parts/17-feature-11-sorting.inject.part');
for (const required of [
  "TRACK_MANAGER_FEATURE_11_VERSION='5.3'",
  'function feature11CompareTracks(left,right)',
  'state.tracks=feature11SortTracks(state.tracks||[])',
  "feature11VersionPill.textContent='v5.3'"
]) assert.ok(managerClient.includes(required), `Track Manager client sorting is missing ${required}.`);
assert.ok(!managerClient.includes('buildCanonicalTrackSummaries'), 'Browser UI must not reference the server-only catalog builder.');
assert.ok(!managerClient.includes('readManifest'), 'Browser UI must not reference the server-only manifest reader.');

const build = read('js/build-config.js');
assert.ok(build.includes("id: '20260806-m1-routing-legal'"));
assert.ok(build.includes("cache: 'shinobi-launchpad-v29'"));
assert.ok(build.includes("display: '2026.08.06.29'"));
assert.ok(build.includes("release: 'routing-navigation-legal-20260806'"));

console.log('Milestone 1 routing, route transitions and About legal protection remain valid.');
