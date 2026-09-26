import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { performance } from 'node:perf_hooks';
import { buildBundles, baselineSha, fixtureSizes, loadWorker, makeFixture, TrackR2, token } from './fixtures/studio-tracks.mjs';

const bundles = buildBundles();
const median = values => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];
const results = [];
const jwt = token();
for (const size of fixtureSizes) {
  const fixture = makeFixture(size);
  let expected;
  for (const [mode, file] of Object.entries(bundles)) {
    const measured = loadWorker(file);
    const bucket = new TrackR2(fixture);
    const response = await measured.request(bucket, { jwt });
    const body = await response.text();
    assert.equal(response.status, 200);
    if (mode === 'baseline') expected = body;
    else assert.equal(body, expected);
    assert.equal(bucket.calls.puts + bucket.calls.deletes + bucket.calls.heads, 0);
    // Timings exclude counters and baseline assembly; both use the same local fixtures.
    const worker = loadWorker(file, { instrument: false });
    for (let warmup = 0; warmup < 3; warmup++) await (await worker.request(new TrackR2(fixture), { jwt })).text();
    const wall = [], cpu = [];
    for (let i = 0; i < 9; i++) {
      const freshBucket = new TrackR2(fixture);
      const before = process.cpuUsage();
      const started = performance.now();
      const text = await (await worker.request(freshBucket, { jwt })).text();
      wall.push(performance.now() - started);
      const used = process.cpuUsage(before);
      cpu.push((used.user + used.system) / 1000);
      assert.equal(text, expected);
    }
    const counters = Object.fromEntries(Object.entries(measured.calls).filter(([, value]) => typeof value === 'number'));
    results.push({ ...size, mode, objectGets: bucket.calls.gets.length,
      manifestGets: bucket.calls.gets.filter(k => k.startsWith('tracks/') && k.endsWith('/manifest.json')).length,
      listPages: bucket.calls.lists.length, traversals: bucket.calls.lists.filter(c => c.cursor === null).length,
      listedObjects: bucket.calls.listedObjects, ...counters, payloadBytes: Buffer.byteLength(body),
      writes: bucket.calls.puts + bucket.calls.deletes,
      localMedianWallMs: Number(median(wall).toFixed(3)), localMedianProcessCpuMs: median(cpu) });
  }
}
const report = { baselineSha, runtime: process.version, platform: `${process.platform}/${process.arch}`,
  bundleSha256: Object.fromEntries(Object.entries(bundles).map(([mode, file]) =>
    [mode, crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex')])),
  warmups: 3, repetitions: 9,
  caveat: 'Local Node process CPU includes mock R2, JWT, JSON, GC and scheduler noise; Windows CPU accounting is coarse. Counters are measured separately. Not Cloudflare invocation CPU or proof of Workers Free compliance. No live R2 or Worker access.', results };
if (process.argv[2]) fs.writeFileSync(process.argv[2], JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
