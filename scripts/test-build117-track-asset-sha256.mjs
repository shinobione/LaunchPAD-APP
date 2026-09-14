import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';

const generated = path.join(os.tmpdir(), `build117-track-asset-sha256-${process.pid}.mjs`);
const build = spawnSync(process.execPath, ['scripts/build-admin-worker-v528.mjs', generated], { encoding: 'utf8' });
if (build.status !== 0) {
  process.stdout.write(build.stdout || '');
  process.stderr.write(build.stderr || '');
  process.exit(build.status || 1);
}

let source = fs.readFileSync(generated, 'utf8');
for (const marker of [
  'trackManagerVersion: "5.28"',
  'const STUDIO_BRIDGE_VERSION = "1.18";',
  'const requestedSha256Raw = formData.get("sha256");',
  '...(requestedSha256 ? { sha256: requestedSha256 } : {})',
  'rereadObject.customMetadata?.sha256 !== requestedSha256',
  'sha256: rereadObject.customMetadata?.sha256 || null',
  'sha256: object?.customMetadata?.sha256 || null',
]) assert.ok(source.includes(marker), `Build117 generated Worker missing ${marker}`);

source += '\nexport { createStudioTrack, uploadStudioTrackAsset, readManifest, assetStateFromObjects, listAllObjects, writeCatalogIndex };\n';
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
      uploaded: new Date(Date.UTC(2026, 8, 14, 18, 0, this.sequence++)),
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
const user = { email: 'build117@test.invalid' };
const origin = 'https://shinobione.github.io';

function textRequest(url, payload) {
  return new Request(url, {
    method: 'POST',
    headers: { 'content-type': 'text/plain;charset=UTF-8', origin },
    body: JSON.stringify(payload),
  });
}

function assetRequest(slug, kind, expectedUpdatedAt, file, sha256) {
  const form = new FormData();
  form.set('intent', 'asset-upload-v1');
  form.set('expectedUpdatedAt', expectedUpdatedAt);
  form.set('file', file);
  if (sha256 !== undefined) form.set('sha256', sha256);
  return new Request(`https://tm.invalid/api/studio/tracks/${slug}/assets/${kind}/upload`, {
    method: 'POST', headers: { origin }, body: form,
  });
}

async function createTrack(slug, operationId) {
  const response = await worker.createStudioTrack(textRequest('https://tm.invalid/api/studio/tracks/create', {
    intent: 'track-create-v1', operationId, slug, metadata: { title: slug.replaceAll('-', ' '), status: 'draft' },
  }), env, user);
  assert.equal(response.status, 201);
  return (await response.json()).track;
}

let manifest = await createTrack('digest-track', '41234567-89ab-4cde-8f01-23456789abcd');
const exactBytes = new TextEncoder().encode('Build117 exact canonical bytes');
const exactDigest = crypto.createHash('sha256').update(exactBytes).digest('hex');
const exactFile = new File([exactBytes], 'cover.png', { type: 'image/png' });

const uploaded = await worker.uploadStudioTrackAsset('digest-track', 'cover', assetRequest('digest-track', 'cover', manifest.updatedAt, exactFile, exactDigest), env, user);
assert.equal(uploaded.status, 200);
const uploadedPayload = await uploaded.json();
assert.equal(uploadedPayload.saved, true);
assert.equal(uploadedPayload.sha256, exactDigest, 'Upload response must echo the exact reread private digest.');
const stored = await bucket.get('tracks/digest-track/cover.png');
assert.equal(stored.customMetadata.sha256, exactDigest, 'R2 private custom metadata must preserve the browser-supplied digest.');
manifest = await worker.readManifest(bucket, 'digest-track');
const scoped = await worker.listAllObjects(bucket, 'tracks/digest-track/');
const state = worker.assetStateFromObjects(scoped, manifest);
assert.equal(state.cover.sha256, exactDigest, 'Private Track asset read model must expose the stored digest.');

await worker.writeCatalogIndex(bucket);
const publicCatalog = await bucket.get('catalog/index.json');
assert.ok(publicCatalog);
assert.equal((await publicCatalog.text()).includes('sha256'), false, 'Public catalog projection must not expose private upload digest evidence.');

const invalidFile = new File(['bad digest request'], 'thumbnail.png', { type: 'image/png' });
const invalidError = await worker.uploadStudioTrackAsset('digest-track', 'thumbnail', assetRequest('digest-track', 'thumbnail', manifest.updatedAt, invalidFile, 'abc'), env, user).then(() => null, error => error);
assert.match(String(invalidError?.message || invalidError), /sha256/i);
assert.equal(await bucket.get('tracks/digest-track/thumbnail.png'), null, 'Invalid supplied digest must not write the asset.');

const legacyBytes = new TextEncoder().encode('legacy client remains compatible');
const legacyFile = new File([legacyBytes], 'lyrics.txt', { type: 'text/plain' });
const legacy = await worker.uploadStudioTrackAsset('digest-track', 'lyrics', assetRequest('digest-track', 'lyrics', manifest.updatedAt, legacyFile, undefined), env, user);
assert.equal(legacy.status, 200, 'Legacy upload without digest stays compatible at the backend boundary.');
const legacyPayload = await legacy.json();
assert.equal(legacyPayload.sha256, null);
const legacyObject = await bucket.get('tracks/digest-track/lyrics.txt');
assert.equal(legacyObject.customMetadata.sha256, undefined);

console.log('Build117 LaunchPAD PASS: TM 5.28 / bridge 1.18 validates optional supplied SHA-256 evidence, stores it privately with Track assets, rereads and returns it on verified upload, exposes it only through the private asset read model, keeps public catalog clean, and preserves legacy upload compatibility.');
