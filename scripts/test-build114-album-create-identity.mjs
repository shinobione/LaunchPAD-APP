import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';

const generated = path.join(os.tmpdir(), `build114-album-create-${process.pid}.mjs`);
const build = spawnSync(process.execPath, ['scripts/build-admin-worker-v525.mjs', generated], { encoding: 'utf8' });
if (build.status !== 0) {
  process.stdout.write(build.stdout || '');
  process.stderr.write(build.stderr || '');
  process.exit(build.status || 1);
}

let source = fs.readFileSync(generated, 'utf8');
assert.ok(source.includes('trackManagerVersion: "5.25"'));
assert.ok(source.includes('const STUDIO_BRIDGE_VERSION = "1.15";'));
source += '\nexport { createStudioAlbum, readAlbumManifest, getAlbumReadModel, normalizeAlbumManifest, saveStudioAlbumMetadata, buildPublishedAlbumProjection };\n';
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
  constructor() { this.objects = new Map(); this.sequence = 0; }
  async put(key, body, options = {}) {
    const bytes = await bodyBytes(body);
    const etag = crypto.createHash('sha256').update(bytes).digest('hex');
    this.objects.set(String(key), {
      bytes,
      etag,
      uploaded: new Date(Date.UTC(2026, 8, 13, 18, 40, this.sequence++)),
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

const operationId = '01234567-89ab-4cde-8f01-23456789abcd';
const otherId = '11234567-89ab-4cde-8f01-23456789abcd';
const bucket = new MemoryR2();
const env = { MEDIA_BUCKET: bucket };
const user = { email: 'build114@test.invalid' };

function createRequest(id, fields = {}, operation = operationId) {
  const payload = { intent: 'album-create-v1', album: { id, title: fields.title || 'Identity Album', type: fields.type || 'album' } };
  if (operation !== null) payload.operationId = operation;
  return new Request('https://tm.invalid/api/studio/albums', {
    method: 'POST',
    headers: { 'content-type': 'text/plain;charset=UTF-8', origin: 'https://shinobione.github.io' },
    body: JSON.stringify(payload),
  });
}

for (const invalid of ['', false, 1, {}, [], operationId + ' ', ' ' + operationId, operationId.replace('-4cde-', '-1cde-')]) {
  await assert.rejects(worker.createStudioAlbum(createRequest('invalid-album', {}, invalid), env, user), /INPUT_operationId/);
  assert.equal(bucket.objects.size, 0, 'Invalid Album identity must not write anything');
}

const created = await worker.createStudioAlbum(createRequest('identity-album'), env, user);
assert.equal(created.status, 201);
const payload = await created.json();
assert.equal(payload.operationId, operationId);
assert.equal(payload.album.creationOperationId, operationId);
assert.equal((await worker.readAlbumManifest(bucket, 'identity-album')).creationOperationId, operationId);
const privateRead = await (await worker.getAlbumReadModel('identity-album', env)).json();
assert.equal(privateRead.album.manifest.creationOperationId, operationId);
assert.equal(worker.normalizeAlbumManifest(payload.album).creationOperationId, operationId);

for (const id of [operationId, otherId]) {
  const duplicate = await worker.createStudioAlbum(createRequest('identity-album', {}, id), env, user);
  assert.equal(duplicate.status, 409);
  assert.equal((await duplicate.json()).code, 'ALBUM_EXISTS');
  assert.equal((await worker.readAlbumManifest(bucket, 'identity-album')).creationOperationId, operationId);
}

const current = await worker.readAlbumManifest(bucket, 'identity-album');
const saved = await worker.saveStudioAlbumMetadata('identity-album', new Request('https://tm.invalid/api/studio/albums/identity-album/metadata/save', {
  method: 'POST',
  headers: { 'content-type': 'text/plain;charset=UTF-8', origin: 'https://shinobione.github.io' },
  body: JSON.stringify({ intent: 'album-metadata-save-v1', expectedUpdatedAt: current.updatedAt, metadata: { title: 'Identity Album Renamed' } }),
}), env, user);
assert.equal(saved.status, 200);
assert.equal((await worker.readAlbumManifest(bucket, 'identity-album')).creationOperationId, operationId, 'Later Album writes must preserve creation evidence');

const legacy = await (await worker.createStudioAlbum(createRequest('legacy-album', { title: 'Legacy Album' }, null), env, user)).json();
assert.equal(legacy.created, true);
assert.equal(Object.hasOwn(legacy, 'operationId'), false);
assert.equal(Object.hasOwn(legacy.album, 'creationOperationId'), false);

const canonicalLegacy = await worker.readAlbumManifest(bucket, 'legacy-album');
assert.equal(Object.hasOwn(canonicalLegacy, 'creationOperationId'), false);

const publishedProjectionSource = worker.buildPublishedAlbumProjection.toString();
assert.equal(publishedProjectionSource.includes('creationOperationId'), false, 'Public Album projection must not publish private creation evidence');

console.log('Build114 LaunchPAD PASS: TM 5.25 / bridge 1.15 stores immutable private Album creation operation identity, preserves it across later writes, keeps legacy clients compatible and does not expose the identity in public Album projection.');
