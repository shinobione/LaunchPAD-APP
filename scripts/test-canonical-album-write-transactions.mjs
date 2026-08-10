import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source = [
  'cloudflare/admin-worker.parts/03-z3-album-write-core.part',
  'cloudflare/admin-worker.parts/03-z4-album-membership.part',
].map(path => fs.readFileSync(path, 'utf8')).join('\n');

const clone = value => value == null ? value : JSON.parse(JSON.stringify(value));
const albums = new Map();
const tracks = new Map();
const counters = { albumPuts: 0, albumDeletes: 0, trackWrites: 0, catalogWrites: 0 };
let failNextCatalogWrite = false;

function resetState() {
  albums.clear();
  tracks.clear();
  counters.albumPuts = 0;
  counters.albumDeletes = 0;
  counters.trackWrites = 0;
  counters.catalogWrites = 0;
  failNextCatalogWrite = false;
}

const slugify = value => String(value || '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
  .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 120);
const normalizeColor = value => {
  const clean = String(value || '').trim();
  return /^#[0-9a-f]{6}$/i.test(clean) ? clean.toLowerCase() : null;
};
const normalizeAlbumManifest = input => ({
  schemaVersion: 1,
  id: slugify(input?.id),
  title: String(input?.title || input?.id || '').trim(),
  type: ['album', 'ep', 'collection'].includes(String(input?.type || '').toLowerCase()) ? String(input.type).toLowerCase() : 'album',
  status: ['draft', 'published', 'archived'].includes(input?.status) ? input.status : 'draft',
  year: input?.year == null || input?.year === '' ? null : Number(input.year),
  releaseDate: input?.releaseDate || null,
  description: input?.description == null || String(input.description).trim() === '' ? null : String(input.description).trim(),
  heading: input?.heading == null || String(input.heading).trim() === '' ? null : String(input.heading).trim(),
  trackIds: [...new Set((Array.isArray(input?.trackIds) ? input.trackIds : []).map(slugify).filter(Boolean))],
  accent: normalizeColor(input?.accent),
  accent2: normalizeColor(input?.accent2),
  assets: {
    cover: input?.assets?.cover || null,
    thumbnail: input?.assets?.thumbnail || null,
  },
  createdAt: input?.createdAt || '2026-08-10T00:00:00.000Z',
  updatedAt: input?.updatedAt || '2026-08-10T00:00:00.000Z',
  updatedBy: input?.updatedBy || null,
});
const normalizeManifest = input => clone(input);
const albumPrefix = id => `albums/${id}/`;
const ALBUM_MANIFEST_NAME = 'manifest.json';

const fakeBucket = {
  async put(key, body) {
    if (key.startsWith('albums/') && key.endsWith('/manifest.json')) {
      const id = key.slice('albums/'.length, -'/manifest.json'.length);
      albums.set(id, JSON.parse(String(body)));
      counters.albumPuts += 1;
      return;
    }
    throw new Error(`Unexpected fake R2 put: ${key}`);
  },
  async delete(key) {
    if (key.startsWith('albums/') && key.endsWith('/manifest.json')) {
      const id = key.slice('albums/'.length, -'/manifest.json'.length);
      albums.delete(id);
      counters.albumDeletes += 1;
      return;
    }
    throw new Error(`Unexpected fake R2 delete: ${key}`);
  },
};

const readAlbumManifest = async (_bucket, id) => clone(albums.get(id) || null);
const readManifest = async (_bucket, id) => clone(tracks.get(id) || null);
const writeManifest = async (_bucket, manifest) => {
  tracks.set(manifest.slug, clone(manifest));
  counters.trackWrites += 1;
  return manifest;
};
const writeCatalogIndex = async () => {
  counters.catalogWrites += 1;
  if (failNextCatalogWrite) {
    failNextCatalogWrite = false;
    throw new Error('TEST_CATALOG_FAILURE');
  }
  return { generatedAt: `catalog-${counters.catalogWrites}`, albumCount: albums.size, count: tracks.size };
};
const listAllObjects = async () => [];
const albumAssetStateFromObjects = (_objects, manifest) => ({
  cover: manifest.assets?.cover ? { present: true, path: manifest.assets.cover } : null,
  thumbnail: manifest.assets?.thumbnail ? { present: true, path: manifest.assets.thumbnail } : null,
});
const buildCanonicalAlbumSummaries = async () => [...albums.values()].map(clone);
const jsonResponse = (payload, status = 200) => ({ status, payload });

