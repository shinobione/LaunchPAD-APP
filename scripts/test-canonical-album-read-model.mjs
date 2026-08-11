import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  CANONICAL_ALBUM_STATUSES,
  CANONICAL_ALBUM_TYPES,
  normalizeAlbumSchema,
} from '../js/core/catalog-schema.js';
import {
  albums,
  canonicalAlbums,
  getAlbum,
  getAlbumTracks,
  hasCanonicalAlbum,
  mergeRemoteAlbums,
  mergeRemoteTracks,
} from '../js/core/catalog-store.js';

const normalized = normalizeAlbumSchema({
  schemaVersion: 1,
  id: 'ghost-signal',
  title: 'Ghost Signal',
  type: 'EP',
  status: 'published',
  year: '2026',
  releaseDate: '2026-08-10',
  description: 'A canonical test album.',
  trackIds: ['alpha', 'beta', 'alpha', '', 'beta'],
  assets: {
    cover: { url: 'https://example.test/ghost-signal-cover.webp' },
    thumbnail: { url: 'https://example.test/ghost-signal-thumb.webp' },
  },
}, 0);

assert.equal(normalized.id, 'ghost-signal');
assert.equal(normalized.type, 'ep');
assert.equal(normalized.status, 'published');
assert.equal(normalized.year, 2026);
assert.deepEqual(normalized.trackIds, ['alpha', 'beta'], 'Canonical Album order must de-duplicate track ids without changing their order.');
assert.equal(normalized.cover, 'https://example.test/ghost-signal-cover.webp');
assert.equal(normalized.thumbnail, 'https://example.test/ghost-signal-thumb.webp');
assert.match(normalized.releaseDate, /^2026-08-10T/);
assert.deepEqual(CANONICAL_ALBUM_TYPES, ['album', 'ep', 'collection']);
assert.deepEqual(CANONICAL_ALBUM_STATUSES, ['draft', 'published', 'archived']);

const legacyNeon = getAlbum('neon-heartbreaks');
assert.ok(legacyNeon, 'Current hardcoded albums must remain available before authoritative public hydration.');
assert.equal(legacyNeon.source, 'legacy-catalog-js');

mergeRemoteTracks([
  {
    id: 'beta', title: 'Beta', file: '/beta.mp3', cover: '/beta.webp',
    albumId: 'ghost-signal', album: 'Ghost Signal', languages: ['English'], remote: true,
  },
  {
    id: 'alpha', title: 'Alpha', file: '/alpha.mp3', cover: '/alpha.webp',
    albumId: 'ghost-signal', album: 'Ghost Signal', languages: ['English'], remote: true,
  },
]);

let result = mergeRemoteAlbums([
  {
    id: 'ghost-signal', title: 'Ghost Signal', type: 'ep', status: 'published',
    cover: '/ghost-signal.webp', trackIds: ['alpha', 'beta'],
  },
  {
    id: 'coal-to-diamond', title: 'Coal to Diamond — canonical', type: 'album', status: 'published',
    cover: '/coal-canonical.webp', trackIds: [],
  },
], { authoritative: false });

assert.equal(result.canonical, 2);
assert.equal(canonicalAlbums.length, 2);
assert.equal(hasCanonicalAlbum('ghost-signal'), true);
assert.equal(getAlbum('coal-to-diamond').title, 'Coal to Diamond — canonical', 'Canonical Album must override the same legacy id in the transitional effective read model.');
assert.deepEqual(getAlbumTracks('ghost-signal').map(track => track.id), ['alpha', 'beta'], 'album.trackIds must be authoritative for membership and order when a canonical Album exists.');
assert.equal(albums.some(album => album.id === 'neon-heartbreaks'), true, 'Unmigrated legacy Albums must remain readable during the C2.5-B transition mode.');

result = mergeRemoteAlbums([], { authoritative: false });
assert.equal(result.canonical, 0);
assert.equal(hasCanonicalAlbum('ghost-signal'), false);
assert.equal(getAlbum('coal-to-diamond').title, 'Coal to Diamond', 'Removing the optional canonical projection in transition mode must restore legacy fallback.');

const historicalBuildDoc = fs.readFileSync('docs/PHASE-UX-C2-5-B-BUILD88-CANONICAL-ALBUM-READ-MODEL.md', 'utf8');
const remoteSource = fs.readFileSync('js/core/remote-catalog.js', 'utf8');
const adminReadModel = fs.readFileSync('cloudflare/admin-worker.parts/03-z1-album-read-model.part', 'utf8');
const projectionHook = fs.readFileSync('cloudflare/admin-worker.parts/03-z2-album-projection-hook.part', 'utf8');
const trackCatalog = fs.readFileSync('cloudflare/admin-worker.parts/02-catalog.part', 'utf8');
const publicWorkerCore = fs.readFileSync('cloudflare/public-worker.js', 'utf8');

for (const marker of [
  '2026.08.10.88',
  'phase-ux-c2-5-b-canonical-album-read-model-20260810',
  'canonical Album read model',
]) assert.ok(historicalBuildDoc.toLowerCase().includes(marker.toLowerCase()), `Historical Build 88 release record is missing ${marker}.`);

for (const marker of [
  'payload.albums',
  'mergeRemoteAlbums(remote.albums, {',
  'remoteAlbumCount: remote.albums.length',
  "source: item.source || 'cloudflare-r2'",
]) assert.ok(remoteSource.includes(marker), `Canonical Album client hydration ancestry is missing ${marker}.`);

for (const marker of [
  'const ALBUMS_PREFIX = "albums/"',
  'function normalizeAlbumManifest(input)',
  'function readAlbumManifest(bucket, albumId)',
  'async function buildCanonicalAlbumSummaries(objects, bucket)',
  'async function buildPublishedAlbumProjection(bucket, publishedTrackIds)',
  'trackIds: album.trackIds.filter(trackId => allowedTrackIds.has(trackId))',
  'safeAlbumAssetPath(assets.cover, "cover")',
  'safeAlbumAssetPath(assets.thumbnail, "thumbnail")',
]) assert.ok(adminReadModel.includes(marker), `Canonical Album R2 read model is missing ${marker}.`);

for (const marker of [
  'const writeCatalogIndexTracksOnly = writeCatalogIndex',
  'albumCount: albums.length',
  'albums,',
  'const listTracksWithoutAlbumReadModel = listTracks',
  'albumTotals',
]) assert.ok(projectionHook.includes(marker), `Canonical Album projection hook is missing ${marker}.`);

assert.ok(trackCatalog.includes('schemaVersion: 1'), 'C2.5-B must remain an additive catalog/index.json v1 extension, not a gratuitous breaking schemaVersion bump.');
assert.ok(!adminReadModel.includes('async function saveAlbum'), 'C2.5-B read-model file must not own Album writes.');
assert.ok(!adminReadModel.includes('async function deleteAlbum'), 'C2.5-B read-model file must not own Album deletes.');
assert.ok(!projectionHook.includes('request.method'), 'C2.5-B projection hook must not own a write route.');
assert.ok(!publicWorkerCore.includes('url.pathname === "/albums"'), 'The historical public Worker core remains unchanged; C2.5-F public Album consumption is layered by a versioned wrapper.');

console.log('C2.5-B historical guard passed under the current release: schema, ordered membership, transition fallback, private projection ancestry, and isolated public cutover layering.');
