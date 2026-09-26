import assert from 'node:assert/strict';
import fs from 'node:fs';
import { buildBundles, loadWorker, makeFixture, TrackR2, trackKey, addObject, studioOrigin, token } from './fixtures/studio-tracks.mjs';

const bundles = buildBundles();
const baseline = loadWorker(bundles.baseline);
const candidate = loadWorker(bundles.candidate);
let scenarios = 0;
async function read(worker, objects, options = {}, bucketOptions = {}) {
  const bucket = new TrackR2(objects, bucketOptions);
  const response = await worker.request(bucket, options);
  const text = await response.text();
  assert.equal(bucket.calls.puts + bucket.calls.deletes + bucket.calls.heads, 0);
  return { response, text, payload: JSON.parse(text), bucket };
}
async function parity(objects = makeFixture(), options = {}, bucketOptions = {}) {
  const before = await read(baseline, objects, options, bucketOptions);
  const after = await read(candidate, objects, options, bucketOptions);
  assert.equal(after.response.status, before.response.status);
  assert.deepEqual([...after.response.headers], [...before.response.headers]);
  // Frozen clock: compare every field, array order and serialized byte; no omitted keys.
  assert.equal(after.text, before.text);
  // A catalog GET rejection races the parallel Track branch in the existing wrapper.
  // Compare completed enumerations only on success, not scheduling after early rejection.
  if (after.response.ok) assert.deepEqual(after.bucket.calls.lists, before.bucket.calls.lists);
  scenarios++;
  return { before, after };
}

const normal = await parity();
assert.equal(normal.after.response.status, 200);
assert.equal(normal.after.payload.tracks.length, 45);
assert.deepEqual(Object.keys(normal.after.payload).sort(), ['albumTotals', 'albums', 'catalogProjection', 'legacyTracks', 'ok', 'totals', 'tracks']);
assert.equal(normal.after.payload.totals.total, 45);
assert.equal(normal.after.payload.totals.published, 15);
assert.equal(normal.after.payload.totals.draft, 15);
assert.equal(normal.after.payload.totals.archived, 15);
assert.ok(normal.after.payload.totals.incomplete > 0);
assert.equal(normal.after.payload.albumTotals.total, 7);
assert.equal(normal.after.payload.catalogProjection.generationId, '00000000-0000-4000-8000-000000000003');
assert.ok(normal.after.payload.legacyTracks.length > 0);
assert.ok(!normal.after.payload.tracks.some(t => t.slug === 'public-decoy'));
const statuses = new Set(normal.after.payload.tracks.map(t => t.quality.lyricsStatus));
assert.deepEqual(statuses, new Set(['synced', 'unsynced', 'invalid', 'missing']));
assert.equal(normal.after.payload.tracks.find(t => t.slug === 'fixture-track-0000').assets.audio.sha256, 'a'.repeat(64));
assert.equal(normal.after.payload.tracks.find(t => t.slug === 'fixture-track-0001').assets.cover.present, false);
assert.equal(candidate.calls.quality, 45);
assert.equal(candidate.calls.assetStates, 45);
assert.equal(candidate.calls.manifestReads, 45);
assert.equal(baseline.calls.manifestReads, 135);
assert.equal(candidate.calls.normalizations, 45);
assert.equal(baseline.calls.normalizations, 135);
assert.equal(candidate.calls.indexBuilds, 1);
assert.ok(candidate.calls.canonicalFilterVisits < baseline.calls.canonicalFilterVisits / 10);
assert.equal(candidate.calls.jsonResponses, 3, 'Serialization wrappers intentionally retained');
assert.equal(candidate.calls.migration, 0);
assert.equal(normal.before.bucket.calls.gets.length - normal.after.bucket.calls.gets.length, 90);
for (const result of [normal.before, normal.after]) {
  assert.equal(result.response.headers.get('access-control-allow-origin'), studioOrigin);
  assert.equal(result.response.headers.get('access-control-allow-credentials'), 'true');
  assert.match(result.response.headers.get('cache-control'), /no-store/);
}

