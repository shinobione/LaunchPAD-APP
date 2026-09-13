import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const outputPath = process.argv[2]
  ? path.resolve(process.argv[2])
  : path.join(os.tmpdir(), 'launchpad-r2-admin-worker-v526.js');

const base = spawnSync(process.execPath, ['scripts/build-admin-worker-v525.mjs', outputPath], { stdio: 'inherit' });
if (base.status !== 0) process.exit(base.status || 1);

let source = fs.readFileSync(outputPath, 'utf8');

for (const marker of [
  'version: "5.25"',
  'trackManagerVersion: "5.25"',
  'const STUDIO_BRIDGE_VERSION = "1.15";',
  'const STUDIO_ALBUM_ASSET_DELETE_INTENT = "album-asset-delete-v1";',
  'function studioAlbumAssetDeleteMatch(pathname) {',
  'const studioAlbumAssetDeleteRoute = studioAlbumAssetDeleteMatch(url.pathname);',
  'const isStudioAlbumAssetDelete = Boolean(studioAlbumAssetDeleteRoute && request.method === "POST");',
  'await deleteStudioAlbumAsset(studioAlbumAssetDeleteRoute[1], studioAlbumAssetDeleteRoute[2], request, env, user)',
]) {
  if (!source.includes(marker)) throw new Error(`TM 5.26 wrapper missing required v5.25 marker: ${marker}`);
}

source = source.replace(
  'const STUDIO_ALBUM_ASSET_DELETE_INTENT = "album-asset-delete-v1";\n',
  'const STUDIO_ALBUM_ASSET_DELETE_INTENT = "album-asset-delete-v1";\nconst STUDIO_ALBUM_DELETE_INTENT = "album-delete-v1";\n',
);

source = source.replace(
  'function studioAlbumAssetDeleteMatch(pathname) {\n  return String(pathname || "").match(/^\\/api\\/studio\\/albums\\/([a-z0-9][a-z0-9-]{0,119})\\/assets\\/(cover|thumbnail)\\/delete$/);\n}\n',
  'function studioAlbumAssetDeleteMatch(pathname) {\n  return String(pathname || "").match(/^\\/api\\/studio\\/albums\\/([a-z0-9][a-z0-9-]{0,119})\\/assets\\/(cover|thumbnail)\\/delete$/);\n}\n\nfunction studioAlbumDeleteMatch(pathname) {\n  return String(pathname || "").match(/^\\/api\\/studio\\/albums\\/([a-z0-9][a-z0-9-]{0,119})\\/delete$/);\n}\n',
);

