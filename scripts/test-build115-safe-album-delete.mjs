import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';

const generated = path.join(os.tmpdir(), `build115-album-delete-${process.pid}.mjs`);
const build = spawnSync(process.execPath, ['scripts/build-admin-worker-v526.mjs', generated], { encoding: 'utf8' });
if (build.status !== 0) {
  process.stdout.write(build.stdout || '');
  process.stderr.write(build.stderr || '');
  process.exit(build.status || 1);
}

let source = fs.readFileSync(generated, 'utf8');
for (const marker of [
  'trackManagerVersion: "5.26"',
  'const STUDIO_BRIDGE_VERSION = "1.16";',
  'const STUDIO_ALBUM_DELETE_INTENT = "album-delete-v1";',
  'function studioAlbumDeleteMatch(pathname)',
  'async function deleteStudioAlbum(albumId, request, env, user)',
  'confirmAlbumId',
  'whole-delete-',
  'ALBUM_DELETE_ROLLBACK',
  '"album-delete"',
]) assert.ok(source.includes(marker), `Build115 generated Worker missing ${marker}`);

source += '\nexport { createStudioTrack, createStudioAlbum, saveStudioAlbumMembership, deleteStudioAlbum, readAlbumManifest, readManifest, writeAlbumManifest, buildPublishedAlbumProjection };\n';
fs.writeFileSync(generated, source, 'utf8');
const worker = await import(`${pathToFileURL(generated).href}?t=${Date.now()}`);

async function bodyBytes(body) {
  if (typeof body === 'string') return new TextEncoder().encode(body);
  if (body instanceof Uint8Array) return new Uint8Array(body);
  if (body instanceof ArrayBuffer) return new Uint8Array(body);
  if (ArrayBuffer.isView(body)) return new Uint8Array(body.buffer, body.byteOffset, body.byteLength);
  if (body instanceof Blob) return new Uint8Array(await body.arrayBuffer());
  if (body && typeof body.getReader === 'function') return new Uint8Array(await new Response(body).arrayBuffer());
  throw new TypeError(`Unsupported R2 test body: ${Object.prototype.toString.call(body)}`);
}

class MemoryR2 {
  constructor() { this.objects = new Map(); this.sequence = 0; this.failNextCatalogPut = false; }
  async put(key, body, options = {}) {
    if (this.failNextCatalogPut && String(key) === 'catalog/index.json') {
      this.failNextCatalogPut = false;
      throw new Error('Injected catalog rebuild failure');
    }
    const bytes = await bodyBytes(body);
    const etag = crypto.createHash('sha256').update(bytes).digest('hex');
    this.objects.set(String(key), {
      bytes,
      etag,
      uploaded: new Date(Date.UTC(2026, 8, 13, 22, 0, this.sequence++)),
      httpMetadata: structuredClone(options.httpMetadata || {}),
      customMetadata: structuredClone(options.customMetadata || {}),
    });
    return { key: String(key), etag };
  }
  async get(key) {
    const item = this.objects.get(String(key));
    if (!item) return null;
    const bytes = new Uint8Array(item.bytes);
    return {
      key: String(key), size: bytes.byteLength, etag: item.etag, httpEtag: `"${item.etag}"`,
      uploaded: new Date(item.uploaded), httpMetadata: structuredClone(item.httpMetadata), customMetadata: structuredClone(item.customMetadata),
      body: new Blob([bytes]).stream(),
      async text() { return new TextDecoder().decode(bytes); },
    };
  }
  async delete(keys) { for (const key of Array.isArray(keys) ? keys : [keys]) this.objects.delete(String(key)); }
  async list({ prefix = '', cursor = undefined, limit = 1000 } = {}) {
    assert.equal(cursor, undefined);
    const keys = [...this.objects.keys()].filter(key => key.startsWith(prefix)).sort().slice(0, limit);
    return {
      objects: keys.map(key => {
        const item = this.objects.get(key);
        return {
          key, size: item.bytes.byteLength, etag: item.etag, httpEtag: `"${item.etag}"`, uploaded: new Date(item.uploaded),
          httpMetadata: structuredClone(item.httpMetadata), customMetadata: structuredClone(item.customMetadata),
        };
      }),
      truncated: false,
    };
  }
}

const bucket = new MemoryR2();
const env = { MEDIA_BUCKET: bucket };
const user = { email: 'build115@test.invalid' };
const origin = 'https://shinobione.github.io';
const trackOperationId = '01234567-89ab-4cde-8f01-23456789abcd';
const albumOperationId = '11234567-89ab-4cde-8f01-23456789abcd';

function textRequest(url, payload) {
  return new Request(url, {
    method: 'POST',
    headers: { 'content-type': 'text/plain;charset=UTF-8', origin },
    body: JSON.stringify(payload),
  });
}

const trackCreated = await worker.createStudioTrack(textRequest('https://tm.invalid/api/studio/tracks/create', {
  intent: 'track-create-v1',
  operationId: trackOperationId,
  slug: 'delete-member',
  metadata: { title: 'Delete Member', status: 'draft' },
}), env, user);
assert.equal(trackCreated.status, 201);

