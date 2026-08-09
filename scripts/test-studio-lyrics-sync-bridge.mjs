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
  'observedAudioDuration',
  'duration-manifest-mismatch',
  'selectedReference: observed != null ? "observed-canonical-audio"',
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

const durationHelperStart = part.indexOf('function studioLyricsDurationEvidence(');
const durationHelperEnd = part.indexOf('\nfunction studioLyricsQuality(', durationHelperStart);
assert.ok(durationHelperStart >= 0 && durationHelperEnd > durationHelperStart, 'Duration evidence helper must remain independently testable.');
const durationEvidence = new Function(`const QUALITY_DURATION_MINIMUM_TOLERANCE = 3; ${part.slice(durationHelperStart, durationHelperEnd)}; return studioLyricsDurationEvidence;`)();
const staleManifest = durationEvidence(298, 330, 303);
assert.equal(staleManifest.selectedReference, 'observed-canonical-audio');
assert.equal(staleManifest.mismatch, true);
assert.equal(staleManifest.timestampWithinAudio, true, 'Observed canonical audio must prevent a false blocker from stale shorter manifest duration.');
const trueOverflow = durationEvidence(298, 330, 333);
assert.equal(trueOverflow.timestampWithinAudio, false, 'A timestamp beyond observed canonical audio must remain blocked.');
const manifestFallback = durationEvidence(298, null, 301);
assert.equal(manifestFallback.selectedReference, 'manifest');
assert.equal(manifestFallback.timestampWithinAudio, false, 'Manifest duration remains the fallback when no observed evidence is supplied.');

console.log('Lyrics Studio bridge contract passed: canonical lyrics.txt only, observed canonical-audio duration evidence, strict sync validation, stale protection, reread and rollback.');