const deleteFunction = `
async function deleteStudioAlbum(albumId, request, env, user) {
  const payload = await readStudioAlbumJsonPayload(request, STUDIO_ALBUM_DELETE_INTENT);
  const existing = await readAlbumManifest(env.MEDIA_BUCKET, albumId);
  if (!existing) return jsonResponse({ ok: false, error: "Album introuvable.", code: "ALBUM_NOT_FOUND", albumId }, 404);
  const stale = studioAlbumStaleResponse(existing, payload.expectedUpdatedAt, "STALE_ALBUM_DELETE");
  if (stale) return stale;
  if (String(payload.confirmAlbumId || "") !== albumId) throw new Error("INPUT_confirmAlbumId doit correspondre exactement à l'Album supprimé.");

  const scoped = await listAllObjects(env.MEDIA_BUCKET, albumPrefix(albumId));
  const backupToken = crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + "-" + Math.random().toString(16).slice(2);
  const backupPrefix = \`_studio-backups/albums/\${albumId}/whole-delete-\${backupToken}/\`;
  const backups = [];
  const trackEntries = [];

  for (const trackId of existing.trackIds) {
    const track = await readManifest(env.MEDIA_BUCKET, trackId);
    if (!track) continue;
    trackEntries.push({ id: trackId, before: track, after: studioAlbumSinglesCacheManifest(track, user) });
  }

  let tracksWritten = 0;
  let objectsDeleted = 0;
  try {
    for (const listed of scoped) {
      const object = await env.MEDIA_BUCKET.get(listed.key);
      if (!object) throw new Error("SAVE_VERIFY_Objet Album disparu avant backup.");
      const relative = listed.key.slice(albumPrefix(albumId).length);
      const backupKey = backupPrefix + relative;
      await studioBackupObject(env.MEDIA_BUCKET, object, backupKey);
      backups.push({ backupKey, targetKey: listed.key });
    }

    for (const entry of trackEntries) {
      await writeManifest(env.MEDIA_BUCKET, entry.after);
      tracksWritten += 1;
    }

    for (const listed of scoped) {
      await env.MEDIA_BUCKET.delete(listed.key);
      objectsDeleted += 1;
    }

    const index = await writeCatalogIndex(env.MEDIA_BUCKET);
    const [reread, remaining] = await Promise.all([
      readAlbumManifest(env.MEDIA_BUCKET, albumId),
      listAllObjects(env.MEDIA_BUCKET, albumPrefix(albumId)),
    ]);
    if (reread || remaining.length) throw new Error("SAVE_VERIFY_Suppression Album non vérifiée.");

    for (const entry of trackEntries) {
      const track = await readManifest(env.MEDIA_BUCKET, entry.id);
      if (!track || track.album?.id !== "singles") throw new Error("SAVE_VERIFY_Cache Track après suppression Album non vérifié.");
    }

    for (const backup of backups) await studioDeleteBackup(env.MEDIA_BUCKET, backup.backupKey);
    return jsonResponse({
      ok: true,
      deleted: true,
      albumId,
      previousUpdatedAt: existing.updatedAt || null,
      tracksReleased: trackEntries.length,
      objectsDeleted,
      catalogRebuilt: true,
      catalogGeneratedAt: index.generatedAt || null,
      albumCount: index.albumCount || 0,
      authenticatedEmail: user.email || null,
    });
  } catch (error) {
    const rollback = {
      albumObjectsRestored: backups.length === 0,
      tracksRestored: tracksWritten === 0,
      catalogRestored: false,
      backupsRemoved: false,
    };

    if (backups.length) {
      let restored = true;
      for (const backup of backups) {
        try { await studioRestoreBackup(env.MEDIA_BUCKET, backup.backupKey, backup.targetKey); }
        catch (rollbackError) { restored = false; console.error("Album whole-delete object rollback failed", backup.targetKey, rollbackError); }
      }
      rollback.albumObjectsRestored = restored;
    }

    if (tracksWritten) {
      let restored = true;
      for (const entry of trackEntries.slice(0, tracksWritten)) {
        try { await writeManifest(env.MEDIA_BUCKET, entry.before); }
        catch (rollbackError) { restored = false; console.error("Album whole-delete Track rollback failed", entry.id, rollbackError); }
      }
      rollback.tracksRestored = restored;
    }

    if (rollback.albumObjectsRestored && rollback.tracksRestored) {
      try { await writeCatalogIndex(env.MEDIA_BUCKET); rollback.catalogRestored = true; }
      catch (rollbackError) { console.error("Album whole-delete catalog rollback failed", rollbackError); }
    }

    for (const backup of backups) await studioDeleteBackup(env.MEDIA_BUCKET, backup.backupKey);
    rollback.backupsRemoved = true;
    console.error("Album whole-delete failed", error);
    return jsonResponse({
      ok: false,
      error: "Suppression Album annulée après échec de publication ou vérification.",
      code: "ALBUM_DELETE_ROLLBACK",
      rollback,
      currentUpdatedAt: existing.updatedAt || null,
    }, 500);
  }
}
`;

const deleteInsertMarker = '\nasync function saveStudioAlbumMetadata(albumId, request, env, user) {';
if (!source.includes(deleteInsertMarker)) throw new Error('TM 5.26 wrapper could not find Album delete insertion point.');
source = source.replace(deleteInsertMarker, `${deleteFunction}${deleteInsertMarker}`);

