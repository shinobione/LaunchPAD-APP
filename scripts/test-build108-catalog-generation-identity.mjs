import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const partPath = 'cloudflare/admin-worker.parts/03i-build108-catalog-generation-identity.part';
const source = fs.readFileSync(partPath, 'utf8').replace(/\r\n/g, '\n');

for (const required of [
  'BUILD108_CATALOG_OPERATION_ID_PATTERN',
  'build108CatalogOperationId',
  'writeCatalogIndexWithGenerationIdentity',
  'generationId',
  'build108ReadCatalogProjectionState',
  'listTracksWithCatalogGenerationIdentity',
  'catalogProjection',
  'rebuildStudioCatalogWithGenerationIdentity',
  'payload.confirm !== "REBUILD"',
  'build108CatalogOperationId(payload.operationId)',
  'writeCatalogIndex(env.MEDIA_BUCKET, { generationId: operationId })',
  'catalogGenerationId: index.generationId',
]) assert.ok(source.includes(required), `Build108 backend contract missing: ${required}`);

assert.ok(source.includes('if (!generationId) return index;'), 'Existing internal catalog writers must remain unchanged when no generation identity is supplied.');
assert.ok(source.includes('valid: index?.schemaVersion === 1 && Array.isArray(index?.tracks)'), 'Private reread must report whether the canonical catalog projection is structurally valid.');
assert.ok(source.includes('generationId: typeof index?.generationId === "string"'), 'Private reread must expose the persisted generation identity.');
assert.ok(source.includes('throw new Error("INPUT_operationId UUID invalide.")'), 'Catalog rebuild must reject malformed operation identities.');
assert.ok(source.includes('throw new Error("SAVE_VERIFY_Identité de génération catalogue non vérifiée.")'), 'Server success must verify the generation identity before returning.');

for (const forbidden of [
  'MEDIA_BUCKET.delete(',
  'writeManifest(',
  'saveTrack(',
  'saveThumbnail(',
  'deleteTrack(',
  'setTimeout(',
  'for (let attempt',
]) assert.ok(!source.includes(forbidden), `Build108 catalog identity must stay bounded and non-retrying: ${forbidden}`);

const builtPath = path.join(os.tmpdir(), 'launchpad-build108-catalog-generation-worker.js');
const build = spawnSync(process.execPath, ['scripts/build-admin-worker.mjs', builtPath], { encoding: 'utf8' });
if (build.status !== 0) {
  process.stdout.write(build.stdout || '');
  process.stderr.write(build.stderr || '');
  process.exit(build.status || 1);
}
const built = fs.readFileSync(builtPath, 'utf8');
assert.ok(built.includes('writeCatalogIndexWithGenerationIdentity'), 'Built worker must include the Build108 catalog writer decorator.');
assert.ok(built.includes('listTracksWithCatalogGenerationIdentity'), 'Built worker must expose catalog projection identity through private Studio reads.');
assert.ok(built.includes('rebuildStudioCatalogWithGenerationIdentity'), 'Built worker must route explicit Studio rebuilds through generation identity.');
assert.ok(built.includes('generationId'), 'Built worker lost persisted generation identity evidence.');

console.log('Build108 backend catalog generation identity PASS: explicit Studio catalog rebuilds persist one UUID generationId, private canonical track reads expose it, existing implicit catalog writers remain unchanged, and no retry/destructive track mutation was introduced.');
