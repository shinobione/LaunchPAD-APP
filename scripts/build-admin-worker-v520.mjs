import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import { spawnSync } from 'node:child_process';

const outputPath = process.argv[2]
  ? path.resolve(process.argv[2])
  : path.join(os.tmpdir(), 'launchpad-r2-admin-worker-v520.js');

const base = spawnSync(process.execPath, ['scripts/build-admin-worker-v519.mjs', outputPath], { stdio: 'inherit' });
if (base.status !== 0) process.exit(base.status || 1);

let source = fs.readFileSync(outputPath, 'utf8');

const legacyReadManifest = `async function readManifest(bucket, slug) {
  const object = await bucket.get(trackPrefix(slug) + MANIFEST_NAME);
  if (!object) return null;
  try { return normalizeManifest(JSON.parse(await object.text())); }
  catch { return null; }
}`;

const stableReadManifest = `async function readManifest(bucket, slug) {
  const object = await bucket.get(trackPrefix(slug) + MANIFEST_NAME);
  if (!object) return null;
  try {
    const raw = JSON.parse(await object.text());
    const stableObjectTimestamp = object.customMetadata?.updatedAt
      || object.uploaded?.toISOString?.()
      || raw?.createdAt
      || "1970-01-01T00:00:00.000Z";
    if (!raw?.updatedAt) raw.updatedAt = stableObjectTimestamp;
    if (!raw?.createdAt) raw.createdAt = object.uploaded?.toISOString?.() || raw.updatedAt;
    return normalizeManifest(raw);
  } catch { return null; }
}`;

for (const marker of [
  'version: "5.19"',
  'trackManagerVersion: "5.19"',
  'const STUDIO_BRIDGE_VERSION = "1.11";',
  legacyReadManifest,
]) {
  if (!source.includes(marker)) throw new Error(`TM 5.20 wrapper could not find required v5.19 marker: ${marker.slice(0, 120)}`);
}

source = source.replace(legacyReadManifest, stableReadManifest);
source = source.replaceAll('version: "5.19"', 'version: "5.20"');
source = source.replaceAll('trackManagerVersion: "5.19"', 'trackManagerVersion: "5.20"');
source = source.replaceAll('v5.19', 'v5.20');

for (const forbidden of [
  'version: "5.19"',
  'trackManagerVersion: "5.19"',
  legacyReadManifest,
]) {
  if (source.includes(forbidden)) throw new Error(`Stale TM 5.19/legacy revision marker remains in TM 5.20 bundle: ${forbidden.slice(0, 120)}`);
}

for (const required of [
  'version: "5.20"',
  'trackManagerVersion: "5.20"',
  'const STUDIO_BRIDGE_VERSION = "1.11";',
  'object.customMetadata?.updatedAt',
  'object.uploaded?.toISOString?.()',
  'if (!raw?.updatedAt) raw.updatedAt = stableObjectTimestamp;',
  'if (!raw?.createdAt) raw.createdAt = object.uploaded?.toISOString?.() || raw.updatedAt;',
]) {
  if (!source.includes(required)) throw new Error(`TM 5.20 bundle is missing stable legacy revision contract: ${required}`);
}

fs.writeFileSync(outputPath, source, 'utf8');
const syntax = spawnSync(process.execPath, ['--check', outputPath], { stdio: 'inherit' });
if (syntax.status !== 0) process.exit(syntax.status || 1);

const embeddedScript = source.match(/<script>([\s\S]*?)<\/script>/)?.[1];
if (!embeddedScript) throw new Error('TM 5.20 bundle is missing its embedded UI script.');
new vm.Script(embeddedScript, { filename: 'track-manager-ui-v520.js' });

const readManifestMatch = source.match(/async function readManifest\(bucket, slug\) \{[\s\S]*?\n\}\n\nasync function writeManifest/);
if (!readManifestMatch) throw new Error('TM 5.20 bundle is missing the guarded readManifest implementation.');
const isolatedReadManifest = readManifestMatch[0].replace(/\n\nasync function writeManifest$/, '');
const readContext = {
  MANIFEST_NAME: 'manifest.json',
  trackPrefix: slug => `tracks/${slug}/`,
  normalizeManifest: manifest => ({ ...manifest }),
};
vm.createContext(readContext);
vm.runInContext(`${isolatedReadManifest}\nglobalThis.__readManifest = readManifest;`, readContext);

const uploaded = new Date('2026-01-02T03:04:05.000Z');
const legacyBody = JSON.stringify({ slug: 'magnetic-midnight', createdAt: '2025-12-01T00:00:00.000Z' });
const legacyBucket = {
  async get() {
    return { customMetadata: {}, uploaded, async text() { return legacyBody; } };
  },
};
const firstLegacyRead = await readContext.__readManifest(legacyBucket, 'magnetic-midnight');
const secondLegacyRead = await readContext.__readManifest(legacyBucket, 'magnetic-midnight');
assert.equal(firstLegacyRead.updatedAt, uploaded.toISOString());
assert.equal(secondLegacyRead.updatedAt, firstLegacyRead.updatedAt, 'Same legacy R2 object must keep one stable optimistic revision across repeated reads.');

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
const modernRead = await readContext.__readManifest(modernBucket, 'modern-track');
assert.equal(modernRead.updatedAt, persistedRevision, 'Persisted manifest.updatedAt remains authoritative.');

console.log(`Track Manager v5.20 / Studio bridge v1.11 stable legacy manifest revision bundle verified: ${outputPath}`);