const albumCreatedResponse = await worker.createStudioAlbum(textRequest('https://tm.invalid/api/studio/albums', {
  intent: 'album-create-v1',
  operationId: albumOperationId,
  album: { id: 'delete-me', title: 'Delete Me', type: 'album', year: null },
}), env, user);
assert.equal(albumCreatedResponse.status, 201);
let album = (await albumCreatedResponse.json()).album;
assert.equal(album.year, null);

const membership = await worker.saveStudioAlbumMembership('delete-me', textRequest('https://tm.invalid/api/studio/albums/delete-me/tracks/save', {
  intent: 'album-membership-save-v1',
  expectedUpdatedAt: album.updatedAt,
  trackIds: ['delete-member'],
}), env, user);
assert.equal(membership.status, 200);
album = await worker.readAlbumManifest(bucket, 'delete-me');
assert.deepEqual(album.trackIds, ['delete-member']);

await bucket.put('albums/delete-me/cover/cover.webp', new Uint8Array([1, 2, 3, 4]), {
  httpMetadata: { contentType: 'image/webp' },
  customMetadata: { kind: 'album-cover', albumId: 'delete-me' },
});
album = await worker.writeAlbumManifest(bucket, {
  ...album,
  assets: { ...album.assets, cover: 'cover/cover.webp' },
  updatedAt: '2026-09-13T22:01:00.000Z',
});

const wrongConfirm = await worker.deleteStudioAlbum('delete-me', textRequest('https://tm.invalid/api/studio/albums/delete-me/delete', {
  intent: 'album-delete-v1',
  expectedUpdatedAt: album.updatedAt,
  confirmAlbumId: 'wrong-id',
}), env, user).then(() => null, error => error);
assert.match(String(wrongConfirm?.message || wrongConfirm), /confirmAlbumId/);
assert.ok(await worker.readAlbumManifest(bucket, 'delete-me'));

const stale = await worker.deleteStudioAlbum('delete-me', textRequest('https://tm.invalid/api/studio/albums/delete-me/delete', {
  intent: 'album-delete-v1',
  expectedUpdatedAt: 'stale-revision',
  confirmAlbumId: 'delete-me',
}), env, user);
assert.equal(stale.status, 409);
assert.equal((await stale.json()).code, 'STALE_ALBUM_DELETE');
assert.ok(await worker.readAlbumManifest(bucket, 'delete-me'));

const deleted = await worker.deleteStudioAlbum('delete-me', textRequest('https://tm.invalid/api/studio/albums/delete-me/delete', {
  intent: 'album-delete-v1',
  expectedUpdatedAt: album.updatedAt,
  confirmAlbumId: 'delete-me',
}), env, user);
assert.equal(deleted.status, 200);
const deletedPayload = await deleted.json();
assert.equal(deletedPayload.deleted, true);
assert.equal(deletedPayload.albumId, 'delete-me');
assert.equal(deletedPayload.tracksReleased, 1);
assert.ok(deletedPayload.objectsDeleted >= 2);
assert.equal(await worker.readAlbumManifest(bucket, 'delete-me'), null);
assert.equal((await bucket.list({ prefix: 'albums/delete-me/' })).objects.length, 0);
assert.equal((await bucket.list({ prefix: '_studio-backups/albums/delete-me/' })).objects.length, 0);
const releasedTrack = await worker.readManifest(bucket, 'delete-member');
assert.equal(releasedTrack.album?.id, 'singles');
assert.equal(releasedTrack.album?.title, 'Singles');

const projection = await worker.buildPublishedAlbumProjection(bucket, new Set(['delete-member']));
assert.equal(projection.some(item => item.id === 'delete-me'), false);

const rollbackCreated = await worker.createStudioAlbum(textRequest('https://tm.invalid/api/studio/albums', {
  intent: 'album-create-v1',
  operationId: '21234567-89ab-4cde-8f01-23456789abcd',
  album: { id: 'rollback-album', title: 'Rollback Album', type: 'album' },
}), env, user);
assert.equal(rollbackCreated.status, 201);
const rollbackAlbum = (await rollbackCreated.json()).album;
bucket.failNextCatalogPut = true;
const rolledBack = await worker.deleteStudioAlbum('rollback-album', textRequest('https://tm.invalid/api/studio/albums/rollback-album/delete', {
  intent: 'album-delete-v1',
  expectedUpdatedAt: rollbackAlbum.updatedAt,
  confirmAlbumId: 'rollback-album',
}), env, user);
assert.equal(rolledBack.status, 500);
const rollbackPayload = await rolledBack.json();
assert.equal(rollbackPayload.code, 'ALBUM_DELETE_ROLLBACK');
assert.equal(rollbackPayload.rollback.albumObjectsRestored, true);
assert.equal(rollbackPayload.rollback.tracksRestored, true);
assert.equal(rollbackPayload.rollback.catalogRestored, true);
assert.ok(await worker.readAlbumManifest(bucket, 'rollback-album'));
assert.equal((await bucket.list({ prefix: '_studio-backups/albums/rollback-album/' })).objects.length, 0);

console.log('Build115 LaunchPAD PASS: TM 5.26 / bridge 1.16 provides revision-guarded whole-Album deletion with exact ID confirmation, scoped R2 backup/rollback, Track cache release to Singles, catalog rebuild, canonical absence verification and no public projection change.');
