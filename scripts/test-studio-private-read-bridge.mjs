import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const runtimePath = 'cloudflare/admin-worker.parts/01-runtime.part';
const validationPartPath = 'cloudflare/admin-worker.parts/03d-studio-metadata-validation.part';
const savePartPath = 'cloudflare/admin-worker.parts/03e-studio-metadata-save.part';
const runtime = fs.readFileSync(runtimePath, 'utf8');
const validationPart = fs.readFileSync(validationPartPath, 'utf8');
const savePart = fs.readFileSync(savePartPath, 'utf8');
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
for (const route of [
  'url.pathname === "/api/studio/health"',
  'url.pathname === "/api/studio/tracks"',
  '/^\\/api\\/studio\\/tracks\\/([a-z0-9][a-z0-9-]{0,119})$/'
]) assert.ok(runtime.includes(route), `Missing Studio read route: ${route}`);

for (const required of [
  'const STUDIO_METADATA_VALIDATION_INTENT = "metadata-validate-v1";',
  '/metadata\\/validate$/',
  'requestedMethod === "POST" && metadataValidation',
  'contentType !== "application/json" && contentType !== "text/plain"',
  'contentType === "application/json" && request.headers.get("x-shinobiwan-studio-intent")',
  'contentType === "text/plain"',
  'payload.intent !== STUDIO_METADATA_VALIDATION_INTENT',
  'expectedUpdatedAt',
  'code: "STALE_MANIFEST"',
  'validationOnly: true',
  'inspectTrackQuality',
  'simple-post-v1',
  'json-preflight-v1',
]) assert.ok(validationPart.includes(required), `Metadata validation contract missing: ${required}`);
for (const forbiddenMutation of ['writeManifest(', 'writeCatalogIndex(', '.put(', '.delete(', 'saveTrack(', 'saveThumbnail(', 'deleteTrack(']) {
  assert.ok(!validationPart.includes(forbiddenMutation), `Metadata validation part must remain non-mutating: ${forbiddenMutation}`);
}

for (const required of [
  'const STUDIO_METADATA_SAVE_INTENT = "metadata-save-v1";',
  '/metadata\\/save$/',
  'studioMetadataContentType(request) !== "text/plain"',
  'payload.intent !== STUDIO_METADATA_SAVE_INTENT',
  'expectedUpdatedAt',
  'code: "STALE_MANIFEST"',
  'normalizeStudioMetadataPatch(payload.metadata)',
  'inspectTrackQuality',
  'code: "QUALITY_BLOCKED"',
  'await writeManifest(env.MEDIA_BUCKET, proposed)',
  'await writeCatalogIndex(env.MEDIA_BUCKET)',
  'const reread = await readManifest(env.MEDIA_BUCKET, slug)',
  'reread.updatedAt !== proposed.updatedAt',
  'await writeManifest(env.MEDIA_BUCKET, existing)',
  'code: manifestWritten ? "SAVE_ROLLBACK" : "SAVE_FAILED"',
  'catalogRebuilt: true',
]) assert.ok(savePart.includes(required), `Metadata save contract missing: ${required}`);
for (const forbiddenMutation of ['.put(', '.delete(', 'saveTrack(', 'saveThumbnail(', 'deleteTrack(', 'FormData', 'remove_audio', 'remove_cover', 'remove_thumbnail', 'remove_lyrics', 'remove_video']) {
  assert.ok(!savePart.includes(forbiddenMutation), `Metadata save part must not expose media mutation plumbing: ${forbiddenMutation}`);
}
for (const forbiddenMethod of ['PUT', 'PATCH', 'DELETE']) {
  assert.ok(!savePart.includes(`request.method === "${forbiddenMethod}"`), `Studio metadata save part must not expose ${forbiddenMethod}.`);
  assert.ok(!validationPart.includes(`request.method === "${forbiddenMethod}"`), `Studio validation part must not expose ${forbiddenMethod}.`);
}

assert.ok(built.includes('version: "5.11"'), 'Built Track Manager contract must be v5.11.');
assert.ok(built.includes('<span class="version-pill">v5.11</span>'), 'Built Track Manager UI must report v5.11.');
assert.ok(built.includes('const STUDIO_BRIDGE_VERSION = "1.3";'), 'Studio bridge contract must be v1.3.');
assert.ok(built.includes('trackManagerVersion: "5.11"'), 'Studio bridge health must report Track Manager v5.11.');
assert.ok(built.includes('validate: ["metadata"]'), 'Studio health must expose metadata validation capability.');
assert.ok(built.includes('write: ["metadata"]'), 'Studio health must expose only metadata write capability.');
assert.ok(!built.includes('write: ["metadata",'), 'Studio health must not expose additional write capabilities.');
assert.ok(built.includes('const isStudioMetadataValidation = Boolean(studioMetadataValidationRoute && request.method === "POST");'));
assert.ok(built.includes('const isStudioMetadataSave = Boolean(studioMetadataSaveRoute && request.method === "POST");'));
assert.ok(built.includes('if (isStudioMetadataValidation) assertStudioMetadataValidationRequest(request);\n        else if (isStudioMetadataSave) assertStudioMetadataSaveRequest(request);\n        else enforceSameOrigin(request, url);'), 'All unrelated Track Manager writes must retain same-origin enforcement.');
assert.ok(built.includes('await validateStudioTrackMetadata(studioMetadataValidationRoute[1], request, env, user)'));
assert.ok(built.includes('await saveStudioTrackMetadata(studioMetadataSaveRoute[1], request, env, user)'));
assert.ok(built.includes('payload.intent !== STUDIO_METADATA_VALIDATION_INTENT'));
assert.ok(built.includes('payload.intent !== STUDIO_METADATA_SAVE_INTENT'));
assert.ok(built.includes('Access-Control-Allow-Origin'), 'Built worker lost Studio CORS headers.');

const authIndex = built.indexOf('const user = await verifyAccessJwt(request, env);');
const validationRouteIndex = built.indexOf('await validateStudioTrackMetadata(studioMetadataValidationRoute[1], request, env, user)');
const saveRouteIndex = built.indexOf('await saveStudioTrackMetadata(studioMetadataSaveRoute[1], request, env, user)');
assert.ok(authIndex >= 0 && validationRouteIndex > authIndex, 'Validation route must remain behind Access JWT verification.');
assert.ok(authIndex >= 0 && saveRouteIndex > authIndex, 'Metadata save route must remain behind Access JWT verification.');
const optionsIndex = built.indexOf('request.method === "OPTIONS" && url.pathname.startsWith("/api/studio/")');
assert.ok(optionsIndex >= 0 && optionsIndex < authIndex, 'Legacy validation preflight support must remain before Access JWT verification.');

console.log('Studio bridge guard passed: v1.3 keeps authenticated private reads, non-mutating validation, one metadata-only write capability, stale/quality guards, catalog rebuild and rollback while media writes remain unreachable.');
