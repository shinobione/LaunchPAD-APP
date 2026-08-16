import assert from 'node:assert/strict';

class FakeR2Object {
  constructor(value, { contentType = 'application/octet-stream' } = {}) {
    this.value = value;
    this.body = typeof value === 'string' ? new TextEncoder().encode(value) : value;
    this.size = this.body?.byteLength ?? 0;
    this.httpEtag = '"fake-etag"';
    this.etag = 'fake-etag';
    this.httpMetadata = { contentType };
    this.uploaded = new Date('2026-08-16T00:00:00.000Z');
  }
  async text() {
    if (typeof this.value === 'string') return this.value;
    return new TextDecoder().decode(this.value);
  }
  writeHttpMetadata(headers) {
    if (this.httpMetadata?.contentType) headers.set('Content-Type', this.httpMetadata.contentType);
  }
}

class FakeBucket {
  constructor() { this.values = new Map(); }
  putJson(key, value) { this.values.set(key, new FakeR2Object(JSON.stringify(value), { contentType: 'application/json' })); }
  putBytes(key, value, contentType) { this.values.set(key, new FakeR2Object(value, { contentType })); }
  async get(key) { return this.values.get(key) || null; }
  async list({ prefix = '', cursor = null, limit = 1000 } = {}) {
    assert.equal(cursor, null);
    const objects = [...this.values.entries()]
      .filter(([key]) => key.startsWith(prefix))
      .slice(0, limit)
      .map(([key, object]) => ({ key, size: object.size, uploaded: object.uploaded }));
    return { objects, truncated: false };
  }
}

globalThis.caches = {
  default: {
    async match() { return null; },
    async put() {},
  },
};

const { default: worker, trackIsPubliclyVisible } = await import('../cloudflare/public-worker-v28.js');

const bucket = new FakeBucket();
const env = { MEDIA_BUCKET: bucket };
const ctx = { waitUntil() {} };

function track(slug, album) {
  return {
    schemaVersion: 1,
    slug,
    title: slug,
    status: 'published',
    type: album?.id === 'singles' ? 'single' : 'album-track',
    year: 2026,
    releaseDate: '2026-08-16T00:00:00.000Z',
    album,
    genres: ['Electronic'], tags: ['Electronic'], moods: [], themes: [], languages: ['English'],
    bpm: 120, key: 'C major', keyConfidence: 1, explicit: false, duration: 180,
    accent: '#112233', accent2: '#445566',
    assets: { audio: `${slug}.mp3`, cover: null, thumbnail: null, lyrics: null, video: null },
    createdAt: '2026-08-16T00:00:00.000Z', updatedAt: '2026-08-16T00:00:00.000Z',
  };
}

const pixels = track('pixels-promises', { id: 'anh-yeu-em', title: 'Anh Yêu Em' });
const standalone = track('standalone-single', { id: 'singles', title: 'Singles' });
const liveTrack = track('live-album-track', { id: 'live-album', title: 'Live Album' });

const draftAlbum = {
  schemaVersion: 1, id: 'anh-yeu-em', title: 'Anh Yêu Em', type: 'album', status: 'draft',
  trackIds: ['pixels-promises'], assets: { cover: 'cover/cover.jpg', thumbnail: null },
};
const publishedAlbum = {
  schemaVersion: 1, id: 'live-album', title: 'Live Album', type: 'album', status: 'published',
  trackIds: ['live-album-track'], assets: { cover: 'cover/cover.jpg', thumbnail: null },
};

bucket.putJson('tracks/pixels-promises/manifest.json', pixels);
bucket.putJson('tracks/standalone-single/manifest.json', standalone);
bucket.putJson('tracks/live-album-track/manifest.json', liveTrack);
bucket.putBytes('tracks/pixels-promises/pixels-promises.mp3', new Uint8Array([1,2,3]), 'audio/mpeg');
bucket.putBytes('tracks/standalone-single/standalone-single.mp3', new Uint8Array([4,5,6]), 'audio/mpeg');
bucket.putBytes('tracks/live-album-track/live-album-track.mp3', new Uint8Array([7,8,9]), 'audio/mpeg');
bucket.putJson('albums/anh-yeu-em/manifest.json', draftAlbum);
bucket.putJson('albums/live-album/manifest.json', publishedAlbum);

function setIndex(generatedAt, anhStatus = 'draft') {
  const albums = [publishedAlbum];
  if (anhStatus === 'published') albums.push({ ...draftAlbum, status: 'published' });
  bucket.putJson('catalog/index.json', {
    schemaVersion: 1,
    generatedAt,
    count: 3,
    tracks: [pixels, standalone, liveTrack],
    albumCount: albums.length,
    albums,
  });
}

setIndex('rev-1');

let response = await worker.fetch(new Request('https://media.test/tracks'), env, ctx);
assert.equal(response.status, 200);
let payload = await response.json();
assert.deepEqual(payload.tracks.map(item => item.slug).sort(), ['live-album-track', 'standalone-single']);
assert.equal(payload.parentAlbumVisibility, 'canonical-trackIds-v1');
assert.equal(payload.count, 2);

response = await worker.fetch(new Request('https://media.test/tracks/pixels-promises'), env, ctx);
assert.equal(response.status, 404, 'draft parent must hide direct Track detail');

response = await worker.fetch(new Request('https://media.test/media/pixels-promises/audio/pixels-promises.mp3'), env, ctx);
assert.equal(response.status, 404, 'draft parent must hide direct Track media');

response = await worker.fetch(new Request('https://media.test/tracks/standalone-single'), env, ctx);
assert.equal(response.status, 200, 'unowned published Single remains public');

response = await worker.fetch(new Request('https://media.test/media/standalone-single/audio/standalone-single.mp3'), env, ctx);
assert.equal(response.status, 200, 'unowned published Single media remains public');

response = await worker.fetch(new Request('https://media.test/tracks/live-album-track'), env, ctx);
assert.equal(response.status, 200, 'Track owned by published Album remains public');

assert.equal(trackIsPubliclyVisible({ owners: new Map([['x', { status: 'conflict' }]]) }, 'x'), false, 'ownership conflict must fail closed');

bucket.putJson('albums/anh-yeu-em/manifest.json', { ...draftAlbum, status: 'published' });
setIndex('rev-2', 'published');

response = await worker.fetch(new Request('https://media.test/tracks'), env, ctx);
assert.equal(response.status, 200);
payload = await response.json();
assert.ok(payload.tracks.some(item => item.slug === 'pixels-promises'), 'catalog generation change must refresh owner visibility');

response = await worker.fetch(new Request('https://media.test/tracks/pixels-promises'), env, ctx);
assert.equal(response.status, 200, 'publishing parent Album restores Track detail visibility');

response = await worker.fetch(new Request('https://media.test/media/pixels-promises/audio/pixels-promises.mp3'), env, ctx);
assert.equal(response.status, 200, 'publishing parent Album restores media visibility');

response = await worker.fetch(new Request('https://media.test/health'), env, ctx);
assert.equal(response.status, 200);
payload = await response.json();
assert.equal(payload.version, 2.8);
assert.equal(payload.parentAlbumVisibility, 'canonical-trackIds-v1');
assert.equal(response.headers.get('X-LaunchPAD-Media-Version'), '2.8');

console.log('Public Worker v2.8 parent-Album visibility gate PASS');
