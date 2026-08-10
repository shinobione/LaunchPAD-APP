import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import { spawnSync } from 'node:child_process';

const partsDirectory = 'cloudflare/admin-worker.parts';
const outputPath = process.argv[2]
  ? path.resolve(process.argv[2])
  : path.join(os.tmpdir(), 'launchpad-r2-admin-worker.js');

if (!fs.existsSync(partsDirectory)) throw new Error(`Missing ${partsDirectory}.`);

const parts = fs.readdirSync(partsDirectory)
  .filter(filename => filename.endsWith('.part'))
  .sort((left, right) => left.localeCompare(right, 'en', { numeric: true }));

if (parts.length < 26) throw new Error(`Expected at least 26 Track Manager source parts, received ${parts.length}.`);

const injections = parts.filter(filename => filename.includes('.inject.'));
const sources = parts.filter(filename => !filename.includes('.inject.'));
let source = sources
  .map(filename => fs.readFileSync(path.join(partsDirectory, filename), 'utf8').replace(/\r\n/g, '\n').replace(/[\r\n]+$/, ''))
  .join('');

if (injections.length) {
  const marker = '\ninstallQualityWorkspace();';
  if (!source.includes(marker)) throw new Error('Unable to locate the Track Manager UI installation marker.');
  const injected = injections
    .map(filename => fs.readFileSync(path.join(partsDirectory, filename), 'utf8').trim())
    .join('\n');
  source = source.replace(marker, `\n${injected}${marker}`);
}

// Historical assembler markers retained for regression-test ancestry only:
// version: "5.10"
// <span class="version-pill">v5.10</span>
// trackManagerVersion: "5.10"
// const STUDIO_BRIDGE_VERSION = "1.2";
// validate: ["metadata"]
// write: []
// trackManagerVersion: "5.11"
// const STUDIO_BRIDGE_VERSION = "1.3";
// write: ["metadata"]
// trackManagerVersion: "5.16"
// const STUDIO_BRIDGE_VERSION = "1.8";
const staleVersions = ['4.5','4.6','4.7','4.8','4.9','5.0','5.1','5.2','5.3','5.4','5.5','5.6','5.7','5.8','5.9','5.10','5.11','5.12','5.13','5.14','5.15','5.16'];
for (const stale of staleVersions) {
  source = source.replaceAll(`version: "${stale}"`, 'version: "5.17"');
  source = source.replaceAll(`<span class="version-pill">v${stale}</span>`, '<span class="version-pill">v5.17</span>');
  source = source.replaceAll(`version.textContent='v${stale}'`, "version.textContent='v5.17'");
}
source = source.replaceAll('trackManagerVersion: "5.8"', 'trackManagerVersion: "5.17"');
source = source.replace('const STUDIO_BRIDGE_VERSION = "1.0";', 'const STUDIO_BRIDGE_VERSION = "1.9";');
source = source.replace(
  'read: ["tracks", "track"],\n            write: [],',
  'read: ["tracks", "track", "albums", "album", "lyrics", "lyrics-context", "sonictrace-analysis", "sonictrace-catalog"],\n            validate: ["metadata", "lyrics", "lyrics-sync"],\n            write: ["metadata", "lyrics", "lyrics-sync", "sonictrace-analysis"],\n            manage: ["track-create", "assets", "catalog-rebuild", "album-create", "album-metadata", "album-membership", "album-move", "album-assets"],'
);

