import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const outputPath = process.argv[2]
  ? path.resolve(process.argv[2])
  : path.join(os.tmpdir(), 'launchpad-r2-admin-worker-v525.js');

const base = spawnSync(process.execPath, ['scripts/build-admin-worker-v524.mjs', outputPath], { stdio: 'inherit' });
if (base.status !== 0) process.exit(base.status || 1);

let source = fs.readFileSync(outputPath, 'utf8');

function functionRange(name) {
  const markers = [`async function ${name}(`, `function ${name}(`];
  const start = markers.map(marker => source.indexOf(marker)).find(index => index >= 0) ?? -1;
  if (start < 0) throw new Error(`TM 5.25 wrapper could not find ${name}.`);
  const nextAsync = source.indexOf('\nasync function ', start + 1);
  const nextFunction = source.indexOf('\nfunction ', start + 1);
  const candidates = [nextAsync, nextFunction].filter(index => index > start);
  const end = candidates.length ? Math.min(...candidates) : source.length;
  return { start, end, text: source.slice(start, end) };
}

function replaceFunction(name, transform) {
  const { start, end, text } = functionRange(name);
  const next = transform(text);
  if (next === text) throw new Error(`TM 5.25 wrapper made no change inside ${name}.`);
  source = source.slice(0, start) + next + source.slice(end);
}

for (const marker of [
  'version: "5.24"',
  'trackManagerVersion: "5.24"',
  'const STUDIO_BRIDGE_VERSION = "1.14";',
  'function normalizeAlbumManifest(input) {',
  'async function createStudioAlbum(request, env, user) {',
  'const STUDIO_ALBUM_CREATE_INTENT = "album-create-v1";',
]) {
  if (!source.includes(marker)) throw new Error(`TM 5.25 wrapper missing required v5.24 marker: ${marker}`);
}

replaceFunction('normalizeAlbumManifest', block => {
  const marker = '    createdAt: input?.createdAt || new Date().toISOString(),\n';
  if (!block.includes(marker)) throw new Error('TM 5.25 wrapper could not find Album creation evidence insertion point.');
  return block.replace(marker, `${marker}    // Private immutable Album creation evidence; absent on legacy Albums.\n    ...(typeof input?.creationOperationId === "string" ? { creationOperationId: input.creationOperationId } : {}),\n`);
});

replaceFunction('createStudioAlbum', block => {
  const payloadMarker = '  const payload = await readStudioAlbumJsonPayload(request, STUDIO_ALBUM_CREATE_INTENT);\n';
  const destructureMarker = '  const { id: _ignoredId, trackIds: _ignoredTrackIds, assets: _ignoredAssets, createdAt: _ignoredCreatedAt, updatedAt: _ignoredUpdatedAt, updatedBy: _ignoredUpdatedBy, schemaVersion: _ignoredSchemaVersion, ...metadataInput } = input;\n';
  const manifestMarker = '    ...patch,\n    id,\n';
  const verifyMarker = '    if (!reread || reread.updatedAt !== manifest.updatedAt || reread.id !== id || reread.status !== "draft") {\n      throw new Error("SAVE_VERIFY_Album créé non vérifié.");\n    }\n';
  const responseMarker = '      created: true,\n      albumId: id,\n';
  for (const marker of [payloadMarker, destructureMarker, manifestMarker, verifyMarker, responseMarker]) {
    if (!block.includes(marker)) throw new Error(`TM 5.25 wrapper could not find Album create marker: ${marker.trim()}`);
  }
  let next = block.replace(payloadMarker, `${payloadMarker}  // Optional only for old clients; never coerce, trim or regenerate supplied evidence.\n  const operationId = payload.operationId;\n  if (operationId !== undefined && (typeof operationId !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(operationId))) {\n    throw new Error("INPUT_operationId UUID v4 invalide.");\n  }\n`);
  next = next.replace(destructureMarker, '  const { id: _ignoredId, trackIds: _ignoredTrackIds, assets: _ignoredAssets, creationOperationId: _ignoredCreationOperationId, createdAt: _ignoredCreatedAt, updatedAt: _ignoredUpdatedAt, updatedBy: _ignoredUpdatedBy, schemaVersion: _ignoredSchemaVersion, ...metadataInput } = input;\n');
  next = next.replace(manifestMarker, `    ...patch,\n    ...(operationId !== undefined ? { creationOperationId: operationId } : {}),\n    id,\n`);
  next = next.replace(verifyMarker, `${verifyMarker}    if (operationId !== undefined && reread.creationOperationId !== operationId) {\n      throw new Error("SAVE_VERIFY_Identité de création Album non vérifiée.");\n    }\n`);
  next = next.replace(responseMarker, `      created: true,\n      ...(operationId !== undefined ? { operationId } : {}),\n      albumId: id,\n`);
  return next;
});

source = source.replaceAll('version: "5.24"', 'version: "5.25"');
source = source.replaceAll('trackManagerVersion: "5.24"', 'trackManagerVersion: "5.25"');
source = source.replaceAll('const STUDIO_BRIDGE_VERSION = "1.14";', 'const STUDIO_BRIDGE_VERSION = "1.15";');
source = source.replaceAll('v5.24', 'v5.25');

assert.ok(source.includes('version: "5.25"'));
assert.ok(source.includes('trackManagerVersion: "5.25"'));
assert.ok(source.includes('const STUDIO_BRIDGE_VERSION = "1.15";'));
assert.ok(source.includes('creationOperationId: operationId'));
assert.ok(source.includes('reread.creationOperationId !== operationId'));
assert.ok(source.includes('...(operationId !== undefined ? { operationId } : {})'));
for (const stale of ['version: "5.24"', 'trackManagerVersion: "5.24"', 'const STUDIO_BRIDGE_VERSION = "1.14";']) {
  assert.ok(!source.includes(stale), `Stale TM 5.24 marker remains in v5.25 bundle: ${stale}`);
}

fs.writeFileSync(outputPath, source, 'utf8');
const syntax = spawnSync(process.execPath, ['--check', outputPath], { stdio: 'inherit' });
if (syntax.status !== 0) process.exit(syntax.status || 1);

console.log(`Track Manager v5.25 / Studio bridge v1.15 Album create operation identity verified: ${outputPath}`);
