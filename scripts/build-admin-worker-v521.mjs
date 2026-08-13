import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import { spawnSync } from 'node:child_process';

const outputPath = process.argv[2]
  ? path.resolve(process.argv[2])
  : path.join(os.tmpdir(), 'launchpad-r2-admin-worker-v521.js');

const base = spawnSync(process.execPath, ['scripts/build-admin-worker-v520.mjs', outputPath], { stdio: 'inherit' });
if (base.status !== 0) process.exit(base.status || 1);

let source = fs.readFileSync(outputPath, 'utf8');

for (const marker of [
  'version: "5.20"',
  'trackManagerVersion: "5.20"',
  'const STUDIO_BRIDGE_VERSION = "1.11";',
  '  "releaseDate",\n  "album",\n  "genres",',
  '      const mediaMatch = url.pathname.match(/^\\/api\\/media\\/([a-z0-9][a-z0-9-]{0,119})\\/(cover|thumbnail|audio|video|lyrics)$/);',
  'async function getProtectedMedia(request, slug, kind, env) {',
]) {
  if (!source.includes(marker)) throw new Error(`TM 5.21 wrapper could not find required v5.20 marker: ${marker.slice(0, 140)}`);
}

// Album membership is owned by album.trackIds. The generic Studio metadata
// validate/save surface must never be able to manufacture a track-side Album
// cache claim independently of the guarded Album transactions.
source = source.replace(
  '  "releaseDate",\n  "album",\n  "genres",',
  '  "releaseDate",\n  "genres",',
);

const mediaRouteMarker = '      const mediaMatch = url.pathname.match(/^\\/api\\/media\\/([a-z0-9][a-z0-9-]{0,119})\\/(cover|thumbnail|audio|video|lyrics)$/);';
const albumMediaRoute = `      const studioAlbumMediaRoute = url.pathname.match(/^\\/api\\/studio\\/albums\\/([a-z0-9][a-z0-9-]{0,119})\\/media\\/(cover|thumbnail)$/);\n      if (studioAlbumMediaRoute && (request.method === "GET" || request.method === "HEAD")) {\n        assertStudioReadOrigin(request);\n        return withStudioCors(request, await getProtectedAlbumMedia(request, studioAlbumMediaRoute[1], studioAlbumMediaRoute[2], env));\n      }`;
source = source.replace(mediaRouteMarker, `${albumMediaRoute}\n\n${mediaRouteMarker}`);

const protectedTrackMediaMarker = 'async function getProtectedMedia(request, slug, kind, env) {';
const protectedAlbumMedia = `async function getProtectedAlbumMedia(request, albumId, kind, env) {\n  const manifest = await readAlbumManifest(env.MEDIA_BUCKET, albumId);\n  const relativePath = manifest?.assets?.[kind] || null;\n  if (!relativePath) return jsonResponse({ ok: false, error: "Média Album introuvable." }, 404);\n\n  const object = await env.MEDIA_BUCKET.get(albumPrefix(albumId) + relativePath);\n  if (!object) return jsonResponse({ ok: false, error: "Média Album introuvable." }, 404);\n\n  const headers = new Headers(corsSafeHeaders());\n  object.writeHttpMetadata(headers);\n  if (object.httpEtag) headers.set("ETag", object.httpEtag);\n  headers.set("Cache-Control", "private, no-store");\n  headers.set("Content-Disposition", "inline");\n  return new Response(request.method === "HEAD" ? null : object.body, { headers });\n}\n\n`;
source = source.replace(protectedTrackMediaMarker, `${protectedAlbumMedia}${protectedTrackMediaMarker}`);

source = source.replaceAll('version: "5.20"', 'version: "5.21"');
source = source.replaceAll('trackManagerVersion: "5.20"', 'trackManagerVersion: "5.21"');
source = source.replaceAll('v5.20', 'v5.21');