const context = vm.createContext({
  console,
  slugify,
  normalizeColor,
  normalizeAlbumManifest,
  normalizeManifest,
  albumPrefix,
  ALBUM_MANIFEST_NAME,
  readAlbumManifest,
  readManifest,
  writeManifest,
  writeCatalogIndex,
  listAllObjects,
  albumAssetStateFromObjects,
  buildCanonicalAlbumSummaries,
  jsonResponse,
  STATUS_VALUES: new Set(['draft', 'published', 'archived']),
  ALBUM_TYPE_VALUES: new Set(['album', 'ep', 'collection']),
  ALBUMS_PREFIX: 'albums/',
  STUDIO_ALLOWED_ORIGIN: 'https://shinobione.github.io',
  studioMetadataContentType: () => 'text/plain',
  crypto: { randomUUID: () => 'test-uuid' },
});
vm.runInContext(`${source}\nglobalThis.__tx = { createStudioAlbum, saveStudioAlbumMetadata, saveStudioAlbumMembership, moveStudioAlbumTrack };`, context);
const tx = context.__tx;
const env = { MEDIA_BUCKET: fakeBucket };
const user = { email: 'test@shinobiwan.local' };
const request = payload => ({
  headers: { get: name => name.toLowerCase() === 'content-length' ? String(Buffer.byteLength(JSON.stringify(payload))) : null },
  text: async () => JSON.stringify(payload),
});

resetState();
let response = await tx.createStudioAlbum(request({
  intent: 'album-create-v1',
  album: { id: 'ghost-signal', title: 'Ghost Signal', type: 'album', status: 'published', trackIds: ['should-not-pass'] },
}), env, user);
assert.equal(response.status, 201);
assert.equal(response.payload.album.id, 'ghost-signal');
assert.equal(response.payload.album.status, 'draft', 'Creation must always start draft.');
assert.deepEqual(response.payload.album.trackIds, [], 'Creation must ignore client membership.');
assert.equal(counters.catalogWrites, 1);

const created = clone(albums.get('ghost-signal'));
const putsBeforeStale = counters.albumPuts;
response = await tx.saveStudioAlbumMetadata('ghost-signal', request({
  intent: 'album-metadata-save-v1',
  expectedUpdatedAt: 'stale-revision',
  metadata: { title: 'Must Not Save' },
}), env, user);
assert.equal(response.status, 409);
assert.equal(response.payload.code, 'STALE_ALBUM');
assert.equal(counters.albumPuts, putsBeforeStale, 'Stale metadata must not write the Album.');
assert.equal(albums.get('ghost-signal').title, created.title);

resetState();
albums.set('source', normalizeAlbumManifest({ id: 'source', title: 'Source', status: 'draft', trackIds: ['track-a'], updatedAt: 'source-v1' }));
albums.set('target', normalizeAlbumManifest({ id: 'target', title: 'Target', status: 'draft', trackIds: [], updatedAt: 'target-v1' }));
tracks.set('track-a', { slug: 'track-a', title: 'Track A', status: 'published', album: { id: 'source', title: 'Source' }, assets: {}, createdAt: 'track-created', updatedAt: 'track-v1' });
response = await tx.saveStudioAlbumMembership('target', request({
  intent: 'album-membership-save-v1',
  expectedUpdatedAt: 'target-v1',
  trackIds: ['track-a'],
}), env, user);
assert.equal(response.status, 409);
assert.equal(response.payload.code, 'ALBUM_MEMBERSHIP_CONFLICT');
assert.equal(counters.albumPuts, 0);
assert.equal(counters.trackWrites, 0);

