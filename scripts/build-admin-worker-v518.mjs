import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import { spawnSync } from 'node:child_process';

const outputPath = process.argv[2]
  ? path.resolve(process.argv[2])
  : path.join(os.tmpdir(), 'launchpad-r2-admin-worker-v518.js');

const base = spawnSync(process.execPath, ['scripts/build-admin-worker.mjs', outputPath], { stdio: 'inherit' });
if (base.status !== 0) process.exit(base.status || 1);

let source = fs.readFileSync(outputPath, 'utf8');
const requiredMarkers = [
  'version: "5.17"',
  'trackManagerVersion: "5.17"',
  'const STUDIO_BRIDGE_VERSION = "1.9";',
  '"album-assets"]',
  'STUDIO_ALBUM_MIGRATION_APPLY_INTENT',
];
for (const marker of requiredMarkers) {
  if (!source.includes(marker)) throw new Error(`C2.5-E build wrapper could not find required marker: ${marker}`);
}

source = source.replaceAll('version: "5.17"', 'version: "5.18"');
source = source.replaceAll('v5.17', 'v5.18');
source = source.replaceAll('trackManagerVersion: "5.17"', 'trackManagerVersion: "5.18"');
source = source.replace('const STUDIO_BRIDGE_VERSION = "1.9";', 'const STUDIO_BRIDGE_VERSION = "1.10";');
source = source.replace(
  'manage: ["track-create", "assets", "catalog-rebuild", "album-create", "album-metadata", "album-membership", "album-move", "album-assets"]',
  'manage: ["track-create", "assets", "catalog-rebuild", "album-create", "album-metadata", "album-membership", "album-move", "album-assets", "album-migration"]',
);

for (const forbidden of [
  'version: "5.17"',
  'trackManagerVersion: "5.17"',
  'const STUDIO_BRIDGE_VERSION = "1.9";',
]) {
  if (source.includes(forbidden)) throw new Error(`Stale C2.5-C marker remains in TM 5.18 bundle: ${forbidden}`);
}
for (const required of [
  'version: "5.18"',
  'trackManagerVersion: "5.18"',
  'const STUDIO_BRIDGE_VERSION = "1.10";',
  '"album-migration"',
  'STUDIO_ALBUM_MIGRATION_APPLY_INTENT',
  'buildStudioLegacyAlbumMigrationDryRun',
]) {
  if (!source.includes(required)) throw new Error(`TM 5.18 bundle is missing: ${required}`);
}

fs.writeFileSync(outputPath, source, 'utf8');
const syntax = spawnSync(process.execPath, ['--check', outputPath], { stdio: 'inherit' });
if (syntax.status !== 0) process.exit(syntax.status || 1);

const embeddedScript = source.match(/<script>([\s\S]*?)<\/script>/)?.[1];
if (!embeddedScript) throw new Error('TM 5.18 bundle is missing its embedded UI script.');
new vm.Script(embeddedScript, { filename: 'track-manager-ui-v518.js' });

console.log(`Track Manager v5.18 / Studio bridge v1.10 bundle verified: ${outputPath}`);
