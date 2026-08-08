import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const runtimePath = 'cloudflare/admin-worker.parts/01-runtime.part';
const validationPartPath = 'cloudflare/admin-worker.parts/03d-studio-metadata-validation.part';
const savePartPath = 'cloudflare/admin-worker.parts/03e-studio-metadata-save.part';
const lyricsPartPath = 'cloudflare/admin-worker.parts/03f-studio-lyrics.part';
const phase4PartPath = 'cloudflare/admin-worker.parts/03g-studio-phase4-ops.part';
const runtime = fs.readFileSync(runtimePath, 'utf8');
const validationPart = fs.readFileSync(validationPartPath, 'utf8');
const savePart = fs.readFileSync(savePartPath, 'utf8');
const lyricsPart = fs.readFileSync(lyricsPartPath, 'utf8');
const phase4Part = fs.readFileSync(phase4PartPath, 'utf8');
const builtPath = path.join(os.tmpdir(), 'launchpad-studio-bridge-test-worker.js');

const build = spawnSync(process.execPath, ['scripts/build-admin-worker.mjs', builtPath], { encoding: 'utf8' });
if (build.status !== 0) {
  process.stdout.write(build.stdout || '');
  process.stderr.write(build.stderr || '');
  process.exit(build.status || 1);
}
const built = fs.readFileSync(builtPath, 'utf8');

assert.ok(runtime.includes('const STUDIO_ALLOWED_ORIGIN = "https://shinobione.github.io";'), 'Studio bridge origin must remain exact.');
assert.ok(runtime.includes('const user = await verifyAccessJwt(request, env);'), 'Studio bridge must remain behind Cloudflare Access JWT verification.');
assert.ok(runtime.includes('enforceSameOrigin(request, url);'), 'Legacy Track Manager writes must retain the same-origin guard.');

for (const required of [
  'const STUDIO_METADATA_VALIDATION_INTENT = "metadata-validate-v1";',
  'expectedUpdatedAt',
  'code: "STALE_MANIFEST"',
  'validationOnly: true',
  'inspectTrackQuality',
]) assert.ok(validationPart.includes(required), `Metadata validation contract missing: ${required}`);
for (const forbiddenMutation of ['writeManifest(', 'writeCatalogIndex(', '.put(', '.delete(', 'saveTrack(', 'saveThumbnail(', 'deleteTrack(']) {
  assert.ok(!validationPart.includes(forbiddenMutation), `Metadata validation part must remain non-mutating: ${forbiddenMutation}`);
}

for (const required of [
  'const STUDIO_METADATA_SAVE_INTENT = "metadata-save-v1";',
  'expectedUpdatedAt',
  'code: "STALE_MANIFEST"',
  'normalizeStudioMetadataPatch(payload.metadata)',
  'inspectTrackQuality',
  'code: "QUALITY_BLOCKED"',
  'await writeManifest(env.MEDIA_BUCKET, proposed)',
  'await writeCatalogIndex(env.MEDIA_BUCKET)',
  'await writeManifest(env.MEDIA_BUCKET, existing)',
]) assert.ok(savePart.includes(required), `Metadata save contract missing: ${required}`);
for (const forbiddenMutation of ['.put(', '.delete(', 'saveTrack(', 'saveThumbnail(', 'deleteTrack(', 'FormData']) {
  assert.ok(!savePart.includes(forbiddenMutation), `Metadata save part must not expose media mutation plumbing: ${forbiddenMutation}`);
}

for (const required of [
  'const STUDIO_LYRICS_VALIDATION_INTENT = "lyrics-validate-v1";',
  'const STUDIO_LYRICS_SAVE_INTENT = "lyrics-save-v1";',
  'const STUDIO_CANONICAL_LYRICS_FILENAME = "lyrics.txt";',
  'expectedUpdatedAt',
  'expectedLyricsEtag',
  'code: "STALE_LYRICS"',
  'filename !== STUDIO_CANONICAL_LYRICS_FILENAME',
  'validationOnly: true',
  'code: "QUALITY_BLOCKED"',
  'await env.MEDIA_BUCKET.put(snapshot.key, proposedLyrics',
  'await writeManifest(env.MEDIA_BUCKET, nextManifest)',
  'await writeCatalogIndex(env.MEDIA_BUCKET)',
  'await env.MEDIA_BUCKET.put(snapshot.key, snapshot.body',
  'rollback.lyricsRestored = true',
  'rollback.manifestRestored = true',
  'rollback.catalogRestored = true',
]) assert.ok(lyricsPart.includes(required), `Lyrics bridge contract missing: ${required}`);
for (const forbiddenMutation of ['saveTrack(', 'saveThumbnail(', 'deleteTrack(', 'FormData', 'remove_audio', 'remove_cover', 'remove_thumbnail', 'remove_video']) {
  assert.ok(!lyricsPart.includes(forbiddenMutation), `Lyrics bridge must not expose unrelated mutation plumbing: ${forbiddenMutation}`);
}

