import assert from 'node:assert/strict';
import fs from 'node:fs';
import { performance } from 'node:perf_hooks';
import { buildCandidate, fixtureSizes, loadWorker, makeFixture, ReadOnlyR2, token } from './fixtures/studio-albums.mjs';

const baselineFile = process.env.ALBUMS_BASELINE_BUNDLE;
assert.ok(baselineFile && fs.existsSync(baselineFile),
  'Set ALBUMS_BASELINE_BUNDLE to a separately assembled baseline (see docs/CPU-SLICE1-ALBUMS-LEAN-READ.md).');
const candidateFile = buildCandidate();
const jwt = token();
const median = values => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];
const stable = payload => {
  const copy = structuredClone(payload);
  if (copy.migration) delete copy.migration.generatedAt;
  return copy;
};
const results = [];
for (const size of fixtureSizes) {
  const fixture = makeFixture(size);
  let expected;
  for (const [mode, file, query] of [
    ['baseline-full', baselineFile, ''],
    ['candidate-full', candidateFile, ''],
    ['candidate-canonical', candidateFile, '?view=canonical'],
  ]) {
    const worker = loadWorker(file);
    // Warm JIT/JWKS outside observations. Local fixtures have no R2/network wait.
    await (await worker.request(new ReadOnlyR2(fixture), { query, jwt })).text();
    const wall = [];
    const cpu = [];
    let observation;
    for (let repetition = 0; repetition < 7; repetition++) {
      const bucket = new ReadOnlyR2(fixture);
      const beforeCalls = { ...worker.calls };
      const beforeCpu = process.cpuUsage();
      const started = performance.now();
      const response = await worker.request(bucket, { query, jwt });
      const body = await response.text();
      wall.push(performance.now() - started);
      const used = process.cpuUsage(beforeCpu);
      cpu.push((used.user + used.system) / 1000);
      assert.equal(response.status, 200);
      const payload = JSON.parse(body);
      if (mode === 'baseline-full') expected = stable(payload);
      else if (mode === 'candidate-full') assert.deepEqual(stable(payload), expected);
      else {
        const { migration: _migration, ...canonical } = expected;
        assert.deepEqual(payload, canonical);
      }
      assert.equal(bucket.calls.puts + bucket.calls.deletes + bucket.calls.heads, 0);
      const prefixes = ['albums/', 'tracks/'];
      observation = {
        fixture: size.name, albums: size.albums, tracks: size.tracks, mode,
        objectGets: bucket.calls.gets.length,
        listPages: Object.fromEntries(prefixes.map(prefix => [prefix, bucket.calls.lists.filter(c => c.prefix === prefix).length])),
        traversals: Object.fromEntries(prefixes.map(prefix => [prefix, bucket.calls.lists.filter(c => c.prefix === prefix && c.cursor === null).length])),
        listedObjects: bucket.calls.listedObjects,
        summaryBuilds: worker.calls.summaries - beforeCalls.summaries,
        migrationBuilds: worker.calls.migration - beforeCalls.migration,
        stateTokens: worker.calls.stateTokens - beforeCalls.stateTokens,
        payloadBytes: Buffer.byteLength(body), writes: bucket.calls.puts + bucket.calls.deletes,
      };
    }
    results.push({ ...observation, localMedianWallMs: Number(median(wall).toFixed(3)),
      localMedianProcessCpuMs: Number(median(cpu).toFixed(3)) });
  }
}
console.log(JSON.stringify({
  runtime: process.version, platform: `${process.platform}/${process.arch}`, repetitions: 7,
  baselineBundle: baselineFile,
  caveat: 'Node process CPU includes mock R2 filtering/sorting, JWT verification, instrumentation, serialization and GC. It is not Worker invocation CPU or evidence of Workers Free compliance. No live R2/Worker calls.',
  results,
}, null, 2));
