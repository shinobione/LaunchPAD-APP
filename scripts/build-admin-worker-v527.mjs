import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const outputPath = process.argv[2]
  ? path.resolve(process.argv[2])
  : path.join(os.tmpdir(), 'launchpad-r2-admin-worker-v527.js');

const base = spawnSync(process.execPath, ['scripts/build-admin-worker-v526.mjs', outputPath], { stdio: 'inherit' });
if (base.status !== 0) process.exit(base.status || 1);

let source = fs.readFileSync(outputPath, 'utf8');

for (const marker of [
  'version: "5.26"',
  'trackManagerVersion: "5.26"',
  'const STUDIO_BRIDGE_VERSION = "1.16";',
  'const STUDIO_ASSET_DELETE_INTENT = "asset-delete-v1";',
  'function studioAssetDeleteMatch(pathname) {',
  'const studioAssetDeleteRoute = studioAssetDeleteMatch(url.pathname);',
  'const isStudioAssetDelete = Boolean(studioAssetDeleteRoute && request.method === "POST");',
  'await deleteStudioTrackAsset(studioAssetDeleteRoute[1], studioAssetDeleteRoute[2], request, env, user)',
  '"album-delete"',
]) {
  if (!source.includes(marker)) throw new Error(`TM 5.27 wrapper missing required v5.26 marker: ${marker}`);
}

source = source.replace(
  'const STUDIO_ASSET_DELETE_INTENT = "asset-delete-v1";\n',
  'const STUDIO_ASSET_DELETE_INTENT = "asset-delete-v1";\nconst STUDIO_TRACK_DELETE_INTENT = "track-delete-v1";\n',
);

source = source.replace(
  'function studioAssetDeleteMatch(pathname) {\n  return String(pathname || "").match(/^\\/api\\/studio\\/tracks\\/([a-z0-9][a-z0-9-]{0,119})\\/assets\\/(audio|cover|thumbnail|lyrics|video)\\/delete$/);\n}\n',
  'function studioAssetDeleteMatch(pathname) {\n  return String(pathname || "").match(/^\\/api\\/studio\\/tracks\\/([a-z0-9][a-z0-9-]{0,119})\\/assets\\/(audio|cover|thumbnail|lyrics|video)\\/delete$/);\n}\n\nfunction studioTrackDeleteMatch(pathname) {\n  return String(pathname || "").match(/^\\/api\\/studio\\/tracks\\/([a-z0-9][a-z0-9-]{0,119})\\/delete$/);\n}\n',
);

const deleteFunction = `
async function deleteStudioTrack(slug, request, env, user) {
  const payload = await readStudioPhase4JsonPayload(request, STUDIO_TRACK_DELETE_INTENT);
  const existing = await readManifest(env.MEDIA_BUCKET, slug);
  if (!existing) return jsonResponse({ ok: false, error: "Track introuvable.", code: "TRACK_NOT_FOUND", trackId: slug }, 404);
  const stale = studioPhase4StaleResponse(existing, payload.expectedUpdatedAt);
  if (stale) return stale;
  if (String(payload.confirmTrackId || "") !== slug) throw new Error("INPUT_confirmTrackId doit correspondre exactement au Track supprimé.");

  // Album.trackIds is the canonical membership authority. Whole-Track deletion never edits Album membership implicitly.
  const albumObjects = await listAllObjects(env.MEDIA_BUCKET, ALBUMS_PREFIX);
  const albums = await buildCanonicalAlbumSummaries(albumObjects, env.MEDIA_BUCKET);
  const owner = albums.find(album => Array.isArray(album.trackIds) && album.trackIds.includes(slug));
  if (owner) {
    return jsonResponse({
      ok: false,
      error: "Suppression Track bloquée : retire ou déplace d'abord ce Track de son Album canonique.",
      code: "TRACK_DELETE_ALBUM_OWNED",
      trackId: slug,
      albumId: owner.id,
      albumTitle: owner.title || owner.id,
      currentUpdatedAt: existing.updatedAt || null,
    }, 409);
  }

  const scoped = await listAllObjects(env.MEDIA_BUCKET, trackPrefix(slug));
  const backupToken = crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + "-" + Math.random().toString(16).slice(2);
  const backupPrefix = \`_studio-backups/\${slug}/whole-delete-\${backupToken}/\`;
  const backups = [];
  let objectsDeleted = 0;

  try {
    for (const listed of scoped) {
      const object = await env.MEDIA_BUCKET.get(listed.key);
      if (!object) throw new Error("SAVE_VERIFY_Objet Track disparu avant backup.");
      const relative = listed.key.slice(trackPrefix(slug).length);
      const backupKey = backupPrefix + relative;
      await studioBackupObject(env.MEDIA_BUCKET, object, backupKey);
      backups.push({ backupKey, targetKey: listed.key });
    }

    for (const listed of scoped) {
      await env.MEDIA_BUCKET.delete(listed.key);
      objectsDeleted += 1;
    }

    const index = await writeCatalogIndex(env.MEDIA_BUCKET);
    const [reread, remaining] = await Promise.all([
      readManifest(env.MEDIA_BUCKET, slug),
      listAllObjects(env.MEDIA_BUCKET, trackPrefix(slug)),
    ]);
    if (reread || remaining.length) throw new Error("SAVE_VERIFY_Suppression Track non vérifiée.");

    for (const backup of backups) await studioDeleteBackup(env.MEDIA_BUCKET, backup.backupKey);
    return jsonResponse({
      ok: true,
      deleted: true,
      trackId: slug,
      previousUpdatedAt: existing.updatedAt || null,
      objectsDeleted,
      catalogRebuilt: true,
      catalogGeneratedAt: index.generatedAt || null,
      catalogCount: index.count || 0,
      authenticatedEmail: user.email || null,
    });
  } catch (error) {
    const rollback = {
      trackObjectsRestored: backups.length === 0,
      catalogRestored: false,
      backupsRemoved: false,
    };

    if (backups.length) {
      let restored = true;
      for (const backup of backups) {
        try { await studioRestoreBackup(env.MEDIA_BUCKET, backup.backupKey, backup.targetKey); }
        catch (rollbackError) { restored = false; console.error("Track whole-delete object rollback failed", backup.targetKey, rollbackError); }
      }
      rollback.trackObjectsRestored = restored;
    }

    if (rollback.trackObjectsRestored) {
      try { await writeCatalogIndex(env.MEDIA_BUCKET); rollback.catalogRestored = true; }
      catch (rollbackError) { console.error("Track whole-delete catalog rollback failed", rollbackError); }
    }

    for (const backup of backups) await studioDeleteBackup(env.MEDIA_BUCKET, backup.backupKey);
    rollback.backupsRemoved = true;
    console.error("Track whole-delete failed", error);
    return jsonResponse({
      ok: false,
      error: "Suppression Track annulée après échec de publication ou vérification.",
      code: "TRACK_DELETE_ROLLBACK",
      rollback,
      currentUpdatedAt: existing.updatedAt || null,
    }, 500);
  }
}
`;

