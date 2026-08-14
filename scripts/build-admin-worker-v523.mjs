import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import { spawnSync } from 'node:child_process';

const outputPath = process.argv[2]
  ? path.resolve(process.argv[2])
  : path.join(os.tmpdir(), 'launchpad-r2-admin-worker-v523.js');

const base = spawnSync(process.execPath, ['scripts/build-admin-worker-v522.mjs', outputPath], { stdio: 'inherit' });
if (base.status !== 0) process.exit(base.status || 1);

let source = fs.readFileSync(outputPath, 'utf8');

function replaceOnce(marker, replacement, label) {
  if (!source.includes(marker)) throw new Error(`TM 5.23 wrapper could not find ${label}.`);
  source = source.replace(marker, replacement);
}

for (const marker of [
  'version: "5.22"',
  'trackManagerVersion: "5.22"',
  'const STUDIO_BRIDGE_VERSION = "1.12";',
  'async function saveStudioAlbumMetadata(albumId, request, env, user) {',
  'throw new Error("SAVE_VERIFY_Métadonnées Album non vérifiées.");',
  'code: "ALBUM_METADATA_ROLLBACK"',
]) {
  if (!source.includes(marker)) throw new Error(`TM 5.23 wrapper could not find required v5.22 marker: ${marker}`);
}

const albumMetadataTruthHelper = `function studioAlbumMetadataRereadMismatch(proposed, reread) {\n  if (!reread) return ["manifest"];\n  const fields = ["title", "type", "status", "year", "releaseDate", "description", "heading", "accent", "accent2"];\n  return fields.filter(field => JSON.stringify(reread[field] ?? null) !== JSON.stringify(proposed[field] ?? null));\n}\n\n`;
replaceOnce(
  'async function saveStudioAlbumMetadata(albumId, request, env, user) {',
  `${albumMetadataTruthHelper}async function saveStudioAlbumMetadata(albumId, request, env, user) {`,
  'Album metadata save insertion point',
);

const oldVerification = `    const reread = await readAlbumManifest(env.MEDIA_BUCKET, albumId);\n    if (!reread || reread.updatedAt !== proposed.updatedAt || reread.id !== existing.id || reread.title !== proposed.title) {\n      throw new Error("SAVE_VERIFY_Métadonnées Album non vérifiées.");\n    }`;
const newVerification = `    const reread = await readAlbumManifest(env.MEDIA_BUCKET, albumId);\n    const metadataMismatch = studioAlbumMetadataRereadMismatch(proposed, reread);\n    if (!reread || reread.updatedAt !== proposed.updatedAt || reread.id !== existing.id || metadataMismatch.length > 0) {\n      const detail = metadataMismatch.length > 0\n        ? metadataMismatch.map(field => field + " requested=" + JSON.stringify(proposed[field] ?? null) + " canonical=" + JSON.stringify(reread?.[field] ?? null)).join("; ")\n        : "revision/id mismatch";\n      throw new Error("SAVE_VERIFY_Métadonnées Album non vérifiées: " + detail + ".");\n    }`;
replaceOnce(oldVerification, newVerification, 'Album metadata canonical reread verification');

const oldRollback = 'return jsonResponse({ ok: false, error: "Sauvegarde Album annulée après échec de publication ou vérification.", code: "ALBUM_METADATA_ROLLBACK", rollback, currentUpdatedAt: existing.updatedAt || null }, 500);';
const newRollback = 'return jsonResponse({ ok: false, error: "Sauvegarde Album annulée après échec de publication ou vérification.", code: "ALBUM_METADATA_ROLLBACK", verificationDetail: error instanceof Error ? error.message : String(error), rollback, currentUpdatedAt: existing.updatedAt || null }, 500);';
replaceOnce(oldRollback, newRollback, 'Album metadata rollback response detail');

source = source.replaceAll('version: "5.22"', 'version: "5.23"');
source = source.replaceAll('trackManagerVersion: "5.22"', 'trackManagerVersion: "5.23"');
source = source.replaceAll('const STUDIO_BRIDGE_VERSION = "1.12";', 'const STUDIO_BRIDGE_VERSION = "1.13";');
source = source.replaceAll('v5.22', 'v5.23');

for (const required of [
  'version: "5.23"',
  'trackManagerVersion: "5.23"',
  'const STUDIO_BRIDGE_VERSION = "1.13";',
  'function studioAlbumMetadataRereadMismatch(proposed, reread)',
  'metadataMismatch = studioAlbumMetadataRereadMismatch(proposed, reread)',
  'requested=',
  'canonical=',
  'verificationDetail:',
  'ALBUM_QUALITY_BLOCKED',
]) assert.ok(source.includes(required), `TM 5.23 bundle missing Album publish truth contract: ${required}`);

for (const forbidden of ['version: "5.22"', 'trackManagerVersion: "5.22"', 'const STUDIO_BRIDGE_VERSION = "1.12";']) {
  assert.ok(!source.includes(forbidden), `Stale TM 5.22 marker remains: ${forbidden}`);
}

fs.writeFileSync(outputPath, source, 'utf8');
const syntax = spawnSync(process.execPath, ['--check', outputPath], { stdio: 'inherit' });
if (syntax.status !== 0) process.exit(syntax.status || 1);

const helperMatch = source.match(/function studioAlbumMetadataRereadMismatch\(proposed, reread\) \{[\s\S]*?\n\}/);
if (!helperMatch) throw new Error('TM 5.23 bundle is missing isolated Album metadata reread helper.');
const helperContext = {};
vm.createContext(helperContext);
vm.runInContext(`${helperMatch[0]}\nglobalThis.__albumMismatch = studioAlbumMetadataRereadMismatch;`, helperContext);
const mismatch = Array.from(helperContext.__albumMismatch(
  { title: 'Pulse Dominion', status: 'published', year: 2026 },
  { title: 'Pulse Dominion', status: 'draft', year: 2026 },
));
assert.deepEqual(mismatch, ['status']);
assert.deepEqual(Array.from(helperContext.__albumMismatch(
  { title: 'Pulse Dominion', status: 'published', year: 2026 },
  { title: 'Pulse Dominion', status: 'published', year: 2026 },
)), []);

console.log(`Track Manager v5.23 / Studio bridge v1.13 Album publish truth verified: ${outputPath}`);
