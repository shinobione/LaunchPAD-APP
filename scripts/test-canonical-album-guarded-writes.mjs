import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const writePart = [
  'cloudflare/admin-worker.parts/02c-album-write-core.part',
  'cloudflare/admin-worker.parts/02d-album-membership.part',
  'cloudflare/admin-worker.parts/02e-album-assets.part',
].map(path => fs.readFileSync(path, 'utf8')).join('\n');
const readPart = fs.readFileSync('cloudflare/admin-worker.parts/02a-album-read-model.part', 'utf8');
const projectionPart = fs.readFileSync('cloudflare/admin-worker.parts/02b-album-projection-hook.part', 'utf8');
const builder = fs.readFileSync('scripts/build-admin-worker.mjs', 'utf8');
const deployWorkflow = fs.readFileSync('.github/workflows/deploy-cloudflare.yml', 'utf8');

for (const required of [
  'const STUDIO_ALBUM_CREATE_INTENT = "album-create-v1";',
  'const STUDIO_ALBUM_METADATA_SAVE_INTENT = "album-metadata-save-v1";',
  'const STUDIO_ALBUM_MEMBERSHIP_SAVE_INTENT = "album-membership-save-v1";',
  'const STUDIO_ALBUM_TRACK_MOVE_INTENT = "album-track-move-v1";',
  'const STUDIO_ALBUM_ASSET_UPLOAD_INTENT = "album-asset-upload-v1";',
  'const STUDIO_ALBUM_ASSET_DELETE_INTENT = "album-asset-delete-v1";',
  '/api/studio/albums',
  '/metadata\\/save$/',
  '/tracks\\/save$/',
  '/tracks\\/move$/',
  '/assets\\/(cover|thumbnail)\\/upload$/',
  '/assets\\/(cover|thumbnail)\\/delete$/',
  'code = "STALE_ALBUM"',
  'ALBUM_MEMBERSHIP_CONFLICT',
  'ALBUM_QUALITY_BLOCKED',
  'writeAlbumManifest',
  'inspectCanonicalAlbumQuality',
  'rollbackAlbumManifestAndTracks',
  '_studio-backups/albums/',
  'await writeCatalogIndex(env.MEDIA_BUCKET)',
  'await readAlbumManifest(env.MEDIA_BUCKET',
  'studioAlbumSinglesCacheManifest',
  'sourceAlbumId',
  'expectedSourceUpdatedAt',
  'expectedTargetUpdatedAt',
  'trackNeedsCacheUpdate',
  'if (trackAfter)',
]) {
  assert.ok(writePart.includes(required), `Guarded Album write contract missing: ${required}`);
}