const deleteInsertMarker = '\nasync function uploadStudioTrackAsset(slug, kind, request, env, user) {';
if (!source.includes(deleteInsertMarker)) throw new Error('TM 5.27 wrapper could not find Track delete insertion point.');
source = source.replace(deleteInsertMarker, `${deleteFunction}${deleteInsertMarker}`);

source = source.replace(
  '      const studioAssetDeleteRoute = studioAssetDeleteMatch(url.pathname);\n',
  '      const studioAssetDeleteRoute = studioAssetDeleteMatch(url.pathname);\n      const studioTrackDeleteRoute = studioTrackDeleteMatch(url.pathname);\n',
);
source = source.replace(
  '      const isStudioAssetDelete = Boolean(studioAssetDeleteRoute && request.method === "POST");\n',
  '      const isStudioAssetDelete = Boolean(studioAssetDeleteRoute && request.method === "POST");\n      const isStudioTrackDelete = Boolean(studioTrackDeleteRoute && request.method === "POST");\n',
);
source = source.replace(
  'else if (isStudioTrackCreate || isStudioAssetDelete || isStudioCatalogRebuild || isStudioSonicTraceSave) assertStudioPhase4OperationRequest(request, "json");',
  'else if (isStudioTrackCreate || isStudioAssetDelete || isStudioTrackDelete || isStudioCatalogRebuild || isStudioSonicTraceSave) assertStudioPhase4OperationRequest(request, "json");',
);
source = source.replace(
  '      if (studioAssetDeleteRoute && request.method === "POST") {\n        return withStudioCors(request, await deleteStudioTrackAsset(studioAssetDeleteRoute[1], studioAssetDeleteRoute[2], request, env, user));\n      }\n',
  '      if (studioAssetDeleteRoute && request.method === "POST") {\n        return withStudioCors(request, await deleteStudioTrackAsset(studioAssetDeleteRoute[1], studioAssetDeleteRoute[2], request, env, user));\n      }\n\n      if (studioTrackDeleteRoute && request.method === "POST") {\n        return withStudioCors(request, await deleteStudioTrack(studioTrackDeleteRoute[1], request, env, user));\n      }\n',
);

source = source.replaceAll('"track-create", "assets", "catalog-rebuild",', '"track-create", "track-delete", "assets", "catalog-rebuild",');
source = source.replaceAll('version: "5.26"', 'version: "5.27"');
source = source.replaceAll('trackManagerVersion: "5.26"', 'trackManagerVersion: "5.27"');
source = source.replaceAll('const STUDIO_BRIDGE_VERSION = "1.16";', 'const STUDIO_BRIDGE_VERSION = "1.17";');
source = source.replaceAll('v5.26', 'v5.27');

for (const required of [
  'version: "5.27"',
  'trackManagerVersion: "5.27"',
  'const STUDIO_BRIDGE_VERSION = "1.17";',
  'const STUDIO_TRACK_DELETE_INTENT = "track-delete-v1";',
  'function studioTrackDeleteMatch(pathname)',
  'async function deleteStudioTrack(slug, request, env, user)',
  'confirmTrackId',
  'TRACK_DELETE_ALBUM_OWNED',
  'buildCanonicalAlbumSummaries(albumObjects, env.MEDIA_BUCKET)',
  'whole-delete-',
  'TRACK_DELETE_ROLLBACK',
  '"track-delete"',
]) assert.ok(source.includes(required), `TM 5.27 safe Track delete missing: ${required}`);

for (const stale of ['version: "5.26"', 'trackManagerVersion: "5.26"', 'const STUDIO_BRIDGE_VERSION = "1.16";']) {
  assert.ok(!source.includes(stale), `Stale TM 5.26 marker remains in v5.27 bundle: ${stale}`);
}

fs.writeFileSync(outputPath, source, 'utf8');
const syntax = spawnSync(process.execPath, ['--check', outputPath], { stdio: 'inherit' });
if (syntax.status !== 0) process.exit(syntax.status || 1);

console.log(`Track Manager v5.27 / Studio bridge v1.17 Safe Track Delete verified: ${outputPath}`);
