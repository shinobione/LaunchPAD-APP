import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';

const generated = path.join(os.tmpdir(), `build116-track-delete-${process.pid}.mjs`);
const build = spawnSync(process.execPath, ['scripts/build-admin-worker-v527.mjs', generated], { encoding: 'utf8' });
if (build.status !== 0) {
  process.stdout.write(build.stdout || '');
  process.stderr.write(build.stderr || '');
  process.exit(build.status || 1);
}

let source = fs.readFileSync(generated, 'utf8');
for (const marker of [
  'trackManagerVersion: "5.27"',
  'const STUDIO_BRIDGE_VERSION = "1.17";',
  'const STUDIO_TRACK_DELETE_INTENT = "track-delete-v1";',
  'function studioTrackDeleteMatch(pathname)',
  'async function deleteStudioTrack(slug, request, env, user)',
  'TRACK_DELETE_ALBUM_OWNED',
  'TRACK_DELETE_ROLLBACK',
  '"track-delete"',
]) assert.ok(source.includes(marker), `Build116 generated Worker missing ${marker}`);

source += '\nexport { createStudioTrack, createStudioAlbum, saveStudioAlbumMembership, deleteStudioTrack, readAlbumManifest, readManifest, buildPublishedAlbumProjection };\n';
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
      uploaded: new Date(Date.UTC(2026, 8, 14, 17, 0, this.sequence++)),
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
const user = { email: 'build116@test.invalid' };
const origin = 'https://shinobione.github.io';

function textRequest(url, payload) {
  return new Request(url, {
    method: 'POST',
    headers: { 'content-type': 'text/plain;charset=UTF-8', origin },
    body: JSON.stringify(payload),
  });
}

async function createTrack(slug, operationId) {
  const response = await worker.createStudioTrack(textRequest('https://tm.invalid/api/studio/tracks/create', {
    intent: 'track-create-v1', operationId, slug, metadata: { title: slug.replaceAll('-', ' '), status: 'draft' },
  }), env, user);
  assert.equal(response.status, 201);
  return (await response.json()).track;
}

const ownedTrack = await createTrack('owned-track', '01234567-89ab-4cde-8f01-23456789abcd');
const albumResponse = await worker.createStudioAlbum(textRequest('https://tm.invalid/api/studio/albums', {
  intent: 'album-create-v1',
  operationId: '11234567-89ab-4cde-8f01-23456789abcd',
  album: { id: 'owner-album', title: 'Owner Album', type: 'album' },
}), env, user);
assert.equal(albumResponse.status, 201);
let album = (await albumResponse.json()).album;
const membership = await worker.saveStudioAlbumMembership('owner-album', textRequest('https://tm.invalid/api/studio/albums/owner-album/tracks/save', {
  intent: 'album-membership-save-v1', expectedUpdatedAt: album.updatedAt, trackIds: ['owned-track'],
}), env, user);
assert.equal(membership.status, 200);
album = await worker.readAlbumManifest(bucket, 'owner-album');
assert.deepEqual(album.trackIds, ['owned-track']);

const blocked = await worker.deleteStudioTrack('owned-track', textRequest('https://tm.invalid/api/studio/tracks/owned-track/delete', {
  intent: 'track-delete-v1', expectedUpdatedAt: (await worker.readManifest(bucket, 'owned-track')).updatedAt, confirmTrackId: 'owned-track',
}), env, user);
assert.equal(blocked.status, 409);
const blockedPayload = await blocked.json();
assert.equal(blockedPayload.code, 'TRACK_DELETE_ALBUM_OWNED');
assert.equal(blockedPayload.albumId, 'owner-album');
assert.ok(await worker.readManifest(bucket, 'owned-track'));
assert.deepEqual((await worker.readAlbumManifest(bucket, 'owner-album')).trackIds, ['owned-track'], 'Track delete must never mutate canonical Album membership implicitly');

const freeTrack = await createTrack('free-track', '21234567-89ab-4cde-8f01-23456789abcd');
await bucket.put('tracks/free-track/audio.mp3', new Uint8Array([1, 2, 3, 4]), { httpMetadata: { contentType: 'audio/mpeg' } });

const wrongConfirm = await worker.deleteStudioTrack('free-track', textRequest('https://tm.invalid/api/studio/tracks/free-track/delete', {
  intent: 'track-delete-v1', expectedUpdatedAt: freeTrack.updatedAt, confirmTrackId: 'wrong-track',
}), env, user).then(() => null, error => error);
assert.match(String(wrongConfirm?.message || wrongConfirm), /confirmTrackId/);
assert.ok(await worker.readManifest(bucket, 'free-track'));

const stale = await worker.deleteStudioTrack('free-track', textRequest('https://tm.invalid/api/studio/tracks/free-track/delete', {
  intent: 'track-delete-v1', expectedUpdatedAt: 'stale-revision', confirmTrackId: 'free-track',
}), env, user);
assert.equal(stale.status, 409);
assert.equal((await stale.json()).code, 'STALE_MANIFEST');
assert.ok(await worker.readManifest(bucket, 'free-track'));

const deleted = await worker.deleteStudioTrack('free-track', textRequest('https://tm.invalid/api/studio/tracks/free-track/delete', {
  intent: 'track-delete-v1', expectedUpdatedAt: freeTrack.updatedAt, confirmTrackId: 'free-track',
}), env, user);
assert.equal(deleted.status, 200);
const deletedPayload = await deleted.json();
assert.equal(deletedPayload.deleted, true);
assert.equal(deletedPayload.trackId, 'free-track');
assert.ok(deletedPayload.objectsDeleted >= 2);
assert.equal(await worker.readManifest(bucket, 'free-track'), null);
assert.equal((await bucket.list({ prefix: 'tracks/free-track/' })).objects.length, 0);
assert.equal((await bucket.list({ prefix: '_studio-backups/free-track/' })).objects.length, 0);

const projection = await worker.buildPublishedAlbumProjection(bucket, new Set(['owned-track', 'free-track']));
assert.equal(projection.some(item => item.trackIds?.includes?.('free-track')), false);

const rollbackTrack = await createTrack('rollback-track', '31234567-89ab-4cde-8f01-23456789abcd');
bucket.failNextCatalogPut = true;
const rolledBack = await worker.deleteStudioTrack('rollback-track', textRequest('https://tm.invalid/api/studio/tracks/rollback-track/delete', {
  intent: 'track-delete-v1', expectedUpdatedAt: rollbackTrack.updatedAt, confirmTrackId: 'rollback-track',
}), env, user);
assert.equal(rolledBack.status, 500);
const rollbackPayload = await rolledBack.json();
assert.equal(rollbackPayload.code, 'TRACK_DELETE_ROLLBACK');
assert.equal(rollbackPayload.rollback.trackObjectsRestored, true);
assert.equal(rollbackPayload.rollback.catalogRestored, true);
assert.ok(await worker.readManifest(bucket, 'rollback-track'));
assert.equal((await bucket.list({ prefix: '_studio-backups/rollback-track/' })).objects.length, 0);

console.log('Build116 LaunchPAD PASS: TM 5.27 / bridge 1.17 provides revision-guarded whole-Track deletion with exact ID confirmation, hard canonical Album ownership block, scoped R2 backup/rollback, catalog rebuild, canonical absence verification and no implicit Album mutation.');