assert.ok(readPart.includes('album.trackIds') || readPart.includes('trackIds'), 'Canonical Album read model lost ordered trackIds.');
assert.ok(projectionPart.includes('buildPublishedAlbumProjection'), 'Catalog projection must still be rebuilt from canonical Albums.');
assert.ok(!writePart.includes('deleteStudioAlbum('), 'C2.5-C must not introduce whole-Album deletion.');
assert.ok(!/function\s+deleteStudioAlbum\s*\(/.test(writePart), 'Whole-Album delete function must remain absent.');
assert.ok(!writePart.includes('Phase 7'), 'C2.5-C source must not leak Phase 7 work.');
assert.ok(!writePart.includes('loudnorm'), 'C2.5-C must not touch SonicTrace C3 concerns.');

for (const required of [
  'version: "5.17"',
  '<span class="version-pill">v5.17</span>',
  'const STUDIO_BRIDGE_VERSION = "1.9";',
  'trackManagerVersion: "5.17"',
  'studioAlbumsCollectionMatch(url.pathname)',
  'studioAlbumMetadataSaveMatch(url.pathname)',
  'studioAlbumMembershipSaveMatch(url.pathname)',
  'studioAlbumTrackMoveMatch(url.pathname)',
  'studioAlbumAssetUploadMatch(url.pathname)',
  'studioAlbumAssetDeleteMatch(url.pathname)',
  'assertStudioAlbumOperationRequest(request, "json")',
  'assertStudioAlbumOperationRequest(request, "upload")',
  'await listAlbums(env)',
  'await getAlbumReadModel(studioAlbumReadRoute[1], env)',
  'await createStudioAlbum(request, env, user)',
  'await saveStudioAlbumMetadata(studioAlbumMetadataSaveRoute[1], request, env, user)',
  'await saveStudioAlbumMembership(studioAlbumMembershipSaveRoute[1], request, env, user)',
  'await moveStudioAlbumTrack(studioAlbumTrackMoveRoute[1], request, env, user)',
  'await uploadStudioAlbumAsset(studioAlbumAssetUploadRoute[1], studioAlbumAssetUploadRoute[2], request, env, user)',
  'await deleteStudioAlbumAsset(studioAlbumAssetDeleteRoute[1], studioAlbumAssetDeleteRoute[2], request, env, user)',
  'read: ["tracks", "track", "albums", "album"',
  '"album-create", "album-metadata", "album-membership", "album-move", "album-assets"',
]) {
  assert.ok(builder.includes(required), `Track Manager assembler missing Album route/version contract: ${required}`);
}

assert.ok(deployWorkflow.includes("EXPECTED_ADMIN_VERSION: '5.17'"), 'Admin deployment guard must expect Track Manager v5.17.');
assert.ok(deployWorkflow.includes("EXPECTED_PUBLIC_VERSION: '2.6'"), 'Public Worker v2.6 must remain unchanged.');
assert.ok(!deployWorkflow.includes('\n  push:'), 'Production Worker deployment must remain manual-only.');

const slugify = value => String(value || '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
  .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 120);
const normalizeColor = value => {
  const clean = String(value || '').trim();
  return /^#[0-9a-f]{6}$/i.test(clean) ? clean.toLowerCase() : null;
};
const context = vm.createContext({
  console,
  slugify,
  normalizeColor,
  STATUS_VALUES: new Set(['draft', 'published', 'archived']),
  ALBUM_TYPE_VALUES: new Set(['album', 'ep', 'collection']),
});
vm.runInContext(`${writePart}\nglobalThis.__albumWriteTests = { normalizeStudioAlbumMetadataPatch, normalizeStudioAlbumTrackIds, studioAlbumInsertAt };`, context);
const helpers = context.__albumWriteTests;

assert.deepEqual(
  JSON.parse(JSON.stringify(helpers.normalizeStudioAlbumMetadataPatch({ title: '  Ghost Signal  ', type: 'EP', status: 'draft', year: '2026', releaseDate: '2026-08-10', accent: '#AABBCC' }))),
  { title: 'Ghost Signal', type: 'ep', status: 'draft', year: 2026, releaseDate: '2026-08-10', accent: '#aabbcc' },
);
assert.deepEqual(
  JSON.parse(JSON.stringify(helpers.normalizeStudioAlbumMetadataPatch({ year: '', releaseDate: '', accent: '', accent2: null }))),
  { year: null, releaseDate: null, accent: null, accent2: null },
);
assert.throws(() => helpers.normalizeStudioAlbumMetadataPatch({ id: 'mutable-id' }), /Champs Album non autorisés/);
assert.throws(() => helpers.normalizeStudioAlbumMetadataPatch({ title: '   ' }), /titre Album est requis/);
assert.throws(() => helpers.normalizeStudioAlbumMetadataPatch({ type: 'banana' }), /Type Album invalide/);
assert.throws(() => helpers.normalizeStudioAlbumMetadataPatch({ status: 'public-ish' }), /Statut Album invalide/);
assert.throws(() => helpers.normalizeStudioAlbumMetadataPatch({ year: 'twenty' }), /Année Album invalide/);
assert.throws(() => helpers.normalizeStudioAlbumMetadataPatch({ releaseDate: 'not-a-date' }), /Date de sortie Album invalide/);
assert.throws(() => helpers.normalizeStudioAlbumMetadataPatch({ accent: 'cyan' }), /Couleur Album invalide/);
assert.deepEqual(JSON.parse(JSON.stringify(helpers.normalizeStudioAlbumTrackIds(['track-a', 'track-b']))), ['track-a', 'track-b']);
assert.throws(() => helpers.normalizeStudioAlbumTrackIds(['track-a', 'track-a']), /doublons/);
assert.throws(() => helpers.normalizeStudioAlbumTrackIds(['Track A']), /trackId canonique invalide/);
assert.deepEqual(JSON.parse(JSON.stringify(helpers.studioAlbumInsertAt(['a', 'b', 'c'], 'c', 0))), ['c', 'a', 'b']);
assert.deepEqual(JSON.parse(JSON.stringify(helpers.studioAlbumInsertAt(['a', 'b'], 'c', 99))), ['a', 'b', 'c']);

console.log('C2.5-C guarded Album writes protect immutable IDs, strict metadata inputs, stale revisions, membership conflicts, publish quality, asset rollback, reorder revision stability and manual deployment boundaries.');
