import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import { spawnSync } from 'node:child_process';

const output = path.join(os.tmpdir(), `launchpad-r2-admin-worker-v520-test-${process.pid}.js`);
const built = spawnSync(process.execPath, ['scripts/build-admin-worker-v520.mjs', output], { encoding: 'utf8' });
if (built.status !== 0) {
  process.stdout.write(built.stdout || '');
  process.stderr.write(built.stderr || '');
  process.exit(built.status || 1);
}

const source = fs.readFileSync(output, 'utf8');
assert.ok(source.includes('version: "5.20"'), 'TM 5.20 version marker must be present.');
assert.ok(source.includes('trackManagerVersion: "5.20"'), 'Studio health must expose TM 5.20.');
assert.ok(source.includes('const STUDIO_BRIDGE_VERSION = "1.11";'), 'Studio bridge contract must remain v1.11.');

const match = source.match(/async function readManifest\(bucket, slug\) \{[\s\S]*?\n\}\n\nasync function writeManifest/);
assert.ok(match, 'Could not isolate readManifest from the TM 5.20 bundle.');
const readManifestSource = match[0].replace(/\n\nasync function writeManifest$/, '');

const context = {
  MANIFEST_NAME: 'manifest.json',
  trackPrefix: slug => `tracks/${slug}/`,
  normalizeManifest: manifest => ({ ...manifest }),
};
vm.createContext(context);
vm.runInContext(`${readManifestSource}\nglobalThis.__readManifest = readManifest;`, context);
const readManifest = context.__readManifest;
assert.equal(typeof readManifest, 'function');

const uploaded = new Date('2026-01-02T03:04:05.000Z');
const legacyBody = JSON.stringify({ slug: 'magnetic-midnight', createdAt: '2025-12-01T00:00:00.000Z' });
const legacyBucket = {
  async get() {
    return {
      customMetadata: {},
      uploaded,
      async text() { return legacyBody; },
    };
  },
};

const first = await readManifest(legacyBucket, 'magnetic-midnight');
const second = await readManifest(legacyBucket, 'magnetic-midnight');
assert.equal(first.updatedAt, uploaded.toISOString(), 'Legacy read must use the stable R2 object timestamp.');
assert.equal(second.updatedAt, first.updatedAt, 'Repeated reads of the same legacy manifest must keep the same optimistic revision.');
assert.equal(first.createdAt, '2025-12-01T00:00:00.000Z', 'Existing createdAt must remain unchanged.');

const persistedRevision = '2026-07-08T09:10:11.000Z';
const modernBucket = {
  async get() {
    return {
      customMetadata: { updatedAt: '2026-07-09T00:00:00.000Z' },
      uploaded,
      async text() { return JSON.stringify({ slug: 'modern-track', updatedAt: persistedRevision }); },
    };
  },
};
const modern = await readManifest(modernBucket, 'modern-track');
assert.equal(modern.updatedAt, persistedRevision, 'Persisted manifest.updatedAt must remain authoritative over R2 metadata/upload time.');

const metadataRevision = '2026-02-03T04:05:06.000Z';
const metadataBucket = {
  async get() {
    return {
      customMetadata: { updatedAt: metadataRevision },
      uploaded,
      async text() { return JSON.stringify({ slug: 'metadata-track' }); },
    };
  },
};
const metadata = await readManifest(metadataBucket, 'metadata-track');
assert.equal(metadata.updatedAt, metadataRevision, 'Stable manifest-object custom metadata must be preferred when the JSON lacks updatedAt.');

fs.rmSync(output, { force: true });
console.log('TM 5.20 legacy manifest revision guard passed: repeated reads are stable and persisted updatedAt remains authoritative.');