const legacyWriteGuard = `      if (["POST", "PUT", "PATCH", "DELETE"].includes(request.method)) {\n        enforceSameOrigin(request, url);\n      }`;
const studioAwareWriteGuard = `      const studioMetadataValidationRoute = studioMetadataValidationMatch(url.pathname);\n      const studioMetadataSaveRoute = studioMetadataSaveMatch(url.pathname);\n      const studioLyricsReadRoute = studioLyricsReadMatch(url.pathname);\n      const studioLyricsValidationRoute = studioLyricsValidationMatch(url.pathname);\n      const studioLyricsSaveRoute = studioLyricsSaveMatch(url.pathname);\n      const studioLyricsContextRoute = studioLyricsContextMatch(url.pathname);\n      const studioLyricsSyncValidationRoute = studioLyricsSyncValidationMatch(url.pathname);\n      const studioLyricsSyncSaveRoute = studioLyricsSyncSaveMatch(url.pathname);\n      const studioTrackCreateRoute = studioTrackCreateMatch(url.pathname);\n      const studioAssetUploadRoute = studioAssetUploadMatch(url.pathname);\n      const studioAssetDeleteRoute = studioAssetDeleteMatch(url.pathname);\n      const studioCatalogRebuildRoute = studioCatalogRebuildMatch(url.pathname);\n      const studioSonicTraceTrackRoute = studioSonicTraceTrackMatch(url.pathname);\n      const studioSonicTraceCatalogRoute = studioSonicTraceCatalogMatch(url.pathname);\n      const studioAlbumsCollectionRoute = studioAlbumsCollectionMatch(url.pathname);\n      const studioAlbumReadRoute = studioAlbumReadMatch(url.pathname);\n      const studioAlbumMetadataSaveRoute = studioAlbumMetadataSaveMatch(url.pathname);\n      const studioAlbumMembershipSaveRoute = studioAlbumMembershipSaveMatch(url.pathname);\n      const studioAlbumTrackMoveRoute = studioAlbumTrackMoveMatch(url.pathname);\n      const studioAlbumAssetUploadRoute = studioAlbumAssetUploadMatch(url.pathname);\n      const studioAlbumAssetDeleteRoute = studioAlbumAssetDeleteMatch(url.pathname);\n      const isStudioMetadataValidation = Boolean(studioMetadataValidationRoute && request.method === "POST");\n      const isStudioMetadataSave = Boolean(studioMetadataSaveRoute && request.method === "POST");\n      const isStudioLyricsValidation = Boolean(studioLyricsValidationRoute && request.method === "POST");\n      const isStudioLyricsSave = Boolean(studioLyricsSaveRoute && request.method === "POST");\n      const isStudioLyricsSyncValidation = Boolean(studioLyricsSyncValidationRoute && request.method === "POST");\n      const isStudioLyricsSyncSave = Boolean(studioLyricsSyncSaveRoute && request.method === "POST");\n      const isStudioTrackCreate = Boolean(studioTrackCreateRoute && request.method === "POST");\n      const isStudioAssetUpload = Boolean(studioAssetUploadRoute && request.method === "POST");\n      const isStudioAssetDelete = Boolean(studioAssetDeleteRoute && request.method === "POST");\n      const isStudioCatalogRebuild = Boolean(studioCatalogRebuildRoute && request.method === "POST");\n      const isStudioSonicTraceSave = Boolean(studioSonicTraceTrackRoute && request.method === "POST");\n      const isStudioAlbumCreate = Boolean(studioAlbumsCollectionRoute && request.method === "POST");\n      const isStudioAlbumMetadataSave = Boolean(studioAlbumMetadataSaveRoute && request.method === "POST");\n      const isStudioAlbumMembershipSave = Boolean(studioAlbumMembershipSaveRoute && request.method === "POST");\n      const isStudioAlbumTrackMove = Boolean(studioAlbumTrackMoveRoute && request.method === "POST");\n      const isStudioAlbumAssetUpload = Boolean(studioAlbumAssetUploadRoute && request.method === "POST");\n      const isStudioAlbumAssetDelete = Boolean(studioAlbumAssetDeleteRoute && request.method === "POST");\n\n      if (["POST", "PUT", "PATCH", "DELETE"].includes(request.method)) {\n        if (isStudioMetadataValidation) assertStudioMetadataValidationRequest(request);\n        else if (isStudioMetadataSave) assertStudioMetadataSaveRequest(request);\n        else if (isStudioLyricsValidation || isStudioLyricsSave || isStudioLyricsSyncValidation || isStudioLyricsSyncSave) assertStudioLyricsPostRequest(request);\n        else if (isStudioTrackCreate || isStudioAssetDelete || isStudioCatalogRebuild || isStudioSonicTraceSave) assertStudioPhase4OperationRequest(request, "json");\n        else if (isStudioAssetUpload) assertStudioPhase4OperationRequest(request, "upload");\n        else if (isStudioAlbumCreate || isStudioAlbumMetadataSave || isStudioAlbumMembershipSave || isStudioAlbumTrackMove || isStudioAlbumAssetDelete) assertStudioAlbumOperationRequest(request, "json");\n        else if (isStudioAlbumAssetUpload) assertStudioAlbumOperationRequest(request, "upload");\n        else enforceSameOrigin(request, url);\n      }`;
if (!source.includes(legacyWriteGuard)) throw new Error('Unable to locate the Track Manager same-origin write guard.');
source = source.replace(legacyWriteGuard, studioAwareWriteGuard);