for (const required of [
  'const STUDIO_TRACK_CREATE_INTENT = "track-create-v1";',
  'const STUDIO_ASSET_UPLOAD_INTENT = "asset-upload-v1";',
  'const STUDIO_ASSET_DELETE_INTENT = "asset-delete-v1";',
  'const STUDIO_CATALOG_REBUILD_INTENT = "catalog-rebuild-v1";',
  'STUDIO_PHASE4_ASSET_KINDS',
  '/api/studio/tracks/create',
  '/assets\\/(audio|cover|thumbnail|lyrics|video)\\/upload$/',
  '/assets\\/(audio|cover|thumbnail|lyrics|video)\\/delete$/',
  '/api/studio/catalog/rebuild',
  'contentType !== "multipart/form-data"',
  'contentType !== "text/plain"',
  'normalizeStudioMetadataPatch(payload.metadata || {})',
  'status: "draft"',
  'code: "TRACK_EXISTS"',
  'validateUploadFile(file, kind)',
  'kind === "thumbnail" && file.size > MAX_THUMBNAIL_BYTES',
  'kind === "lyrics" && filename !== STUDIO_CANONICAL_LYRICS_FILENAME',
  '_studio-backups/',
  'studioBackupObject',
  'studioRestoreBackup',
  'await env.MEDIA_BUCKET.put(newKey, file.stream()',
  'await env.MEDIA_BUCKET.delete(oldKey)',
  'await env.MEDIA_BUCKET.delete(key)',
  'studioPhase4NextManifest',
  'inspectTrackQuality',
  'QUALITY_BLOCKED',
  'await writeManifest(env.MEDIA_BUCKET, nextManifest)',
  'await writeCatalogIndex(env.MEDIA_BUCKET)',
  'ASSET_SAVE_ROLLBACK',
  'ASSET_DELETE_ROLLBACK',
  'payload.confirm !== "REBUILD"',
]) assert.ok(phase4Part.includes(required), `Phase 4 operational contract missing: ${required}`);

assert.ok(!phase4Part.includes('deleteTrack('), 'Studio Phase 4 bridge must not expose whole-track deletion.');
assert.ok(!phase4Part.includes('saveTrack('), 'Studio Phase 4 bridge must not expose the legacy all-in-one saveTrack route.');
assert.ok(!phase4Part.includes('saveThumbnail('), 'Studio Phase 4 bridge must use the scoped asset route rather than legacy thumbnail route.');
for (const forbiddenLiteral of ['LM-IA-Analayse', 'SonicTrace', 'analysis/sonictrace', 'lyrics.lrc']) {
  assert.ok(!phase4Part.includes(forbiddenLiteral), `Phase 4 operations must not leak Phase 5/duplicate lyrics concerns: ${forbiddenLiteral}`);
}

assert.ok(built.includes('version: "5.14"'), 'Built Track Manager contract must be v5.14.');
assert.ok(built.includes('<span class="version-pill">v5.14</span>'), 'Built Track Manager UI must report v5.14.');
assert.ok(built.includes('const STUDIO_BRIDGE_VERSION = "1.6";'), 'Studio bridge contract must be v1.6.');
assert.ok(built.includes('trackManagerVersion: "5.14"'), 'Studio bridge health must report Track Manager v5.14.');
assert.ok(built.includes('read: ["tracks", "track", "lyrics", "sonictrace-analysis", "sonictrace-catalog"]'), 'Studio health must retain private reads and add scoped SonicTrace reads.');
assert.ok(built.includes('validate: ["metadata", "lyrics"]'), 'Studio health must retain validation capabilities.');
assert.ok(built.includes('write: ["metadata", "lyrics", "sonictrace-analysis"]'), 'Studio health write list must add only the guarded SonicTrace sidecar capability.');
assert.ok(built.includes('manage: ["track-create", "assets", "catalog-rebuild"]'), 'Studio health must expose the final Phase 4 manage capabilities separately.');

for (const routeCall of [
  'await getStudioTrackLyrics(studioLyricsReadRoute[1], env, user)',
  'await validateStudioTrackLyrics(studioLyricsValidationRoute[1], request, env, user)',
  'await saveStudioTrackLyrics(studioLyricsSaveRoute[1], request, env, user)',
  'await validateStudioTrackMetadata(studioMetadataValidationRoute[1], request, env, user)',
  'await saveStudioTrackMetadata(studioMetadataSaveRoute[1], request, env, user)',
  'await createStudioTrack(request, env, user)',
  'await uploadStudioTrackAsset(studioAssetUploadRoute[1], studioAssetUploadRoute[2], request, env, user)',
  'await deleteStudioTrackAsset(studioAssetDeleteRoute[1], studioAssetDeleteRoute[2], request, env, user)',
  'await rebuildStudioCatalog(request, env, user)',
]) assert.ok(built.includes(routeCall), `Built Worker missing guarded route call: ${routeCall}`);

const authIndex = built.indexOf('const user = await verifyAccessJwt(request, env);');
for (const guardedRoute of [
  'await getStudioTrackLyrics(studioLyricsReadRoute[1], env, user)',
  'await saveStudioTrackLyrics(studioLyricsSaveRoute[1], request, env, user)',
  'await createStudioTrack(request, env, user)',
  'await uploadStudioTrackAsset(studioAssetUploadRoute[1], studioAssetUploadRoute[2], request, env, user)',
  'await deleteStudioTrackAsset(studioAssetDeleteRoute[1], studioAssetDeleteRoute[2], request, env, user)',
  'await rebuildStudioCatalog(request, env, user)',
]) {
  const routeIndex = built.indexOf(guardedRoute);
  assert.ok(authIndex >= 0 && routeIndex > authIndex, `${guardedRoute} must remain behind Access JWT verification.`);
}

assert.ok(built.includes('else enforceSameOrigin(request, url);'), 'All unrelated legacy Track Manager writes must retain same-origin enforcement.');
assert.ok(built.includes('Access-Control-Allow-Origin'), 'Built worker lost Studio CORS headers.');
assert.ok(
  built.includes('request.headers.get("origin") === STUDIO_ALLOWED_ORIGIN')
    && built.includes('? withStudioCors(request, response)'),
  'Protected canonical media must opt into the exact credentialed Studio CORS response.',
);

console.log('Studio bridge guard passed: v1.6 preserves Phase 4 capabilities and adds only guarded SonicTrace sidecar read/write routes while legacy Track Manager remains same-origin protected.');