for (const forbidden of [
  'version: "5.20"',
  'trackManagerVersion: "5.20"',
  '  "releaseDate",\n  "album",\n  "genres",',
]) {
  if (source.includes(forbidden)) throw new Error(`Stale TM 5.20 / unsafe Album metadata marker remains: ${forbidden}`);
}

for (const required of [
  'version: "5.21"',
  'trackManagerVersion: "5.21"',
  'const STUDIO_BRIDGE_VERSION = "1.11";',
  '/api\\/studio\\/albums\\/',
  'getProtectedAlbumMedia(request, studioAlbumMediaRoute[1], studioAlbumMediaRoute[2], env)',
  'async function getProtectedAlbumMedia(request, albumId, kind, env) {',
  'headers.set("Cache-Control", "private, no-store")',
]) {
  if (!source.includes(required)) throw new Error(`TM 5.21 bundle is missing foundation-repair contract: ${required}`);
}

const metadataFieldsMatch = source.match(/const STUDIO_METADATA_FIELDS = Object\.freeze\(\[([\s\S]*?)\]\);/);
if (!metadataFieldsMatch) throw new Error('TM 5.21 bundle is missing STUDIO_METADATA_FIELDS.');
assert.ok(!metadataFieldsMatch[1].includes('"album"'), 'Generic Studio metadata writes must not expose the Album cache field.');

fs.writeFileSync(outputPath, source, 'utf8');
const syntax = spawnSync(process.execPath, ['--check', outputPath], { stdio: 'inherit' });
if (syntax.status !== 0) process.exit(syntax.status || 1);

const embeddedScript = source.match(/<script>([\s\S]*?)<\/script>/)?.[1];
if (!embeddedScript) throw new Error('TM 5.21 bundle is missing its embedded UI script.');
new vm.Script(embeddedScript, { filename: 'track-manager-ui-v521.js' });

const albumMediaHelperMatch = source.match(/async function getProtectedAlbumMedia\(request, albumId, kind, env\) \{[\s\S]*?\n\}\n\nasync function getProtectedMedia/);
if (!albumMediaHelperMatch) throw new Error('TM 5.21 bundle is missing protected Album media helper.');
const isolatedAlbumMediaHelper = albumMediaHelperMatch[0].replace(/\n\nasync function getProtectedMedia$/, '');
const albumMediaContext = {
  Headers,
  Response,
  corsSafeHeaders: () => ({}),
  albumPrefix: id => `albums/${id}/`,
  readAlbumManifest: async () => ({ assets: { cover: 'cover/cover.jpg', thumbnail: 'thumbnail/thumbnail.webp' } }),
  jsonResponse: (payload, status = 200) => new Response(JSON.stringify(payload), { status, headers: { 'Content-Type': 'application/json' } }),
};
vm.createContext(albumMediaContext);
vm.runInContext(`${isolatedAlbumMediaHelper}\nglobalThis.__getProtectedAlbumMedia = getProtectedAlbumMedia;`, albumMediaContext);

const requestedKeys = [];
const mediaObject = {
  body: 'album-cover-bytes',
  httpEtag: '"album-cover-etag"',
  writeHttpMetadata(headers) { headers.set('Content-Type', 'image/jpeg'); },
};
const env = { MEDIA_BUCKET: { async get(key) { requestedKeys.push(key); return mediaObject; } } };
const mediaResponse = await albumMediaContext.__getProtectedAlbumMedia({ method: 'GET' }, 'pulse-dominion', 'cover', env);
assert.equal(mediaResponse.status, 200);
assert.equal(await mediaResponse.text(), 'album-cover-bytes');
assert.equal(mediaResponse.headers.get('content-type'), 'image/jpeg');
assert.equal(mediaResponse.headers.get('cache-control'), 'private, no-store');
assert.equal(mediaResponse.headers.get('etag'), '"album-cover-etag"');
assert.deepEqual(requestedKeys, ['albums/pulse-dominion/cover/cover.jpg']);

console.log(`Track Manager v5.21 / Studio bridge v1.11 foundation repair verified: ${outputPath}`);
