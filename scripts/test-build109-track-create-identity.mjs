import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';
import { File } from 'node:buffer';

const generated = path.join(os.tmpdir(), `build109-create-${process.pid}.mjs`);
const build = spawnSync(process.execPath, ['scripts/build-admin-worker-v524.mjs', generated], { encoding: 'utf8' });
if (build.status !== 0) {
  process.stdout.write(build.stdout || '');
  process.stderr.write(build.stderr || '');
  process.exit(build.status || 1);
}

let source = fs.readFileSync(generated, 'utf8');
assert.ok(source.includes('trackManagerVersion: "5.24"'));
assert.ok(source.includes('const STUDIO_BRIDGE_VERSION = "1.14";'));
source += '\nexport { createStudioTrack, uploadStudioTrackAsset, readManifest, getTrack, saveTrack, saveStudioTrackMetadata, writeCatalogIndex, normalizeManifest };\n';
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
      uploaded: new Date(Date.UTC(2026, 7, 16, 0, 20, this.sequence++)),
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
const user = { email: 'build109@test.invalid' };
function request(payload) {
  return new Request('https://tm.invalid/api/studio/tracks/create', {
    method: 'POST', headers: { 'content-type': 'text/plain;charset=UTF-8', origin: 'https://shinobione.github.io' },
    body: JSON.stringify(payload),
  });
}
async function create(slug, fields = {}) {
  return worker.createStudioTrack(request({ intent: 'track-create-v1', slug, metadata: { title: slug }, ...fields }), env, user);
}
for (const invalid of [null, '', false, 1, {}, [], operationId + ' ', ' ' + operationId, operationId.replace('-4cde-', '-1cde-')]) {
  await assert.rejects(create('invalid', { operationId: invalid }), /INPUT_operationId/);
  assert.equal(bucket.objects.size, 0, 'Invalid identity must not write anything');
}
const created = await create('identity-track', { operationId });
assert.equal(created.status, 201);
const payload = await created.json();
assert.equal(payload.operationId, operationId);
assert.equal(payload.track.creationOperationId, operationId);
assert.equal((await worker.readManifest(bucket, 'identity-track')).creationOperationId, operationId);
assert.equal((await (await worker.getTrack('identity-track', env)).json()).track.manifest.creationOperationId, operationId);
assert.equal(worker.normalizeManifest(payload.track).creationOperationId, operationId);
for (const id of [operationId, otherId]) {
  const duplicate = await create('identity-track', { operationId: id });
  assert.equal(duplicate.status, 409);
  assert.equal((await duplicate.json()).code, 'TRACK_EXISTS');
  assert.equal((await worker.readManifest(bucket, 'identity-track')).creationOperationId, operationId);
}
const legacy = await (await create('legacy-track')).json();
assert.equal(legacy.created, true);
assert.equal(Object.hasOwn(legacy, 'operationId'), false);
assert.equal(Object.hasOwn(legacy.track, 'creationOperationId'), false);
const uppercase = operationId.toUpperCase();
assert.equal((await (await create('uppercase-track', { operationId: uppercase })).json()).operationId, uppercase);
const saved = await worker.saveStudioTrackMetadata('identity-track', request({
  intent: 'metadata-save-v1', expectedUpdatedAt: payload.track.updatedAt, metadata: { title: 'Edited' },
}), env, user);
assert.equal(saved.status, 200);
assert.equal((await worker.readManifest(bucket, 'identity-track')).creationOperationId, operationId);
await assert.rejects(worker.saveStudioTrackMetadata('identity-track', request({
  intent: 'metadata-save-v1', expectedUpdatedAt: (await worker.readManifest(bucket, 'identity-track')).updatedAt,
  metadata: { creationOperationId: otherId },
}), env, user), /Champs metadata non autorisés/);
for (const forged of [otherId, null, undefined]) {
  const form = new FormData();
  form.set('metadata', JSON.stringify({ title: 'Standalone edit', creationOperationId: forged }));
  const result = await worker.saveTrack('identity-track', new Request('https://tm.invalid', { method: 'POST', body: form }), env, user);
  assert.equal(result.status, 200);
  assert.equal((await worker.readManifest(bucket, 'identity-track')).creationOperationId, operationId);
}
const manifest = await worker.readManifest(bucket, 'identity-track');
const form = new FormData();
form.set('intent', 'asset-upload-v1');
form.set('expectedUpdatedAt', manifest.updatedAt);
form.set('creationOperationId', otherId);
form.set('file', new File(['Plain canonical lyrics'], 'lyrics.txt', { type: 'text/plain' }));
const upload = await worker.uploadStudioTrackAsset('identity-track', 'lyrics', new Request('https://tm.invalid', { method: 'POST', body: form }), env, user);
assert.equal(upload.status, 200);
assert.equal((await worker.readManifest(bucket, 'identity-track')).creationOperationId, operationId);
// Publish a memory-only fixture to exercise the actual catalog/public serializers.
const published = { ...(await worker.readManifest(bucket, 'identity-track')), status: 'published' };
await bucket.put('tracks/identity-track/manifest.json', JSON.stringify(published));
const index = await worker.writeCatalogIndex(bucket);
assert.equal(index.tracks.length, 1);
assert.equal(JSON.stringify(index).includes('creationOperationId'), false);
assert.equal(JSON.stringify(index).includes(operationId), false);
assert.equal((await bucket.get('catalog/index.json')).text instanceof Function, true);
assert.equal((await (await bucket.get('catalog/index.json')).text()).includes(operationId), false);
const publicWorker = (await import('../cloudflare/public-worker-v28.js')).default;
globalThis.caches = { default: { match: async () => undefined, put: async () => {} } };
for (const route of ['/tracks', '/tracks/identity-track']) {
  const response = await publicWorker.fetch(new Request('https://public.invalid' + route), env, { waitUntil: promise => promise });
  assert.equal(response.status, 200);
  const body = await response.text();
  assert.equal(body.includes('creationOperationId'), false);
  assert.equal(body.includes(operationId), false);
}
fs.unlinkSync(generated);
console.log('Build109 backend PASS: strict optional UUID, exact private evidence, TRACK_EXISTS, legacy compatibility, immutable metadata/assets, catalog and public list/detail privacy.');