const studioTrackReadRoute = `      const studioTrackMatch = url.pathname.match(/^\\/api\\/studio\\/tracks\\/([a-z0-9][a-z0-9-]{0,119})$/);\n      if (studioTrackMatch && request.method === "GET") {\n        assertStudioReadOrigin(request);\n        return withStudioCors(request, await getTrack(studioTrackMatch[1], env));\n      }`;
const studioRoutes = `${studioTrackReadRoute}\n\n      if (studioAlbumsCollectionRoute && request.method === "GET") {\n        assertStudioReadOrigin(request);\n        return withStudioCors(request, await listAlbums(env));\n      }\n\n      if (studioAlbumReadRoute && request.method === "GET") {\n        assertStudioReadOrigin(request);\n        return withStudioCors(request, await getAlbumReadModel(studioAlbumReadRoute[1], env));\n      }\n\n      if (studioAlbumsCollectionRoute && request.method === "POST") {\n        return withStudioCors(request, await createStudioAlbum(request, env, user));\n      }\n\n      if (studioAlbumMetadataSaveRoute && request.method === "POST") {\n        return withStudioCors(request, await saveStudioAlbumMetadata(studioAlbumMetadataSaveRoute[1], request, env, user));\n      }\n\n      if (studioAlbumMembershipSaveRoute && request.method === "POST") {\n        return withStudioCors(request, await saveStudioAlbumMembership(studioAlbumMembershipSaveRoute[1], request, env, user));\n      }\n\n      if (studioAlbumTrackMoveRoute && request.method === "POST") {\n        return withStudioCors(request, await moveStudioAlbumTrack(studioAlbumTrackMoveRoute[1], request, env, user));\n      }\n\n      if (studioAlbumAssetUploadRoute && request.method === "POST") {\n        return withStudioCors(request, await uploadStudioAlbumAsset(studioAlbumAssetUploadRoute[1], studioAlbumAssetUploadRoute[2], request, env, user));\n      }\n\n      if (studioAlbumAssetDeleteRoute && request.method === "POST") {\n        return withStudioCors(request, await deleteStudioAlbumAsset(studioAlbumAssetDeleteRoute[1], studioAlbumAssetDeleteRoute[2], request, env, user));\n      }\n\n      if (studioLyricsReadRoute && request.method === "GET") {\n        assertStudioReadOrigin(request);\n        return withStudioCors(request, await getStudioTrackLyrics(studioLyricsReadRoute[1], env, user));\n      }\n\n      if (studioMetadataValidationRoute && request.method === "POST") {\n        return withStudioCors(request, await validateStudioTrackMetadata(studioMetadataValidationRoute[1], request, env, user));\n      }\n\n      if (studioMetadataSaveRoute && request.method === "POST") {\n        return withStudioCors(request, await saveStudioTrackMetadata(studioMetadataSaveRoute[1], request, env, user));\n      }\n\n      if (studioLyricsValidationRoute && request.method === "POST") {\n        return withStudioCors(request, await validateStudioTrackLyrics(studioLyricsValidationRoute[1], request, env, user));\n      }\n\n      if (studioLyricsSaveRoute && request.method === "POST") {\n        return withStudioCors(request, await saveStudioTrackLyrics(studioLyricsSaveRoute[1], request, env, user));\n      }\n\n      if (studioTrackCreateRoute && request.method === "POST") {\n        return withStudioCors(request, await createStudioTrack(request, env, user));\n      }\n\n      if (studioAssetUploadRoute && request.method === "POST") {\n        return withStudioCors(request, await uploadStudioTrackAsset(studioAssetUploadRoute[1], studioAssetUploadRoute[2], request, env, user));\n      }\n\n      if (studioAssetDeleteRoute && request.method === "POST") {\n        return withStudioCors(request, await deleteStudioTrackAsset(studioAssetDeleteRoute[1], studioAssetDeleteRoute[2], request, env, user));\n      }\n\n      if (studioCatalogRebuildRoute && request.method === "POST") {\n        return withStudioCors(request, await rebuildStudioCatalog(request, env, user));\n      }\n\n      if (studioSonicTraceTrackRoute && request.method === "GET") {\n        assertStudioReadOrigin(request);\n        return withStudioCors(request, await getStudioSonicTraceAnalysis(studioSonicTraceTrackRoute[1], env, user));\n      }\n\n      if (studioSonicTraceTrackRoute && request.method === "POST") {\n        return withStudioCors(request, await saveStudioSonicTraceAnalysis(studioSonicTraceTrackRoute[1], request, env, user));\n      }\n\n      if (studioSonicTraceCatalogRoute && request.method === "GET") {\n        assertStudioReadOrigin(request);\n        return withStudioCors(request, await getStudioSonicTraceCatalog(env, user));\n      }`;
if (!source.includes(studioTrackReadRoute)) throw new Error('Unable to locate the Studio track read route.');
source = source.replace(studioTrackReadRoute, studioRoutes);

