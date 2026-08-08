import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const part = fs.readFileSync('cloudflare/admin-worker.parts/03f-studio-lyrics.part', 'utf8');
const catalog = fs.readFileSync('cloudflare/admin-worker.parts/02-catalog.part', 'utf8');
const output = path.join(os.tmpdir(), `launchpad-lyrics-sync-${process.pid}.js`);
const build = spawnSync(process.execPath, ['scripts/build-admin-worker.mjs', output], { encoding: 'utf8' });
if (build.status !== 0) throw new Error(`${build.stdout}\n${build.stderr}`);
const source = fs.readFileSync(output, 'utf8');
fs.rmSync(output, { force: true });

for (const required of [
  'const STUDIO_LYRICS_SYNC_VALIDATION_INTENT = "lyrics-sync-validate-v1"',
  'const STUDIO_LYRICS_SYNC_SAVE_INTENT = "lyrics-sync-save-v1"',
  '/lyrics\\/context$/',
  '/lyrics\\/sync\\/validate$/',
  '/lyrics\\/sync\\/save$/',
  'context: "lyrics-studio-v1"',
  'path: "/api/media/" + encodeURIComponent(slug) + "/audio"',
  'payload.trackId !== slug',
  'requireSynchronized: true',
  'expectedUpdatedAt',
  'expectedLyricsEtag',
  'code: "STALE_MANIFEST"',
  'code: "STALE_LYRICS"',
  'timestamps-invalid-syntax',
  'timestamps-missing-lines',
  'timestamps-order',
  'timestamps-after-audio',
  'text.includes("\\uFFFD")',
  'text.includes("\\u0000")',
  'contentType: "text/plain; charset=utf-8"',
  'await env.MEDIA_BUCKET.put(snapshot.key, proposedLyrics',
  'await writeCatalogIndex(env.MEDIA_BUCKET)',
  'const rereadLyrics = await env.MEDIA_BUCKET.get(snapshot.key)',
  'await env.MEDIA_BUCKET.put(snapshot.key, snapshot.body',
  'rollback.lyricsRestored = true',
  'rollback.manifestRestored = true',
  'rollback.catalogRestored = true',
]) assert.ok(source.includes(required), `Lyrics synchronization contract missing: ${required}`);

assert.ok(catalog.includes('/\\[(\\d{1,3}):(\\d{2})'), 'Canonical catalog timestamp parser must support long-form minute values.');
assert.ok(!part.includes('lyrics.lrc'), 'The specialized bridge must never introduce a second canonical .lrc asset.');
assert.ok(!source.includes('Ãƒ'), 'Built Worker must preserve UTF-8 text and reject mojibake.');
assert.ok(source.includes('request.headers.get("origin") === STUDIO_ALLOWED_ORIGIN'), 'Canonical audio and context reads must keep exact credentialed CORS.');
assert.ok(source.indexOf('await env.MEDIA_BUCKET.put(snapshot.key, proposedLyrics') < source.indexOf('const rereadLyrics = await env.MEDIA_BUCKET.get(snapshot.key)'), 'Save must precede canonical reread verification.');

console.log('Lyrics Studio bridge contract passed: canonical lyrics.txt only, strict sync validation, stale protection, reread and rollback.');
