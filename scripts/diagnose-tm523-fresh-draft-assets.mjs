import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';
import { File } from 'node:buffer';

const generated = path.join(os.tmpdir(), `tm523-fresh-draft-${process.pid}.mjs`);
const build = spawnSync(process.execPath, ['scripts/build-admin-worker-v523.mjs', generated], {
  encoding: 'utf8',
  stdio: ['ignore', 'pipe', 'pipe'],
});
if (build.status !== 0) {
  process.stdout.write(build.stdout || '');
  process.stderr.write(build.stderr || '');
  process.exit(build.status || 1);
}

let source = fs.readFileSync(generated, 'utf8');
assert.ok(source.includes('trackManagerVersion: "5.23"'), 'Diagnostic must exercise Track Manager v5.23.');
assert.ok(source.includes('const STUDIO_BRIDGE_VERSION = "1.13";'), 'Diagnostic must exercise Studio bridge v1.13.');
source += '\nexport { createStudioTrack, uploadStudioTrackAsset, readManifest };\n';
fs.writeFileSync(generated, source, 'utf8');

const worker = await import(`${pathToFileURL(generated).href}?t=${Date.now()}`);

async function bytesFrom(body) {
  if (body == null) return new Uint8Array();
  if (typeof body === 'string') return new TextEncoder().encode(body);
  if (body instanceof Uint8Array) return new Uint8Array(body);
  if (body instanceof ArrayBuffer) return new Uint8Array(body);
  if (ArrayBuffer.isView(body)) return new Uint8Array(body.buffer, body.byteOffset, body.byteLength);
  if (body instanceof Blob) return new Uint8Array(await body.arrayBuffer());
  if (typeof body.getReader === 'function') return new Uint8Array(await new Response(body).arrayBuffer());
  throw new TypeError(`Unsupported fake-R2 body: ${Object.prototype.toString.call(body)}`);
}

class MemoryR2Bucket {
  #objects = new Map();
  #clock = 0;

  async put(key, body, options = {}) {
    const bytes = await bytesFrom(body);
    const digest = crypto.createHash('sha256').update(bytes).digest('hex');
    const uploaded = new Date(Date.UTC(2026, 7, 16, 0, 0, this.#clock++));
    this.#objects.set(String(key), {
      bytes,
      httpMetadata: structuredClone(options.httpMetadata || {}),
      customMetadata: structuredClone(options.customMetadata || {}),
      etag: digest,
      uploaded,
    });
    return { key: String(key), etag: digest };
  }

  async get(key) {
    const stored = this.#objects.get(String(key));
    if (!stored) return null;
    const bytes = new Uint8Array(stored.bytes);
    return {
      key: String(key),
      size: bytes.byteLength,
      etag: stored.etag,
      httpEtag: `"${stored.etag}"`,
      uploaded: new Date(stored.uploaded),
      httpMetadata: structuredClone(stored.httpMetadata),
      customMetadata: structuredClone(stored.customMetadata),
      body: new Blob([bytes]).stream(),
      async text() { return new TextDecoder().decode(bytes); },
      async arrayBuffer() { return bytes.slice().buffer; },
    };
  }

  async delete(keys) {
    for (const key of Array.isArray(keys) ? keys : [keys]) this.#objects.delete(String(key));
  }