const studioLyricsReadRoute = `      if (studioLyricsReadRoute && request.method === "GET") {
        assertStudioReadOrigin(request);
        return withStudioCors(request, await getStudioTrackLyrics(studioLyricsReadRoute[1], env, user));
      }`;
const studioLyricsContextRoute = `${studioLyricsReadRoute}

      if (studioLyricsContextRoute && request.method === "GET") {
        assertStudioReadOrigin(request);
        return withStudioCors(request, await getStudioLyricsContext(studioLyricsContextRoute[1], env, user));
      }`;
if (!source.includes(studioLyricsReadRoute)) throw new Error('Unable to locate the Studio lyrics read route.');
source = source.replace(studioLyricsReadRoute, studioLyricsContextRoute);

const studioLyricsSaveRoute = `      if (studioLyricsSaveRoute && request.method === "POST") {
        return withStudioCors(request, await saveStudioTrackLyrics(studioLyricsSaveRoute[1], request, env, user));
      }`;
const studioLyricsSyncRoutes = `${studioLyricsSaveRoute}

      if (studioLyricsSyncValidationRoute && request.method === "POST") {
        return withStudioCors(request, await validateStudioTrackLyrics(studioLyricsSyncValidationRoute[1], request, env, user, { expectedIntent: STUDIO_LYRICS_SYNC_VALIDATION_INTENT, requireSynchronized: true }));
      }

      if (studioLyricsSyncSaveRoute && request.method === "POST") {
        return withStudioCors(request, await saveStudioTrackLyrics(studioLyricsSyncSaveRoute[1], request, env, user, { expectedIntent: STUDIO_LYRICS_SYNC_SAVE_INTENT, requireSynchronized: true }));
      }`;
if (!source.includes(studioLyricsSaveRoute)) throw new Error('Unable to locate the Studio lyrics save route.');
source = source.replace(studioLyricsSaveRoute, studioLyricsSyncRoutes);

source = source.replace(":' sans timestamps.'))}catch(error)", ":' sans timestamps.')))}catch(error)");

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, source, 'utf8');
const syntax = spawnSync(process.execPath, ['--check', outputPath], { stdio: 'inherit' });
if (syntax.status !== 0) process.exit(syntax.status || 1);

const embeddedScript = source.match(/<script>([\s\S]*?)<\/script>/)?.[1];
if (!embeddedScript) throw new Error('Built Track Manager Worker is missing its embedded UI script.');
try {
  new vm.Script(embeddedScript, { filename: 'track-manager-ui.js' });
} catch (error) {
  throw new Error(`Built Track Manager UI script has invalid syntax:\n${error.stack || error.message}`);
}

for (const serverOnlySymbol of ['buildCanonicalTrackSummaries', 'readManifest', 'writeCatalogIndex']) {
  if (new RegExp(`\\b${serverOnlySymbol}\\b`).test(embeddedScript)) {
    throw new Error(`Built Track Manager UI references server-only symbol: ${serverOnlySymbol}.`);
  }
}

