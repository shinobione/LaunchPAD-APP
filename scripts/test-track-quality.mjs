import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync('cloudflare/admin-worker.parts/03a-quality.part', 'utf8');
const textEncoder = new TextEncoder();

function getExtension(filename) {
  const value = String(filename || '').toLowerCase();
  const dot = value.lastIndexOf('.');
  return dot >= 0 ? value.slice(dot + 1).split(/[?#]/)[0] : '';
}
function guessContentType(extension) {
  const map = {
    mp3: 'audio/mpeg', wav: 'audio/wav', flac: 'audio/flac', m4a: 'audio/mp4',
    jpeg: 'image/jpeg', jpg: 'image/jpeg', png: 'image/png', webp: 'image/webp',
    mp4: 'video/mp4', webm: 'video/webm', txt: 'text/plain; charset=utf-8',
  };
  return map[extension] || 'application/octet-stream';
}
function stripLyricsMetadata(text) {
  const normalized = String(text || '').replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
  const marker = normalized.match(/^LYRICS\s*:\s*$/im);
  return marker ? normalized.slice(marker.index + marker[0].length).trim() : normalized.trim();
}
function timestampSeconds(minutes, seconds, fraction = '0') {
  return Number(minutes) * 60 + Number(seconds) + Number(String(fraction).padEnd(3, '0').slice(0, 3)) / 1000;
}
function trackPrefix(slug) { return `tracks/${slug}/`; }
function filenameFromKey(key) { return String(key).split('/').pop() || ''; }

const context = vm.createContext({
  console,
  Date,
  Map,
  Set,
  Promise,
  Number,
  String,
  Math,
  Object,
  Array,
  RegExp,
  JSON,
  ASSET_KINDS: ['audio', 'cover', 'thumbnail', 'lyrics', 'video'],
  MAX_THUMBNAIL_BYTES: 2 * 1024 * 1024,
  MAX_LYRICS_BYTES: 1024 * 1024,
  MANIFEST_NAME: 'manifest.json',
  getExtension,
  guessContentType,
  stripLyricsMetadata,
  timestampSeconds,
  trackPrefix,
  filenameFromKey,
  readManifest: async () => null,
});
vm.runInContext(`${source}\nglobalThis.__quality = { inspectTrackQuality, publicationQualityMessage };`, context);
const { inspectTrackQuality, publicationQualityMessage } = context.__quality;

function manifest(overrides = {}) {
  return {
    slug: 'complete-track', title: 'Complete Track', status: 'published', year: 2026,
    genres: ['Dancehall'], moods: ['Uplifting'], themes: ['Commitment'],
    energy: 'medium', languages: ['English'], key: 'F# minor', keyConfidence: 0.82,
    duration: 120, assets: {
      audio: 'audio.mp3', cover: 'cover.webp', thumbnail: 'thumbnail.webp',
      lyrics: 'lyrics.txt', video: 'video.mp4',
    },
    ...overrides,
  };
}
function object(slug, filename, size, contentType) {
  return { key: `tracks/${slug}/${filename}`, size, httpMetadata: { contentType } };
}
function objectsFor(track, extras = []) {
  const objects = [object(track.slug, 'manifest.json', 800, 'application/json')];
  for (const [kind, filename] of Object.entries(track.assets || {})) {
    if (!filename) continue;
    const sizes = { audio: 4_000_000, cover: 900_000, thumbnail: 140_000, lyrics: 600, video: 8_000_000 };
    objects.push(object(track.slug, filename, sizes[kind], guessContentType(getExtension(filename))));
  }
  return [...objects, ...extras];
}
function bucket(files) {
  return {
    async get(key) {
      if (!(key in files)) return null;
      const value = files[key];
      return {
        size: textEncoder.encode(value).byteLength,
        async text() { return value; },
      };
    },
  };
}

const complete = manifest();
const completeLyrics = '[00:00.000] Intro\n[00:30.000] Verse\n[01:58.000] Outro';
const completeReport = await inspectTrackQuality(
  bucket({ 'tracks/complete-track/lyrics.txt': completeLyrics }),
  complete,
  objectsFor(complete),
  {
    audio: { readable: true, duration: 120.4 },
    cover: { readable: true, width: 3000, height: 3000 },
    thumbnail: { readable: true, width: 512, height: 512 },
    video: { readable: true, width: 1080, height: 1920 },
  },
);
assert.equal(completeReport.counts.error, 0, 'complete track must have no blocking errors');
assert.equal(completeReport.publishable, true);
assert.equal(completeReport.timestampsAvailable, true);
assert.ok(completeReport.items.some(item => item.code === 'canvas-ratio-valid'));
assert.ok(completeReport.items.some(item => item.code === 'duration-coherent'));

const optional = manifest({
  slug: 'optional-media',
  title: 'Optional Media',
  assets: { audio: 'audio.mp3', cover: 'cover.webp', thumbnail: 'thumbnail.webp', lyrics: null, video: null },
});
const optionalReport = await inspectTrackQuality(
  bucket({}), optional, objectsFor(optional),
  { audio: { readable: true, duration: 120 }, cover: { readable: true, width: 2000, height: 2000 } },
);
assert.equal(optionalReport.counts.error, 0, 'lyrics and Canvas are optional');
assert.ok(optionalReport.items.some(item => item.code === 'lyrics-absent' && item.level === 'info'));
assert.ok(optionalReport.items.some(item => item.code === 'canvas-absent' && item.level === 'info'));

const incomplete = manifest({
  slug: 'incomplete-draft', title: '', status: 'draft', year: null,
  genres: [], moods: [], themes: [], energy: null, languages: [],
  key: null, keyConfidence: null, duration: null,
  assets: { audio: null, cover: null, thumbnail: null, lyrics: null, video: null },
});
const incompleteReport = await inspectTrackQuality(bucket({}), incomplete, objectsFor(incomplete));
assert.ok(incompleteReport.counts.error >= 3, 'incomplete draft must expose blockers');
assert.equal(incomplete.status, 'draft', 'draft status remains available despite blockers');
assert.match(publicationQualityMessage(incompleteReport), /^Publication bloquée/);

const inconsistent = manifest({ slug: 'inconsistent-track', duration: 90 });
const duplicateVideo = object('inconsistent-track', 'video.webm', 3_000_000, 'video/webm');
const orphan = object('inconsistent-track', 'old-cover.jpg', 400_000, 'image/jpeg');
const inconsistentLyrics = '[00:40.000] Later\n[00:20.000] Earlier\n[01:45.000] Beyond end';
const inconsistentReport = await inspectTrackQuality(
  bucket({ 'tracks/inconsistent-track/lyrics.txt': inconsistentLyrics }),
  inconsistent,
  objectsFor(inconsistent, [duplicateVideo, orphan]),
  {
    audio: { readable: true, duration: 100 },
    cover: { readable: true, width: 400, height: 400 },
    thumbnail: { readable: true, width: 400, height: 300 },
    video: { readable: true, width: 1920, height: 1080 },
  },
);
for (const code of ['duration-mismatch', 'cover-too-small', 'timestamps-order', 'timestamps-after-audio', 'canvas-ratio']) {
  assert.ok(inconsistentReport.items.some(item => item.code === code && item.level === 'error'), `missing ${code}`);
}
assert.ok(inconsistentReport.items.some(item => item.code === 'orphan-assets'));
assert.ok(inconsistentReport.items.some(item => item.code === 'duplicate-assets'));
assert.equal(inconsistentReport.publishable, false);

const brokenReference = manifest({ slug: 'broken-reference' });
const brokenObjects = objectsFor(brokenReference).filter(item => !item.key.endsWith('/audio.mp3'));
const brokenReport = await inspectTrackQuality(
  bucket({ 'tracks/broken-reference/lyrics.txt': completeLyrics }), brokenReference, brokenObjects,
  { cover: { readable: true, width: 2000, height: 2000 }, video: { readable: true, width: 1080, height: 1920 } },
);
assert.ok(brokenReport.items.some(item => item.code === 'asset-missing-r2' && item.kind === 'audio'));
assert.ok(brokenReport.items.some(item => item.code === 'audio-r2-missing'));

console.log('Track quality control covers complete, optional, incomplete, inconsistent and broken-R2 tracks.');
