import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';
import { File } from 'node:buffer';

const generated = path.join(os.tmpdir(), `tm524-assets-${process.pid}.mjs`);
const build = spawnSync(process.execPath, ['scripts/build-admin-worker-v524.mjs', generated], { encoding: 'utf8' });
if (build.status !== 0) {
  process.stdout.write(build.stdout || '');
  process.stderr.write(build.stderr || '');
  process.exit(build.status || 1);
}

let source = fs.readFileSync(generated, 'utf8');
assert.ok(source.includes('trackManagerVersion: "5.24"'));
assert.ok(source.includes('const STUDIO_BRIDGE_VERSION = "1.14";'));
source += '\nexport { createStudioTrack, uploadStudioTrackAsset, readManifest };\n';
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

function createRequest(slug) {
  return new Request('https://tm.invalid/api/studio/tracks/create', {
    method: 'POST',
    headers: { 'content-type': 'text/plain;charset=UTF-8', origin: 'https://shinobione.github.io' },
    body: JSON.stringify({
      intent: 'track-create-v1', slug,
      metadata: {
        title: 'Pixels & Promises', status: 'draft', type: 'album-track', year: 2026, releaseDate: '2026-01-25',
        languages: ['English'], genres: ['Folk', 'Reggaeton'], tags: ['Folk', 'Reggaeton'], moods: [], themes: [],
        era: null, energy: null, bpm: null, key: null, keyConfidence: null, explicit: false, accent: null, accent2: null,
      },
    }),
  });
}

function assetRequest(slug, kind, expectedUpdatedAt, file, duration = null) {
  const form = new FormData();
  form.set('intent', 'asset-upload-v1');
  form.set('expectedUpdatedAt', expectedUpdatedAt);
  form.set('file', file);
  if (kind === 'audio') {
    form.set('audioDuration', String(duration));
    form.set('audioReadable', 'true');
  }
  return new Request(`https://tm.invalid/api/studio/tracks/${slug}/assets/${kind}/upload`, {
    method: 'POST', headers: { origin: 'https://shinobione.github.io' }, body: form,
  });
}

async function json(response) {
  const payload = await response.json();
  return { response, payload };
}

const bucket = new MemoryR2();
const env = { MEDIA_BUCKET: bucket };
const user = { email: 'regression@shinobiwan.invalid' };
const slug = 'pixels-promises';

const created = await json(await worker.createStudioTrack(createRequest(slug), env, user));
assert.equal(created.response.status, 201);
assert.equal(created.payload.ok, true);
assert.equal(created.payload.track?.status, 'draft');
assert.equal(created.payload.track?.type, 'album-track');
assert.equal(created.payload.track?.album?.id, 'singles', 'Regression must cover the real observed Singles + album-track draft shape.');

const audioBytes = new Uint8Array(65536);
for (let i = 0; i < audioBytes.length; i += 1) audioBytes[i] = i % 251;
const audioFile = new File([audioBytes], 'Pixels-Promises.mp3', { type: 'audio/mpeg' });
const audio = await json(await worker.uploadStudioTrackAsset(
  slug, 'audio', assetRequest(slug, 'audio', created.payload.track.updatedAt, audioFile, 222.123), env, user,
));
assert.equal(audio.response.status, 200, `Fresh-draft audio upload regressed: ${JSON.stringify(audio.payload)}`);
assert.equal(audio.payload.ok, true);
assert.equal(audio.payload.saved, true);
assert.equal(audio.payload.kind, 'audio');
assert.equal(audio.payload.duration, 222.123);
assert.ok(audio.payload.updatedAt);
let manifest = await worker.readManifest(bucket, slug);
assert.equal(manifest?.assets?.audio, 'audio.mp3');
assert.equal(manifest?.duration, 222.123);
assert.ok(await bucket.get(`tracks/${slug}/audio.mp3`));

const coverFile = new File([new Uint8Array(32768).fill(0x7f)], '1-1.jpeg', { type: 'image/jpeg' });
const cover = await json(await worker.uploadStudioTrackAsset(
  slug, 'cover', assetRequest(slug, 'cover', audio.payload.updatedAt, coverFile), env, user,
));
assert.equal(cover.response.status, 200, `Fresh-draft cover upload regressed: ${JSON.stringify(cover.payload)}`);
assert.equal(cover.payload.ok, true);
assert.equal(cover.payload.saved, true);
assert.equal(cover.payload.kind, 'cover');
manifest = await worker.readManifest(bucket, slug);
assert.equal(manifest?.assets?.audio, 'audio.mp3');
assert.equal(manifest?.assets?.cover, 'cover.jpeg');
assert.ok(await bucket.get(`tracks/${slug}/cover.jpeg`));

console.log('TM v5.24 fresh-draft asset regression passed: create + first MP3 + first JPEG commit canonically, including the observed album-track/Singles shape.');