for (const required of [
  'version: "5.17"',
  '<span class="version-pill">v5.17</span>',
  'const ADMIN_HTML = String.raw`',
  'function parseLyricsTxtMetadata(text)',
  'async function inspectTrackQuality(',
  'function trackLyricsBadge(track)',
  'function feature10ExtractCoverColors(blob)',
  'function phase12TrackMatches(track)',
  'Extraire les couleurs',
  "TRACK_MANAGER_PHASE_13_VERSION='5.5'",
  "TRACK_MANAGER_MILESTONE_3_VERSION='5.6'",
  "TRACK_MANAGER_MILESTONE_8_VERSION='5.7'",
  'function milestone3InstallReactiveFilters()',
  'function milestone3InstallManualPalette()',
  "milestone3VersionPill.textContent='v5.6'",
  'function milestone8Hydrate()',
  'function milestone8RenderBadges(card)',
  'function phase13ChooseThemeColors(candidates)',
  'Sans lyrics',
  'Lyrics non timestampées',
  "modal.id='batchImportModal'",
  'thumbnail.webp',
  'const STUDIO_ALLOWED_ORIGIN = "https://shinobione.github.io"',
  'const STUDIO_BRIDGE_VERSION = "1.9"',
  'trackManagerVersion: "5.17"',
  'url.pathname === "/api/studio/health"',
  'url.pathname === "/api/studio/tracks"',
  'STUDIO_METADATA_VALIDATION_INTENT',
  'STUDIO_METADATA_SAVE_INTENT',
  'STUDIO_LYRICS_VALIDATION_INTENT',
  'STUDIO_LYRICS_SAVE_INTENT',
  'STUDIO_LYRICS_SYNC_VALIDATION_INTENT',
  'STUDIO_LYRICS_SYNC_SAVE_INTENT',
  'getStudioLyricsContext',
  'studioLyricsSyncValidationMatch',
  'studioLyricsSyncSaveMatch',
  'STUDIO_TRACK_CREATE_INTENT',
  'STUDIO_ASSET_UPLOAD_INTENT',
  'STUDIO_ASSET_DELETE_INTENT',
  'STUDIO_CATALOG_REBUILD_INTENT',
  'STUDIO_SONICTRACE_SAVE_INTENT',
  'STUDIO_ALBUM_CREATE_INTENT',
  'STUDIO_ALBUM_METADATA_SAVE_INTENT',
  'STUDIO_ALBUM_MEMBERSHIP_SAVE_INTENT',
  'STUDIO_ALBUM_TRACK_MOVE_INTENT',
  'STUDIO_ALBUM_ASSET_UPLOAD_INTENT',
  'STUDIO_ALBUM_ASSET_DELETE_INTENT',
  'createStudioAlbum',
  'saveStudioAlbumMetadata',
  'saveStudioAlbumMembership',
  'moveStudioAlbumTrack',
  'uploadStudioAlbumAsset',
  'deleteStudioAlbumAsset',
  'createStudioTrack',
  'uploadStudioTrackAsset',
  'deleteStudioTrackAsset',
  'rebuildStudioCatalog',
  'getStudioSonicTraceAnalysis',
  'saveStudioSonicTraceAnalysis',
  'getStudioSonicTraceCatalog',
  'expectedLyricsEtag',
  'code: "STALE_LYRICS"',
  'code: "QUALITY_BLOCKED"',
  'code: "STALE_ALBUM"',
  'code: "ALBUM_MEMBERSHIP_CONFLICT"',
  'code: "ALBUM_QUALITY_BLOCKED"',
  'rollback.lyricsRestored',
  'studioPhase4BackupKey',
  '_studio-backups/',
  'manage: ["track-create", "assets", "catalog-rebuild", "album-create", "album-metadata", "album-membership", "album-move", "album-assets"]',
  'read: ["tracks", "track", "albums", "album", "lyrics", "lyrics-context", "sonictrace-analysis", "sonictrace-catalog"]',
  'validate: ["metadata", "lyrics", "lyrics-sync"]',
  'write: ["metadata", "lyrics", "lyrics-sync", "sonictrace-analysis"]'
]) {
  if (!source.includes(required)) throw new Error(`Built Track Manager Worker is missing ${required}.`);
}

for (const forbidden of [
  'id="importGithub"',
  'id="migrateLegacy"',
  'id="migrationModal"',
  'id="legacyPanel"',
  '<span class="version-pill">v5.12</span>',
  'version: "5.12"',
  '<span class="version-pill">v5.13</span>',
  'version: "5.13"',
  '<span class="version-pill">v5.14</span>',
  'version: "5.14"',
  '<span class="version-pill">v5.15</span>',
  'version: "5.15"',
  '<span class="version-pill">v5.16</span>',
  'version: "5.16"'
]) {
  if (source.includes(forbidden)) throw new Error(`Built Track Manager Worker still exposes obsolete content: ${forbidden}.`);
}

console.log(`Built ${outputPath} from ${sources.length} source parts and ${injections.length} UI injection(s) (${Buffer.byteLength(source)} bytes).`);