  async list({ prefix = '', cursor = undefined, limit = 1000 } = {}) {
    assert.equal(cursor, undefined, 'Diagnostic fake R2 does not expect pagination for this tiny fixture.');
    const keys = [...this.#objects.keys()].filter(key => key.startsWith(prefix)).sort().slice(0, limit);
    return {
      objects: keys.map(key => {
        const stored = this.#objects.get(key);
        return {
          key,
          size: stored.bytes.byteLength,
          etag: stored.etag,
          httpEtag: `"${stored.etag}"`,
          uploaded: new Date(stored.uploaded),
          httpMetadata: structuredClone(stored.httpMetadata),
          customMetadata: structuredClone(stored.customMetadata),
        };
      }),
      truncated: false,
      cursor: undefined,
    };
  }

  keys() { return [...this.#objects.keys()].sort(); }
}

function jsonRequest(url, body) {
  return new Request(url, {
    method: 'POST',
    headers: { 'content-type': 'text/plain;charset=UTF-8', origin: 'https://shinobione.github.io' },
    body: JSON.stringify(body),
  });
}

function uploadRequest(url, { expectedUpdatedAt, kind, file, audioDuration = null }) {
  const form = new FormData();
  form.set('intent', 'asset-upload-v1');
  form.set('expectedUpdatedAt', expectedUpdatedAt);
  form.set('file', file);
  if (kind === 'audio' && audioDuration != null) {
    form.set('audioDuration', String(audioDuration));
    form.set('audioReadable', 'true');
  }
  return new Request(url, { method: 'POST', headers: { origin: 'https://shinobione.github.io' }, body: form });
}

async function responseJson(response, label) {
  const text = await response.text();
  let payload;
  try { payload = JSON.parse(text); }
  catch { throw new Error(`${label} returned non-JSON HTTP ${response.status}: ${text}`); }
  console.log(`\n--- ${label} ---`);
  console.log(`HTTP ${response.status}`);
  console.log(JSON.stringify(payload, null, 2));
  return payload;
}

const bucket = new MemoryR2Bucket();
const env = { MEDIA_BUCKET: bucket };
const user = { email: 'diagnostic@shinobiwan.invalid' };
const slug = 'pixels-promises';

console.log('TM v5.23 diagnostic: fresh draft → first audio → first cover');

const createResponse = await worker.createStudioTrack(
  jsonRequest('https://tm.invalid/api/studio/tracks/create', {
    intent: 'track-create-v1',
    slug,
    metadata: {
      title: 'Pixels & Promises',
      status: 'draft',
      type: 'album-track',
      year: 2026,
      releaseDate: '2026-01-25',
      languages: ['English'],
      genres: ['Folk', 'Reggaeton'],
      tags: ['Folk', 'Reggaeton'],
      moods: [],
      themes: [],
      era: null,
      energy: null,
      bpm: null,
      key: null,
      keyConfidence: null,
      explicit: false,
      accent: null,
      accent2: null,
    },
  }),
  env,
  user,
);
const created = await responseJson(createResponse, 'CREATE');
assert.equal(createResponse.status, 201);
assert.equal(created.ok, true);
assert.equal(created.created, true);
assert.equal(created.trackId, slug);
assert.equal(created.track?.status, 'draft');
assert.equal(created.track?.type, 'album-track');
assert.equal(created.track?.album?.id, 'singles');
assert.ok(created.track?.updatedAt);

const audioBytes = new Uint8Array(64 * 1024);
for (let index = 0; index < audioBytes.length; index += 1) audioBytes[index] = index % 251;
const audioFile = new File([audioBytes], 'Pixels-Promises.mp3', { type: 'audio/mpeg' });
const audioResponse = await worker.uploadStudioTrackAsset(
  slug,
  'audio',
  uploadRequest(`https://tm.invalid/api/studio/tracks/${slug}/assets/audio/upload`, {
    expectedUpdatedAt: created.track.updatedAt,
    kind: 'audio',
    file: audioFile,
    audioDuration: 222.123,
  }),
  env,
  user,
);
const audio = await responseJson(audioResponse, 'FIRST AUDIO');
assert.equal(audioResponse.status, 200, `First audio upload failed: ${JSON.stringify(audio)}`);
assert.equal(audio.ok, true);
assert.equal(audio.saved, true);
assert.equal(audio.kind, 'audio');
assert.equal(audio.duration, 222.123);
assert.ok(audio.updatedAt);
let manifest = await worker.readManifest(bucket, slug);
assert.equal(manifest?.assets?.audio, 'audio.mp3');
assert.equal(manifest?.duration, 222.123);
assert.ok(await bucket.get(`tracks/${slug}/audio.mp3`));

const jpegBytes = new Uint8Array(32 * 1024).fill(0x7f);
const coverFile = new File([jpegBytes], '1-1.jpeg', { type: 'image/jpeg' });
const coverResponse = await worker.uploadStudioTrackAsset(
  slug,
  'cover',
  uploadRequest(`https://tm.invalid/api/studio/tracks/${slug}/assets/cover/upload`, {
    expectedUpdatedAt: audio.updatedAt,
    kind: 'cover',
    file: coverFile,
  }),
  env,
  user,
);
const cover = await responseJson(coverResponse, 'FIRST COVER');
assert.equal(coverResponse.status, 200, `First cover upload failed: ${JSON.stringify(cover)}`);
assert.equal(cover.ok, true);
assert.equal(cover.saved, true);
assert.equal(cover.kind, 'cover');
assert.ok(cover.updatedAt);
manifest = await worker.readManifest(bucket, slug);
assert.equal(manifest?.assets?.audio, 'audio.mp3');
assert.equal(manifest?.assets?.cover, 'cover.jpeg');
assert.ok(await bucket.get(`tracks/${slug}/cover.jpeg`));

console.log('\nFinal fake-R2 keys:');
console.log(bucket.keys().join('\n'));
console.log('\nPASS: current TM v5.23 bundle succeeds for a fresh Singles/album-track draft, first MP3 and first JPEG on a strongly-consistent R2 model.');