resetState();
albums.set('target', normalizeAlbumManifest({ id: 'target', title: 'Target', status: 'draft', trackIds: ['track-a', 'track-b'], updatedAt: 'target-v1' }));
tracks.set('track-a', { slug: 'track-a', title: 'Track A', status: 'published', album: { id: 'target', title: 'Target' }, assets: {}, createdAt: 'track-created', updatedAt: 'track-a-v1' });
tracks.set('track-b', { slug: 'track-b', title: 'Track B', status: 'published', album: { id: 'target', title: 'Target' }, assets: {}, createdAt: 'track-created', updatedAt: 'track-b-v1' });
const trackBRevision = tracks.get('track-b').updatedAt;
response = await tx.moveStudioAlbumTrack('target', request({
  intent: 'album-track-move-v1',
  trackId: 'track-b',
  expectedTargetUpdatedAt: 'target-v1',
  targetIndex: 0,
}), env, user);
assert.equal(response.status, 200);
assert.deepEqual(response.payload.targetTrackIds, ['track-b', 'track-a']);
assert.equal(response.payload.trackCacheUpdated, false);
assert.equal(counters.trackWrites, 0, 'Pure reorder must not rewrite track manifests.');
assert.equal(tracks.get('track-b').updatedAt, trackBRevision);

resetState();
albums.set('source', normalizeAlbumManifest({ id: 'source', title: 'Source', status: 'draft', trackIds: ['track-a'], updatedAt: 'source-v1' }));
albums.set('target', normalizeAlbumManifest({ id: 'target', title: 'Target', status: 'draft', trackIds: ['track-b'], updatedAt: 'target-v1' }));
tracks.set('track-a', { slug: 'track-a', title: 'Track A', status: 'published', album: { id: 'source', title: 'Source' }, assets: {}, createdAt: 'track-created', updatedAt: 'track-a-v1' });
tracks.set('track-b', { slug: 'track-b', title: 'Track B', status: 'published', album: { id: 'target', title: 'Target' }, assets: {}, createdAt: 'track-created', updatedAt: 'track-b-v1' });
response = await tx.moveStudioAlbumTrack('target', request({
  intent: 'album-track-move-v1',
  trackId: 'track-a',
  sourceAlbumId: 'source',
  expectedSourceUpdatedAt: 'source-v1',
  expectedTargetUpdatedAt: 'target-v1',
  targetIndex: 1,
}), env, user);
assert.equal(response.status, 200);
assert.deepEqual(albums.get('source').trackIds, []);
assert.deepEqual(albums.get('target').trackIds, ['track-b', 'track-a']);
assert.equal(tracks.get('track-a').album.id, 'target');
assert.equal(counters.trackWrites, 1);

resetState();
albums.set('rollback-album', normalizeAlbumManifest({ id: 'rollback-album', title: 'Before', status: 'draft', trackIds: [], updatedAt: 'rollback-v1' }));
failNextCatalogWrite = true;
response = await tx.saveStudioAlbumMetadata('rollback-album', request({
  intent: 'album-metadata-save-v1',
  expectedUpdatedAt: 'rollback-v1',
  metadata: { title: 'After' },
}), env, user);
assert.equal(response.status, 500);
assert.equal(response.payload.code, 'ALBUM_METADATA_ROLLBACK');
assert.equal(response.payload.rollback.albumsRestored, true);
assert.equal(response.payload.rollback.catalogRestored, true);
assert.equal(albums.get('rollback-album').title, 'Before', 'Rollback must restore canonical Album manifest.');

console.log('C2.5-C Album transaction smoke passed: draft create, stale no-write, ownership conflict, reorder stability, cross-Album move and catalog-failure rollback.');
