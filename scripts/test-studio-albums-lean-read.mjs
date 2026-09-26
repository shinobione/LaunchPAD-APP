import assert from 'node:assert/strict';
import fs from 'node:fs';
import { buildCandidate, loadWorker, makeFixture, ReadOnlyR2, studioOrigin, token } from './fixtures/studio-albums.mjs';

const candidate = buildCandidate();
let checks = 0;
async function read(objects = makeFixture(), options = {}, bucketOptions = {}) {
  const worker = loadWorker(candidate);
  const bucket = new ReadOnlyR2(objects, bucketOptions);
  const response = await worker.request(bucket, options);
  const payload = await response.json();
  assert.equal(bucket.calls.puts + bucket.calls.deletes + bucket.calls.heads, 0);
  checks++;
  return { worker, bucket, response, payload };
}
function canonicalOnly(payload) {
  const { migration: _migration, ...canonical } = payload;
  return canonical;
}
function stableFull(payload) {
  const copy = structuredClone(payload);
  delete copy.migration.generatedAt;
  return copy;
}
const full = await read();
const explicitFull = await read(undefined, { query: '?view=full' });
const lean = await read(undefined, { query: '?view=canonical' });
assert.equal(full.response.status, 200);
assert.deepEqual(stableFull(explicitFull.payload), stableFull(full.payload));
assert.deepEqual(lean.payload, canonicalOnly(full.payload));
assert.deepEqual(Object.keys(lean.payload).sort(), ['albums', 'ok', 'totals']);
assert.equal(full.payload.migration.mode, 'dry-run');
assert.equal(full.payload.migration.writesPerformed, false);
assert.equal(full.worker.calls.migration, 1);
assert.equal(full.worker.calls.summaries, 2);
assert.equal(full.worker.calls.stateTokens, 3);
assert.equal(lean.worker.calls.migration, 0);
assert.equal(lean.worker.calls.stateTokens, 0);
assert.equal(lean.worker.calls.summaries, 1);
assert.deepEqual(lean.bucket.calls.lists.map(call => call.prefix), ['albums/']);
assert.equal(lean.bucket.calls.gets.length, 7);
assert.ok(lean.bucket.calls.gets.every(key => /^albums\/[^/]+\/manifest.json$/.test(key)));
assert.deepEqual(lean.payload.totals, { total: 7, published: 3, draft: 2, archived: 2, trackRefs: 84 });
assert.deepEqual(lean.payload.albums.map(album => album.id), [6, 4, 2, 0, 1, 3, 5].map(i => `fixture-album-00${i}`));
for (const album of lean.payload.albums) {
  const source = JSON.parse(makeFixture().get(`albums/${album.id}/manifest.json`).body);
  for (const [key, value] of Object.entries(source)) assert.deepEqual(album[key], value, `${album.id}.${key}`);
}
assert.equal(lean.payload.albums.find(album => album.id.endsWith('001')).assetState.cover.present, false);
assert.equal(lean.payload.albums.find(album => album.id.endsWith('000')).assetState.cover.present, true);
for (const result of [full, explicitFull, lean]) {
  assert.equal(result.response.headers.get('access-control-allow-origin'), studioOrigin);
  assert.equal(result.response.headers.get('access-control-allow-credentials'), 'true');
  assert.match(result.response.headers.get('cache-control'), /no-store/);
}

// Throwing sentinel, in addition to counters: lean must succeed with migration unavailable.
const isolated = loadWorker(candidate);
isolated.forbidMigration();
const isolatedBucket = new ReadOnlyR2(makeFixture());
assert.equal((await isolated.request(isolatedBucket, { query: '?view=canonical' })).status, 200);
assert.equal(isolated.calls.migration, 0);
assert.equal(isolatedBucket.calls.puts + isolatedBucket.calls.deletes, 0);
checks++;

for (const query of ['?view=', '?view', '?view=lean', '?view=CANONICAL', '?view=%20canonical',
  '?view=canonical%00', '?view=canonical&view=full', '?view=full&view=canonical',
  '?view=canonical&view=canonical', '?view=canonical&%76iew=full']) {
  const result = await read(undefined, { query });
  assert.equal(result.response.status, 400, query);
  assert.equal(result.payload.ok, false);
  assert.equal(result.response.headers.get('access-control-allow-origin'), studioOrigin);
  assert.equal(result.bucket.calls.lists.length + result.bucket.calls.gets.length, 0);
  assert.equal(result.worker.calls.migration + result.worker.calls.summaries, 0);
}
assert.deepEqual((await read(undefined, { query: '?view=%63anonical' })).payload, lean.payload);

