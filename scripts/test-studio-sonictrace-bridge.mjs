import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const output = path.join(os.tmpdir(), `launchpad-sonictrace-${process.pid}.js`);
const built = spawnSync(process.execPath, ['scripts/build-admin-worker.mjs', output], { encoding: 'utf8' });
if (built.status !== 0) throw new Error(`${built.stdout}\n${built.stderr}`);
const source = fs.readFileSync(output, 'utf8');
const deployWorkflow = fs.readFileSync('.github/workflows/deploy-cloudflare.yml', 'utf8');
fs.rmSync(output, { force: true });

for (const required of [
  'const STUDIO_SONICTRACE_SAVE_INTENT = "sonictrace-analysis-save-v1"',
  '/analysis/sonictrace',
  'analysis/sonictrace/latest.json',
  'analysis/sonictrace/history/',
  'sourceVersion',
  'STALE_AUDIO',
  'audioStored: false',
  'embedding.dimension !== 512',
  'getStudioSonicTraceCatalog',
  'write: ["metadata", "lyrics", "lyrics-sync", "sonictrace-analysis"]',
]) assert.ok(source.includes(required), `Built Worker is missing SonicTrace contract fragment: ${required}`);

assert.ok(!source.includes('manifest.assets.sonictrace'), 'SonicTrace must not be written into manifest schema v1.');
assert.ok(!source.includes('Ã'), 'Built Worker must preserve UTF-8 user-facing text and reject mojibake.');
assert.ok(source.indexOf('await env.MEDIA_BUCKET.put(historyKey') < source.indexOf('await env.MEDIA_BUCKET.put(latestKey'), 'History must be persisted before latest.');
assert.ok(source.includes('rollback.latestRestored = true'), 'Latest rollback verification is required.');
assert.ok(deployWorkflow.includes("EXPECTED_ADMIN_VERSION: '5.15'"), 'Protected deployment must verify Track Manager v5.15.');

console.log('Studio SonicTrace bridge contract is trackId-bound, UTF-8 clean, versioned, append-only and rollback guarded.');
