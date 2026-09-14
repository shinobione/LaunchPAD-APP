import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const outputPath = process.argv[2]
  ? path.resolve(process.argv[2])
  : path.join(os.tmpdir(), 'launchpad-r2-admin-worker-v528.js');

const base = spawnSync(process.execPath, ['scripts/build-admin-worker-v527.mjs', outputPath], { stdio: 'inherit' });
if (base.status !== 0) process.exit(base.status || 1);

let source = fs.readFileSync(outputPath, 'utf8');

for (const marker of [
  'version: "5.27"',
  'trackManagerVersion: "5.27"',
  'const STUDIO_BRIDGE_VERSION = "1.17";',
  'async function uploadStudioTrackAsset(slug, kind, request, env, user)',
  'if (formData.get("intent") !== STUDIO_ASSET_UPLOAD_INTENT)',
  'studioIntent: STUDIO_ASSET_UPLOAD_INTENT,',
  'etag: studioLyricsObjectEtag(rereadObject),',
  'function assetStateFromObjects(objects, manifest)',
  'etag: object?.etag || null,',
]) {
  if (!source.includes(marker)) throw new Error(`TM 5.28 wrapper missing required v5.27 marker: ${marker}`);
}

source = source.replace(
  '  if (formData.get("intent") !== STUDIO_ASSET_UPLOAD_INTENT) throw new Error("AUTH_Intention Studio invalide.");\n  const manifest = await readManifest(env.MEDIA_BUCKET, slug);',
  '  if (formData.get("intent") !== STUDIO_ASSET_UPLOAD_INTENT) throw new Error("AUTH_Intention Studio invalide.");\n  const requestedSha256Raw = formData.get("sha256");\n  const requestedSha256 = requestedSha256Raw == null ? null : String(requestedSha256Raw).trim().toLowerCase();\n  if (requestedSha256 !== null && !/^[0-9a-f]{64}$/.test(requestedSha256)) throw new Error("INPUT_sha256 doit être un digest SHA-256 hexadécimal de 64 caractères.");\n  const manifest = await readManifest(env.MEDIA_BUCKET, slug);',
);

source = source.replace(
  '        studioIntent: STUDIO_ASSET_UPLOAD_INTENT,\n      },',
  '        studioIntent: STUDIO_ASSET_UPLOAD_INTENT,\n        ...(requestedSha256 ? { sha256: requestedSha256 } : {}),\n      },',
);

source = source.replace(
  '    if (!rereadManifest || rereadManifest.updatedAt !== nextManifest.updatedAt || rereadManifest.assets?.[kind] !== filename || !rereadObject) {\n      throw new Error("SAVE_VERIFY_Asset ou manifest relu non vérifié.");\n    }',
  '    if (!rereadManifest || rereadManifest.updatedAt !== nextManifest.updatedAt || rereadManifest.assets?.[kind] !== filename || !rereadObject || (requestedSha256 && rereadObject.customMetadata?.sha256 !== requestedSha256)) {\n      throw new Error("SAVE_VERIFY_Asset, manifest ou SHA-256 relu non vérifié.");\n    }',
);

source = source.replace(
  '      etag: studioLyricsObjectEtag(rereadObject),\n      previousUpdatedAt:',
  '      etag: studioLyricsObjectEtag(rereadObject),\n      sha256: rereadObject.customMetadata?.sha256 || null,\n      previousUpdatedAt:',
);

source = source.replace(
  '      etag: object?.etag || null,\n      uploaded: object?.uploaded?.toISOString?.() || null,',
  '      etag: object?.etag || null,\n      sha256: object?.customMetadata?.sha256 || null,\n      uploaded: object?.uploaded?.toISOString?.() || null,',
);

source = source.replaceAll('version: "5.27"', 'version: "5.28"');
source = source.replaceAll('trackManagerVersion: "5.27"', 'trackManagerVersion: "5.28"');
source = source.replaceAll('const STUDIO_BRIDGE_VERSION = "1.17";', 'const STUDIO_BRIDGE_VERSION = "1.18";');
source = source.replaceAll('v5.27', 'v5.28');

for (const required of [
  'version: "5.28"',
  'trackManagerVersion: "5.28"',
  'const STUDIO_BRIDGE_VERSION = "1.18";',
  'const requestedSha256Raw = formData.get("sha256");',
  '/^[0-9a-f]{64}$/.test(requestedSha256)',
  '...(requestedSha256 ? { sha256: requestedSha256 } : {})',
  'rereadObject.customMetadata?.sha256 !== requestedSha256',
  'sha256: rereadObject.customMetadata?.sha256 || null',
  'sha256: object?.customMetadata?.sha256 || null',
]) assert.ok(source.includes(required), `TM 5.28 Track asset SHA-256 proof missing: ${required}`);

for (const stale of ['version: "5.27"', 'trackManagerVersion: "5.27"', 'const STUDIO_BRIDGE_VERSION = "1.17";']) {
  assert.ok(!source.includes(stale), `Stale TM 5.27 marker remains in v5.28 bundle: ${stale}`);
}

fs.writeFileSync(outputPath, source, 'utf8');
const syntax = spawnSync(process.execPath, ['--check', outputPath], { stdio: 'inherit' });
if (syntax.status !== 0) process.exit(syntax.status || 1);

console.log(`Track Manager v5.28 / Studio bridge v1.18 Track asset SHA-256 proof verified: ${outputPath}`);