// Same handler's legacy admin alias; the separately deployed public Worker is untouched.
await parity(undefined, { pathname: '/api/tracks', origin: null });
await parity(undefined, { query: '?unrelated=1' });
for (const slug of ['fixture-track-0000', 'fixture-track-0001', 'missing']) {
  const detail = await parity(undefined, { pathname: `/api/studio/tracks/${slug}` });
  if (slug === 'fixture-track-0000') {
    assert.equal(detail.after.payload.track.manifest.creationOperationId, '00000000-0000-4000-8000-000000000002');
    assert.ok(detail.after.payload.track.quality.items.length > 0);
  }
  await parity(undefined, { pathname: `/api/tracks/${slug}`, origin: null });
}

const corrupt = makeFixture();
corrupt.get(trackKey(0)).body = '{malformed';
corrupt.get(trackKey(1)).body = 'null';
corrupt.get(trackKey(2)).body = '{}';
const stale = JSON.parse(corrupt.get(trackKey(3)).body);
delete stale.updatedAt; delete stale.createdAt;
corrupt.get(trackKey(3)).body = JSON.stringify(stale);
corrupt.get(trackKey(3)).customMetadata.updatedAt = '2025-01-01T00:00:00.000Z';
// Existing odd-path/mismatched-slug normalization is preserved, not silently repaired.
addObject(corrupt, 'tracks/fixture-track-0004/nested/manifest.json', {
  slug: 'other-slug', assets: { audio: 'audio.mp3' }, title: 'Nested historical manifest',
});
const malformed = await parity(corrupt, {}, { missing: [trackKey(5)], pageSize: 31 });
assert.equal(malformed.after.response.status, 200);
assert.equal(malformed.after.payload.tracks.find(t => t.slug === 'fixture-track-0003').updatedAt, '2025-01-01T00:00:00.000Z');
assert.ok(!malformed.after.payload.tracks.some(t => ['fixture-track-0000', 'fixture-track-0001', 'fixture-track-0002', 'fixture-track-0005'].includes(t.slug)));
await parity(new Map());
await parity(makeFixture({ tracks: 160, albums: 7 })); // >1,000 canonical objects, multiple list pages
for (const options of [{ pageSize: 1 }, { failList: true }, { failGet: true },
  { failPrefix: 'tracks/' }, { failPrefix: 'media/' }, { failPrefix: 'albums/' },
  { failKey: trackKey(4) }, { failKey: 'albums/fixture-album-000/manifest.json' },
  { failKey: 'catalog/index.json' }]) {
  const failure = await parity(undefined, {}, options);
  assert.equal(failure.after.response.status, 500);
  assert.equal(failure.after.payload.ok, false);
}
for (const options of [{ failText: trackKey(0) },
  { failKey: 'tracks/fixture-track-0000/lyrics.txt' },
  { failText: 'tracks/fixture-track-0000/lyrics.txt' },
  { missing: ['tracks/fixture-track-0000/lyrics.txt'] }]) {
  const evidence = await parity(undefined, {}, options);
  assert.equal(evidence.after.response.status, 200);
  if (!options.failText?.endsWith('/manifest.json')) {
    assert.equal(evidence.after.payload.tracks.find(t => t.slug === 'fixture-track-0000').quality.lyricsStatus, 'invalid');
  }
}
for (const body of ['{broken', 'null', '{"schemaVersion":2,"count":"bad"}']) {
  const objects = makeFixture(); objects.get('catalog/index.json').body = body;
  const result = await parity(objects);
  assert.equal(result.after.payload.catalogProjection.valid, false);
  assert.equal(result.after.payload.tracks.length, 45);
}
const missingCatalog = await parity(undefined, {}, { missing: ['catalog/index.json'] });
assert.equal(missingCatalog.after.payload.catalogProjection.present, false);
assert.equal(missingCatalog.after.payload.tracks.length, 45);

for (const jwt of [null, 'invalid', token({ exp: 1 }), token({ aud: ['wrong'] })]) {
  const auth = await parity(undefined, { jwt });
  assert.equal(auth.after.response.status, 403);
  assert.equal(auth.after.bucket.calls.gets.length + auth.after.bucket.calls.lists.length, 0);
}
const origin = await parity(undefined, { origin: 'https://untrusted.example.invalid' });
assert.equal(origin.after.response.status, 403);
assert.equal(origin.after.response.headers.get('access-control-allow-origin'), null);
assert.equal(origin.after.bucket.calls.gets.length + origin.after.bucket.calls.lists.length, 0);
await parity(undefined, { origin: null });

