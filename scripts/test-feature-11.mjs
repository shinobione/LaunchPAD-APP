import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  compareTracksNewestFirst,
  latestActiveTrackEntries,
  recentlyAddedTrackEntries,
  releaseSortInfo,
  releaseSortTimestamp
} from '../js/core/catalog-ordering.js';
import { normalizeTrackSchema } from '../js/core/catalog-schema.js';

const read = path => fs.readFileSync(path, 'utf8');

const now = Date.parse('2026-08-06T00:00:00Z');
const dated = { id: 'dated', releaseDate: '2026-08-01', createdAt: '2026-01-01', status: 'published' };
const fallback = { id: 'fallback', createdAt: '2026-07-01', status: 'published' };
const older = { id: 'older', releaseDate: '2025-12-01', createdAt: '2026-08-05', status: 'published' };
const draft = { id: 'draft', releaseDate: '2026-08-02', status: 'draft' };
const future = { id: 'future', releaseDate: '2026-12-01', status: 'published' };
const upcoming = { id: 'upcoming', releaseDate: '2026-08-02', status: 'upcoming' };
const inactive = { id: 'inactive', releaseDate: '2026-08-03', active: false, status: 'published' };

assert.equal(releaseSortTimestamp(dated), Date.parse('2026-08-01'));
assert.equal(releaseSortTimestamp(fallback), Date.parse('2026-07-01'));
assert.equal(releaseSortInfo(fallback).source, 'createdAt');
assert.equal(releaseSortInfo(fallback).fallback, true);
assert.deepEqual([older, fallback, dated].sort(compareTracksNewestFirst).map(track => track.id), ['dated', 'fallback', 'older']);
assert.deepEqual(
  latestActiveTrackEntries([older, draft, fallback, dated, future, upcoming, inactive], 5, now).map(entry => entry.track.id),
  ['dated', 'fallback', 'older']
);
assert.deepEqual(
  recentlyAddedTrackEntries([older, fallback, dated], 5).map(entry => entry.track.id),
  ['older', 'fallback', 'dated']
);

const normalized = normalizeTrackSchema({
  slug: 'legacy-track',
  name: 'Legacy Track',
  releasedAt: '2025-02-03',
  created_at: '2026-01-02',
  genres: ['Trap'],
  moods: ['Dark'],
  themes: ['Night'],
  language: 'English'
}, 4);
assert.equal(normalized.id, 'legacy-track');
assert.equal(normalized.releaseDate, '2025-02-03T00:00:00.000Z');
assert.equal(normalized.createdAt, '2026-01-02T00:00:00.000Z');
assert.equal(normalized.genre, 'Trap');
assert.deepEqual(normalized.languages, ['English']);
assert.equal(normalized.importIndex, 4);

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
  'renderRecentlyAdded',
  'recentlyAddedTrackEntries(tracks, tracks.length)',
  '.filter(({ track }) => !latestIds.has(track.id))',
  '.slice(0, 5)',
  'Release date unavailable',
  'CATALOG ACTIVITY',
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
  'opacity: 0',
  '.recently-added-section',
  '.release-date-fallback',
  '.catalog-card-context'
]) assert.ok(routeStyles.includes(required), `Feature 11 styles are missing ${required}.`);
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

const remote = read('js/core/remote-catalog.js');
for (const required of [
  "import { normalizeTrackSchema } from './catalog-schema.js'",
  'importedAt: item.migration?.importedAt || createdAt',
  "source: 'cloudflare-r2'",
  'map((item, index) => mapRemoteTrack(item, normalizedApiUrl, index))'
]) assert.ok(remote.includes(required), `Remote catalog harmonization is missing ${required}.`);

const store = read('js/core/catalog-store.js');
for (const required of [
  "import { normalizeTrackSchema } from './catalog-schema.js'",
  'normalizeTrackSchema(remoteTrack, importIndex)',
  "status === 'draft' || status === 'archived' || status === 'upcoming'",
  'officialRelease === null || officialRelease <= now'
]) assert.ok(store.includes(required), `Catalog store normalization is missing ${required}.`);

const engine = read('js/app-engine.js');
for (const required of ['feature11.normalizeLaunchRoute()','feature11.prepareFeature11Catalog()','feature11.initFeature11({ audio })','css/feature-11.css']) {
  assert.ok(engine.includes(required), `Feature 11 boot wiring is missing ${required}.`);
}

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
assert.ok(!managerClient.includes('buildCanonicalTrackSummaries'));
assert.ok(!managerClient.includes('readManifest'));

const build = read('js/build-config.js');
for (const required of [
  "id: '20260807-unified-v40'",
  "cache: 'shinobi-launchpad-v40'",
  "display: '2026.08.07.40'",
  "release: 'unified-v40-20260807'"
]) assert.ok(build.includes(required), `Feature 11 must be validated against current Build 40 metadata: ${required}.`);

console.log('Milestone 2 canonical catalog ordering and Recently Added separation remain valid under Build 40.');