source = source.replace(
  '      const studioAlbumAssetDeleteRoute = studioAlbumAssetDeleteMatch(url.pathname);\n',
  '      const studioAlbumAssetDeleteRoute = studioAlbumAssetDeleteMatch(url.pathname);\n      const studioAlbumDeleteRoute = studioAlbumDeleteMatch(url.pathname);\n',
);
source = source.replace(
  '      const isStudioAlbumAssetDelete = Boolean(studioAlbumAssetDeleteRoute && request.method === "POST");\n',
  '      const isStudioAlbumAssetDelete = Boolean(studioAlbumAssetDeleteRoute && request.method === "POST");\n      const isStudioAlbumDelete = Boolean(studioAlbumDeleteRoute && request.method === "POST");\n',
);
source = source.replace(
  'else if (isStudioAlbumCreate || isStudioAlbumMetadataSave || isStudioAlbumMembershipSave || isStudioAlbumTrackMove || isStudioAlbumAssetDelete) assertStudioAlbumOperationRequest(request, "json");',
  'else if (isStudioAlbumCreate || isStudioAlbumMetadataSave || isStudioAlbumMembershipSave || isStudioAlbumTrackMove || isStudioAlbumAssetDelete || isStudioAlbumDelete) assertStudioAlbumOperationRequest(request, "json");',
);
source = source.replace(
  '      if (studioAlbumAssetDeleteRoute && request.method === "POST") {\n        return withStudioCors(request, await deleteStudioAlbumAsset(studioAlbumAssetDeleteRoute[1], studioAlbumAssetDeleteRoute[2], request, env, user));\n      }\n',
  '      if (studioAlbumAssetDeleteRoute && request.method === "POST") {\n        return withStudioCors(request, await deleteStudioAlbumAsset(studioAlbumAssetDeleteRoute[1], studioAlbumAssetDeleteRoute[2], request, env, user));\n      }\n\n      if (studioAlbumDeleteRoute && request.method === "POST") {\n        return withStudioCors(request, await deleteStudioAlbum(studioAlbumDeleteRoute[1], request, env, user));\n      }\n',
);

source = source.replaceAll('"album-create", "album-metadata", "album-membership", "album-move", "album-assets"', '"album-create", "album-metadata", "album-membership", "album-move", "album-assets", "album-delete"');
source = source.replaceAll('version: "5.25"', 'version: "5.26"');
source = source.replaceAll('trackManagerVersion: "5.25"', 'trackManagerVersion: "5.26"');
source = source.replaceAll('const STUDIO_BRIDGE_VERSION = "1.15";', 'const STUDIO_BRIDGE_VERSION = "1.16";');
source = source.replaceAll('v5.25', 'v5.26');

for (const required of [
  'version: "5.26"',
  'trackManagerVersion: "5.26"',
  'const STUDIO_BRIDGE_VERSION = "1.16";',
  'const STUDIO_ALBUM_DELETE_INTENT = "album-delete-v1";',
  'function studioAlbumDeleteMatch(pathname)',
  'async function deleteStudioAlbum(albumId, request, env, user)',
  'confirmAlbumId',
  'whole-delete-',
  'track.album?.id !== "singles"',
  'ALBUM_DELETE_ROLLBACK',
  '"album-delete"',
]) assert.ok(source.includes(required), `TM 5.26 safe Album delete missing: ${required}`);

for (const stale of ['version: "5.25"', 'trackManagerVersion: "5.25"', 'const STUDIO_BRIDGE_VERSION = "1.15";']) {
  assert.ok(!source.includes(stale), `Stale TM 5.25 marker remains in v5.26 bundle: ${stale}`);
}

fs.writeFileSync(outputPath, source, 'utf8');
const syntax = spawnSync(process.execPath, ['--check', outputPath], { stdio: 'inherit' });
if (syntax.status !== 0) process.exit(syntax.status || 1);

console.log(`Track Manager v5.26 / Studio bridge v1.16 Safe Album Delete verified: ${outputPath}`);