for (const query of ['', '?view=canonical', '?view=invalid']) {
  for (const jwt of [null, 'invalid', token({ exp: 1 }), token({ aud: ['wrong'] })]) {
    const result = await read(undefined, { query, jwt });
    assert.equal(result.response.status, 403);
    assert.equal(result.bucket.calls.lists.length + result.bucket.calls.gets.length, 0);
  }
  const forbidden = await read(undefined, { query, origin: 'https://untrusted.example.invalid' });
  assert.equal(forbidden.response.status, 403);
  assert.equal(forbidden.response.headers.get('access-control-allow-origin'), null);
  assert.equal(forbidden.bucket.calls.lists.length, 0);
}
assert.equal((await read(undefined, { query: '?view=canonical', origin: null })).response.status, 200);

// Existing malformed/missing evidence semantics are shared exactly; no repair writes.
const corrupt = makeFixture();
const key = i => `albums/fixture-album-00${i}/manifest.json`;
corrupt.get(key(0)).body = '{broken';
corrupt.get(key(1)).body = JSON.stringify({ schemaVersion: 1, id: 'wrong-id' });
corrupt.get(key(2)).body = JSON.stringify({ schemaVersion: 2, id: 'fixture-album-002' });
corrupt.get(key(3)).body = 'null';
const malformedOptions = { pageSize: 3, missing: [key(4)] };
const malformedFull = await read(corrupt, {}, malformedOptions);
const malformedLean = await read(corrupt, { query: '?view=canonical' }, malformedOptions);
// Full also scans Tracks, so use a separate page size to stay below its existing 20-page bound.
assert.equal(malformedLean.response.status, 200);
assert.deepEqual(malformedLean.payload.albums.map(a => a.id), ['fixture-album-006', 'fixture-album-005']);
const malformedComparable = await read(corrupt, {}, { ...malformedOptions, pageSize: 1000 });
assert.deepEqual(malformedLean.payload, canonicalOnly(malformedComparable.payload));
assert.ok(malformedLean.bucket.calls.lists.every(call => call.prefix === 'albums/'));
assert.equal(malformedFull.response.status, 500, 'Existing full Track pagination bound is fail closed');
for (const query of ['', '?view=canonical']) {
  const empty = await read(new Map(), { query });
  assert.deepEqual(empty.payload.albums, []);
  assert.equal(empty.payload.totals.total, 0);
  for (const failure of [{ failList: true }, { failGet: true }, { pageSize: 1 }]) {
    const failed = await read(undefined, { query }, failure);
    assert.equal(failed.response.status, 500);
    assert.equal(failed.payload.ok, false);
    assert.equal(failed.response.headers.get('access-control-allow-origin'), studioOrigin);
  }
}

// POST remains the migration apply dispatcher, with its own fresh review and guards.
for (const query of ['', '?view=canonical']) {
  const blocked = await read(undefined, { query, method: 'POST', body: {
    intent: 'album-migration-apply-v1', albumId: 'neon-heartbreaks',
    confirm: 'MIGRATE neon-heartbreaks', expectedStateToken: 'stale', trackIds: [], orderConfirmed: true,
  } });
  assert.equal(blocked.response.status, 409);
  assert.equal(blocked.payload.code, 'ALBUM_MIGRATION_BLOCKED');
  assert.equal(blocked.worker.calls.migration, 1);
}

// Optional independently assembled pre-change bundle for exact full-response comparison.
if (process.env.ALBUMS_BASELINE_BUNDLE) {
  assert.ok(fs.existsSync(process.env.ALBUMS_BASELINE_BUNDLE));
  const baseline = loadWorker(process.env.ALBUMS_BASELINE_BUNDLE);
  const bucket = new ReadOnlyR2(makeFixture());
  const response = await baseline.request(bucket);
  assert.deepEqual(stableFull(await response.json()), stableFull(full.payload));
  assert.deepEqual(bucket.calls, full.bucket.calls);
  checks++;
}
console.log(`Studio Albums lean read: ${checks} request scenarios passed (canonical parity, full contract, no migration/Tracks/writes, pagination, malformed evidence, Access/CORS, validation and apply dispatch).`);
