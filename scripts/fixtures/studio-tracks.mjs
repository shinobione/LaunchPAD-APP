import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { makeFixture as albumFixture, ReadOnlyR2, loadWorker as loadAlbumWorker, fixtureDate } from './studio-albums.mjs';
export { ReadOnlyR2, studioOrigin, token } from './studio-albums.mjs';

export const baselineSha = '4dd420bd612555cdb972897b080549aacf408fa6';
export const fixtureSizes = [{ name: 'small', tracks: 45, albums: 7 },
  { name: 'medium', tracks: 250, albums: 25 }, { name: 'large', tracks: 1000, albums: 70 }];
export const trackKey = i => `tracks/fixture-track-${String(i).padStart(4, '0')}/manifest.json`;
export function addObject(objects, key, value, contentType = 'application/json', extra = {}) {
  const body = typeof value === 'string' ? value : JSON.stringify(value);
  objects.set(key, { key, body, size: Buffer.byteLength(body), etag: `fixture-${key}`,
    uploaded: new Date(fixtureDate), httpMetadata: { contentType }, customMetadata: {}, ...extra });
}
export function makeFixture(size = fixtureSizes[0]) {
  const objects = albumFixture(size);
  for (let i = 0; i < size.tracks; i++) {
    const key = trackKey(i);
    const base = JSON.parse(objects.get(key).body);
    addObject(objects, key, { ...base, status: ['published', 'draft', 'archived'][i % 3],
      type: i % 2 ? 'single' : 'album', year: i % 3 ? 2026 : null,
      releaseDate: i % 4 ? null : '2026-02-01', duration: 120, genres: ['Electronic'],
      moods: ['Dreamy'], themes: ['Night'], languages: ['en'], explicit: i % 2 === 0,
      energy: 'high', key: 'Am', keyConfidence: 0.9,
      assets: { audio: 'audio.mp3', cover: 'cover.webp', thumbnail: 'thumbnail.webp',
        lyrics: i % 7 === 6 ? null : 'lyrics.txt', video: 'video.mp4' },
      ...(i === 0 ? { creationOperationId: '00000000-0000-4000-8000-000000000002' } : {}),
    });
    const prefix = key.slice(0, -'manifest.json'.length);
    for (const [filename, type] of [['audio.mp3', 'audio/mpeg'], ['cover.webp', 'image/webp'],
      ['thumbnail.webp', 'image/webp'], ['video.mp4', 'video/mp4']]) {
      addObject(objects, prefix + filename, 'synthetic-media', type,
        { customMetadata: { sha256: 'a'.repeat(64) } });
    }
    addObject(objects, prefix + 'lyrics.txt', ['[00:01.00] First\n[00:05.00] Last',
      'Plain lyrics', '', '[00:09.00] Later\n[00:01.00] Earlier',
      '[03:00.00] After duration', '[00:01.00] First', 'Unreferenced'][i % 7], 'text/plain');
    if (i % 7 === 5) objects.get(prefix + 'lyrics.txt').size = 2 * 1024 * 1024;
    if (i % 4 === 1) objects.delete(prefix + 'cover.webp');
    if (i % 4 === 2) addObject(objects, prefix + 'audio.wav', 'duplicate audio', 'audio/wav');
  }
  addObject(objects, 'media/legacy-only.mp3', 'legacy audio', 'audio/mpeg');
  addObject(objects, 'media/legacy-only.txt', 'legacy lyrics', 'text/plain');
  addObject(objects, 'media/fixture-track-0000.mp3', 'coexisting legacy audio', 'audio/mpeg');
  addObject(objects, 'catalog/index.json', { schemaVersion: 1, generatedAt: fixtureDate,
    generationId: '00000000-0000-4000-8000-000000000003', count: size.tracks,
    tracks: [{ slug: 'public-decoy', title: 'Must never replace canonical truth' }], albums: [] });
  return objects;
}