// A reused Worker instance must observe new manifests, asset evidence and generation.
const changed = makeFixture();
const first = JSON.parse(changed.get(trackKey(0)).body);
changed.get(trackKey(0)).body = JSON.stringify({ ...first, title: 'Changed after previous request', status: 'draft' });
changed.delete('tracks/fixture-track-0000/audio.mp3');
changed.get('catalog/index.json').body = JSON.stringify({ schemaVersion: 1, tracks: [], count: 0, generationId: 'new-generation' });
const fresh = await parity(changed);
assert.equal(fresh.after.payload.tracks.find(t => t.slug === first.slug).title, 'Changed after previous request');
assert.equal(fresh.after.payload.tracks.find(t => t.slug === first.slug).assets.audio.present, false);
assert.equal(fresh.after.payload.catalogProjection.generationId, 'new-generation');
const concurrent = await Promise.all([read(candidate, makeFixture()), read(candidate, changed)]);
assert.equal(concurrent[0].payload.tracks.find(t => t.slug === first.slug).title, 'Fixture Track 0');
assert.equal(concurrent[1].payload.tracks.find(t => t.slug === first.slug).title, 'Changed after previous request');
scenarios += 2;

const sharedObjects = makeFixture();
const sharedBucket = new TrackR2(sharedObjects);
await (await candidate.request(sharedBucket)).text();
sharedObjects.get(trackKey(0)).body = changed.get(trackKey(0)).body;
const sameBucketReread = await (await candidate.request(sharedBucket)).json();
assert.equal(sameBucketReread.tracks.find(t => t.slug === first.slug).title, 'Changed after previous request');
assert.equal(sharedBucket.calls.puts + sharedBucket.calls.deletes + sharedBucket.calls.heads, 0);
scenarios++;

// Public catalog writer's projection must still strip private Track creation evidence.
// Pure projection assertions in the existing Build109/114/117 suites cover all write paths.
const source = fs.readFileSync(bundles.candidate, 'utf8');
assert.ok(source.includes('const { creationOperationId, ...manifest } = canonicalManifest;'));
assert.ok(source.indexOf('listTracksWithAlbums') < source.indexOf('listTracksWithCatalogGenerationIdentity'));
assert.equal((source.match(/createTrackCollectionReadContext\(canonicalObjects\)/g) || []).length, 1);

// Allow only the four audited function changes in the final generated artifact.
// Everything else (auth, wrappers, details, writes, embedded UI) must be identical.
function unchangedBundle(text) {
  return text
    .replace(/\/\/ Collection-local evidence only:[\s\S]*?(?=async function buildCanonicalTrackSummaries)/, '')
    .replace(/async function listTracks\(env\) \{[\s\S]*?\n\}/, 'TRACK_LIST_BODY')
    .replace(/async function buildCanonicalTrackSummaries\([^\n]*\) \{[\s\S]*?\n\}/, 'TRACK_SUMMARIES_BODY')
    .replace(/enrichTrackSummariesQuality = async function enrichTrackSummariesQualityV51\([^\n]*\) \{[\s\S]*?\n\};/, 'TRACK_QUALITY_WRAPPER')
    .replace(/buildCanonicalTrackSummaries = async function buildCanonicalTrackSummariesV53\([^\n]*\) \{[\s\S]*?\n\};/, 'TRACK_SORT_WRAPPER');
}
assert.equal(unchangedBundle(source), unchangedBundle(fs.readFileSync(bundles.baseline, 'utf8')),
  'Generated bundle changed outside the audited collection functions');
console.log(`Tracks CPU read: ${scenarios} scenarios passed; exact baseline response bytes/headers/status, object GET reduction, canonical/legacy/quality/lyrics/Album/identity parity, errors, auth, fresh and concurrent request isolation, zero writes.`);
