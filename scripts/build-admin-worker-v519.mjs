import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import { spawnSync } from 'node:child_process';

const outputPath = process.argv[2]
  ? path.resolve(process.argv[2])
  : path.join(os.tmpdir(), 'launchpad-r2-admin-worker-v519.js');

const base = spawnSync(process.execPath, ['scripts/build-admin-worker-v518.mjs', outputPath], { stdio: 'inherit' });
if (base.status !== 0) process.exit(base.status || 1);

let source = fs.readFileSync(outputPath, 'utf8');
const requiredMarkers = [
  'version: "5.18"',
  'trackManagerVersion: "5.18"',
  'const STUDIO_BRIDGE_VERSION = "1.10";',
  'STUDIO_ALBUM_MIGRATION_EDGE_REDIRECT_MODE = "manual"',
  'importStudioAlbumMigrationCoverEdgeSafe',
  'response.status >= 300 && response.status < 400',
];
for (const marker of requiredMarkers) {
  if (!source.includes(marker)) throw new Error(`C2.5-E4 v5.19 wrapper could not find required marker: ${marker}`);
}

source = source.replaceAll('version: "5.18"', 'version: "5.19"');
source = source.replaceAll('v5.18', 'v5.19');
source = source.replaceAll('trackManagerVersion: "5.18"', 'trackManagerVersion: "5.19"');
source = source.replace('const STUDIO_BRIDGE_VERSION = "1.10";', 'const STUDIO_BRIDGE_VERSION = "1.11";');

for (const forbidden of [
  'version: "5.18"',
  'trackManagerVersion: "5.18"',
  'const STUDIO_BRIDGE_VERSION = "1.10";',
]) {
  if (source.includes(forbidden)) throw new Error(`Stale v5.18 contract marker remains in TM 5.19 bundle: ${forbidden}`);
}
for (const required of [
  'version: "5.19"',
  'trackManagerVersion: "5.19"',
  'const STUDIO_BRIDGE_VERSION = "1.11";',
  '"album-migration"',
  'STUDIO_ALBUM_MIGRATION_EDGE_REDIRECT_MODE = "manual"',
  'importStudioAlbumMigrationCoverEdgeSafe',
]) {
  if (!source.includes(required)) throw new Error(`TM 5.19 bundle is missing: ${required}`);
}

fs.writeFileSync(outputPath, source, 'utf8');
const syntax = spawnSync(process.execPath, ['--check', outputPath], { stdio: 'inherit' });
if (syntax.status !== 0) process.exit(syntax.status || 1);

const embeddedScript = source.match(/<script>([\s\S]*?)<\/script>/)?.[1];
if (!embeddedScript) throw new Error('TM 5.19 bundle is missing its embedded UI script.');
new vm.Script(embeddedScript, { filename: 'track-manager-ui-v519.js' });

console.log(`Track Manager v5.19 / Studio bridge v1.11 edge-safe Album migration bundle verified: ${outputPath}`);