function run(command, args, cwd = process.cwd()) {
  const result = spawnSync(command, args, { cwd, encoding: 'utf8', maxBuffer: 4 * 1024 * 1024 });
  assert.equal(result.status, 0, `${command} ${args.join(' ')}\n${result.error || ''}\n${result.stdout}\n${result.stderr}`);
}
export function buildBundles() {
  fs.mkdirSync('dist', { recursive: true });
  const directory = fs.mkdtempSync(path.resolve('dist/tracks-parity-'));
  const archive = path.join(directory, 'baseline.tar');
  const source = path.join(directory, 'source');
  fs.mkdirSync(source);
  // Immutable Git source, never reconstruct the baseline by reversing the candidate.
  run('git', ['archive', '--format=tar', `--output=${archive}`, baselineSha, 'cloudflare', 'scripts']);
  run('tar', ['-xf', archive, '-C', source]);
  const baseline = path.join(directory, 'baseline.mjs');
  const candidate = path.join(directory, 'candidate.mjs');
  run(process.execPath, ['scripts/build-admin-worker-v528.mjs', baseline], source);
  run(process.execPath, ['scripts/build-admin-worker-v528.mjs', candidate]);
  return { baseline, candidate };
}

const fixedClock = `
  const RealDate = Date;
  globalThis.Date = class extends RealDate {
    constructor(...args) { super(...(args.length ? args : ['2026-01-01T00:00:00.000Z'])); }
    static now() { return 1767225600000; }
  };
`;
const instrumentation = `
  Object.assign(__calls, { manifestReads: 0, normalizations: 0, quality: 0, assetStates: 0,
    canonicalFilterVisits: 0, indexBuilds: 0, indexObjects: 0, jsonResponses: 0 });
  const originalReadManifest = readManifest;
  readManifest = (...args) => { __calls.manifestReads++; return originalReadManifest(...args); };
  const originalNormalize = normalizeManifest;
  normalizeManifest = (...args) => { __calls.normalizations++; return originalNormalize(...args); };
  const originalQuality = inspectTrackQuality;
  inspectTrackQuality = (...args) => { __calls.quality++; return originalQuality(...args); };
  const originalAssets = assetStateFromObjects;
  assetStateFromObjects = (...args) => { __calls.assetStates++; return originalAssets(...args); };
  const originalJson = jsonResponse;
  jsonResponse = (...args) => { __calls.jsonResponses++; return originalJson(...args); };
  const originalFilter = Array.prototype.filter;
  Array.prototype.filter = function(callback, thisArg) {
    if (this.length && this[0]?.key?.startsWith('tracks/')) __calls.canonicalFilterVisits += this.length;
    return originalFilter.call(this, callback, thisArg);
  };
  if (typeof createTrackCollectionReadContext === 'function') {
    const originalContext = createTrackCollectionReadContext;
    createTrackCollectionReadContext = objects => {
      __calls.indexBuilds++; __calls.indexObjects += objects.length;
      return originalContext(objects);
    };
  }
`;
export function loadWorker(file, { instrument = true } = {}) {
  const worker = loadAlbumWorker(file, fixedClock + (instrument ? instrumentation : ''));
  return { ...worker, request(bucket, options = {}) {
    return worker.request(bucket, { pathname: '/api/studio/tracks', ...options });
  } };
}

// Selective failures exercise the existing manifest/lyrics/catalog error policies.
export class TrackR2 extends ReadOnlyR2 {
  constructor(objects, options = {}) { super(objects, options); this.options = options; }
  async list(options) {
    if (this.options.failPrefix === options.prefix) throw new Error('Synthetic prefix list failure');
    return super.list(options);
  }
  async get(key) {
    if (this.options.failKey === key) {
      this.calls.gets.push(key);
      throw new Error('Synthetic keyed get failure');
    }
    const object = await super.get(key);
    if (object && this.options.failText === key) object.text = async () => { throw new Error('Synthetic body failure'); };
    return object;
  }
}
