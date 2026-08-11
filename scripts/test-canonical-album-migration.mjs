import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { webcrypto } from 'node:crypto';

const source = fs.readFileSync('cloudflare/admin-worker.parts/03-z6-album-migration.part', 'utf8');
const planArtifact = JSON.parse(fs.readFileSync('cloudflare/album-migration-plan.v1.json', 'utf8'));
const clone = value => value == null ? value : JSON.parse(JSON.stringify(value));

assert.equal(planArtifact.schemaVersion, 1);
assert.equal(planArtifact.migrationId, 'phase-ux-c2-5-e-legacy-albums-v1');
assert.equal(planArtifact.source.ref, '35cfbff8cd9e06ef3548f8e909eb033a1c0a60bb');
assert.deepEqual(planArtifact.albums.map(album => album.id), [
  'neon-heartbreaks',
  'coal-to-diamond',
  'love-letters-from-saigon',
]);
assert.equal(planArtifact.singles.migrateAsCanonicalAlbum, false);
for (const album of planArtifact.albums) {
  assert.match(album.cover.sourceUrl, new RegExp(`/shinobione/LaunchPAD-APP/${planArtifact.source.ref}/`));
  assert.ok(!album.cover.sourceUrl.includes('/main/'), 'Album migration covers must be pinned to an immutable ref.');
}

const tracks = new Map();
const albums = new Map();
const objects = new Map();
let catalogBody = JSON.stringify({ schemaVersion: 1, generatedAt: 'before', count: 5, tracks: [] }, null, 2) + '\n';
let catalogWrites = 0;
let failNextCatalogWrite = false;
let trackWrites = 0;

function reset() {
  tracks.clear(); albums.clear(); objects.clear(); catalogWrites = 0; failNextCatalogWrite = false; trackWrites = 0;
  catalogBody = JSON.stringify({ schemaVersion: 1, generatedAt: 'before', count: 5, tracks: [] }, null, 2) + '\n';
  tracks.set('neon-one', { slug: 'neon-one', title: 'Neon One', status: 'published', sequence: 2, album: { id: 'neon-heartbreaks', title: 'Neon Heartbreaks' }, updatedAt: 'n1-v1', assets: {} });
  tracks.set('neon-zero', { slug: 'neon-zero', title: 'Neon Zero', status: 'published', sequence: 1, album: { id: 'neon-heartbreaks', title: 'Neon Heartbreaks' }, updatedAt: 'n0-v1', assets: {} });
  tracks.set('coal-a', { slug: 'coal-a', title: 'Coal A', status: 'published', album: { id: 'coal-to-diamond', title: 'Coal to Diamond' }, updatedAt: 'c1-v1', assets: {} });
  tracks.set('coal-b', { slug: 'coal-b', title: 'Coal B', status: 'published', album: { id: 'coal-to-diamond', title: 'Coal to Diamond' }, updatedAt: 'c2-v1', assets: {} });
  tracks.set('saigon-a', { slug: 'saigon-a', title: 'Saigon A', status: 'published', sequence: 1, album: { id: 'love-letters-from-saigon', title: 'Love Letters from Saigon' }, updatedAt: 's1-v1', assets: {} });
  tracks.set('ghost-signal', { slug: 'ghost-signal', title: 'Ghost Signal', status: 'published', album: { id: 'singles', title: 'Singles' }, updatedAt: 'g1-v1', assets: {} });
}

const slugify = value => String(value || '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 120);
const TRACKS_PREFIX = 'tracks/';
const MANIFEST_NAME = 'manifest.json';
const ALBUMS_PREFIX = 'albums/';
const ALBUM_MANIFEST_NAME = 'manifest.json';
const CATALOG_INDEX_KEY = 'catalog/index.json';
const albumPrefix = id => `albums/${id}/`;

const fakeBucket = {
  async get(key) {
    if (key === CATALOG_INDEX_KEY) return { text: async () => catalogBody, httpMetadata: { contentType: 'application/json; charset=utf-8' } };
    if (objects.has(key)) return objects.get(key);
    return null;
  },
  async put(key, body, options = {}) {
    if (key === CATALOG_INDEX_KEY) {
      catalogBody = typeof body === 'string' ? body : Buffer.from(body).toString('utf8');
      objects.set(key, { key, body, options });
      return;
    }
    objects.set(key, { key, body, options });
  },
  async delete(key) { objects.delete(key); },
};

const listAllObjects = async (_bucket, prefix) => {
  if (prefix === TRACKS_PREFIX) return [...tracks.keys()].map(slug => ({ key: `tracks/${slug}/manifest.json` }));
  if (prefix === ALBUMS_PREFIX) return [...albums.keys()].map(id => ({ key: `albums/${id}/manifest.json` }));
  return [];
};
const readManifest = async (_bucket, id) => clone(tracks.get(id) || null);
const readAlbumManifest = async (_bucket, id) => clone(albums.get(id) || null);
const buildCanonicalAlbumSummaries = async () => [...albums.values()].map(clone);
const normalizeAlbumManifest = input => ({
  schemaVersion: 1,
  id: slugify(input.id), title: input.title, type: input.type || 'album', status: input.status || 'draft', year: input.year ?? null,
  releaseDate: input.releaseDate || null, description: input.description || null, heading: input.heading || null,
  trackIds: [...input.trackIds], accent: input.accent || null, accent2: input.accent2 || null,
  assets: { cover: input.assets?.cover || null, thumbnail: input.assets?.thumbnail || null },
  createdAt: input.createdAt, updatedAt: input.updatedAt, updatedBy: input.updatedBy || null,
});
const writeAlbumManifest = async (_bucket, manifest) => { albums.set(manifest.id, clone(manifest)); return manifest; };
const writeManifest = async (_bucket, manifest) => { tracks.set(manifest.slug, clone(manifest)); trackWrites += 1; return manifest; };
const writeCatalogIndex = async () => {
  catalogWrites += 1;
  if (failNextCatalogWrite) { failNextCatalogWrite = false; throw new Error('TEST_CATALOG_FAILURE'); }
  const payload = { schemaVersion: 1, generatedAt: `after-${catalogWrites}`, count: tracks.size, tracks: [], albumCount: albums.size, albums: [...albums.values()].map(clone) };
  catalogBody = JSON.stringify(payload, null, 2) + '\n';
  return payload;
};
const inspectCanonicalAlbumQuality = async (_bucket, manifest) => ({
  publishable: Boolean(manifest.title && manifest.trackIds.length && manifest.assets?.cover && manifest.trackIds.every(id => tracks.get(id)?.status === 'published')),
  checks: [], tracks: [], assets: { cover: manifest.assets?.cover ? { present: true } : null },
});
const jsonResponse = (payload, status = 200) => ({ status, payload, json: async () => clone(payload) });
const readStudioAlbumJsonPayload = async (request, expectedIntent) => {
  const payload = JSON.parse(await request.text());
  if (payload.intent !== expectedIntent) throw new Error('AUTH_bad intent');
  return payload;
};
let listAlbums = async () => jsonResponse({ ok: true, albums: [...albums.values()].map(clone), totals: { total: albums.size } });
let createStudioAlbum = async () => jsonResponse({ ok: true, baseCreate: true }, 201);

const fakeFetch = async url => {
  assert.ok(String(url).includes('raw.githubusercontent.com/shinobione/LaunchPAD-APP/35cfbff8'));
  return new Response(Uint8Array.from([1, 2, 3, 4]), { status: 200, headers: { 'content-type': 'image/jpeg', 'content-length': '4' } });
};
const request = payload => ({
  clone() { return request(payload); },
  async text() { return JSON.stringify(payload); },
});

const context = vm.createContext({
  console, Map, Set, Date, JSON, Math, Number, String, Array, Object, Error, URL, Response, Uint8Array, TextEncoder,
  crypto: webcrypto, fetch: fakeFetch, Buffer,
  TRACKS_PREFIX, MANIFEST_NAME, ALBUMS_PREFIX, ALBUM_MANIFEST_NAME, CATALOG_INDEX_KEY,
  slugify, albumPrefix, listAllObjects, readManifest, readAlbumManifest, buildCanonicalAlbumSummaries,
  normalizeAlbumManifest, writeAlbumManifest, writeManifest, writeCatalogIndex, inspectCanonicalAlbumQuality,
  jsonResponse, readStudioAlbumJsonPayload,
  listAlbums, createStudioAlbum,
});
vm.runInContext(`${source}\nglobalThis.__migration = { buildStudioLegacyAlbumMigrationDryRun, applyStudioLegacyAlbumMigration, listAlbums, createStudioAlbum };`, context);
const migration = context.__migration;
const env = { MEDIA_BUCKET: fakeBucket };
const user = { email: 'migration-test@shinobiwan.local' };

reset();
let dry = await migration.buildStudioLegacyAlbumMigrationDryRun(env);
assert.equal(dry.writesPerformed, false);
assert.equal(dry.albums.length, 3);
assert.equal(dry.singles.migrateAsCanonicalAlbum, false);
assert.equal(dry.singles.candidateCount, 1);
const neon = dry.albums.find(album => album.id === 'neon-heartbreaks');
const coal = dry.albums.find(album => album.id === 'coal-to-diamond');
assert.equal(neon.readyToApply, true);
assert.equal(neon.requiresOrderConfirmation, false);
assert.deepEqual(Array.from(neon.proposedTrackIds), ['neon-zero', 'neon-one']);
assert.equal(coal.readyToApply, true);
assert.equal(coal.requiresOrderConfirmation, true);
assert.equal(catalogWrites, 0);
assert.equal(trackWrites, 0);
assert.equal(objects.size, 0, 'Dry-run must not create an R2 object.');

let response = await migration.applyStudioLegacyAlbumMigration(request({
  intent: 'album-migration-apply-v1', albumId: 'neon-heartbreaks', expectedStateToken: 'stale',
  confirm: 'MIGRATE neon-heartbreaks', trackIds: ['neon-zero', 'neon-one'], orderConfirmed: true,
}), env, user);
assert.equal(response.status, 409);
assert.equal(response.payload.code, 'STALE_ALBUM_MIGRATION_PLAN');
assert.equal(albums.size, 0);
assert.equal(catalogWrites, 0);

response = await migration.applyStudioLegacyAlbumMigration(request({
  intent: 'album-migration-apply-v1', albumId: 'neon-heartbreaks', expectedStateToken: neon.stateToken,
  confirm: 'MIGRATE neon-heartbreaks', trackIds: ['neon-zero', 'neon-one'], orderConfirmed: true,
}), env, user);
assert.equal(response.status, 201);
assert.equal(response.payload.migrated, true);
assert.equal(response.payload.trackCachesRewritten, 0);
assert.equal(response.payload.singlesUntouched, true);
assert.deepEqual(albums.get('neon-heartbreaks').trackIds, ['neon-zero', 'neon-one']);
assert.equal(albums.get('neon-heartbreaks').status, 'published');
assert.equal(trackWrites, 0, 'Legacy compatibility caches must not churn when already correct.');
assert.ok(objects.has('albums/neon-heartbreaks/cover/cover.jpeg'));
assert.equal(catalogWrites, 1);

reset();
dry = await migration.buildStudioLegacyAlbumMigrationDryRun(env);
const coalFresh = dry.albums.find(album => album.id === 'coal-to-diamond');
const beforeRollbackCatalog = catalogBody;
failNextCatalogWrite = true;
response = await migration.applyStudioLegacyAlbumMigration(request({
  intent: 'album-migration-apply-v1', albumId: 'coal-to-diamond', expectedStateToken: coalFresh.stateToken,
  confirm: 'MIGRATE coal-to-diamond', trackIds: ['coal-b', 'coal-a'], orderConfirmed: true,
}), env, user);
assert.equal(response.status, 500);
assert.equal(response.payload.code, 'ALBUM_MIGRATION_ROLLBACK');
assert.equal(response.payload.rollback.manifestRemoved, true);
assert.equal(response.payload.rollback.coverRemoved, true);
assert.equal(response.payload.rollback.catalogRestored, true);
assert.equal(albums.has('coal-to-diamond'), false);
assert.equal(objects.has('albums/coal-to-diamond/cover/cover.jpeg'), false);
assert.equal(catalogBody, beforeRollbackCatalog, 'Rollback must restore the exact pre-migration catalog body.');
assert.equal(trackWrites, 0);

const wrappedList = await migration.listAlbums(env);
assert.equal(wrappedList.payload.migration.mode, 'dry-run');
assert.equal(wrappedList.payload.migration.writesPerformed, false);

console.log('C2.5-E Album migration smoke passed: immutable plan, read-only dry-run, stale token, single-Album apply, zero track churn and full manifest/cover/catalog rollback.');
