import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const read = file => fs.readFileSync(file, 'utf8');
const hotfix = read('cloudflare/admin-worker.parts/03-z7-album-migration-edge-fetch-hotfix.part');
const wrapper = read('scripts/build-admin-worker-v519.mjs');

assert.ok(hotfix.includes('STUDIO_ALBUM_MIGRATION_EDGE_REDIRECT_MODE = "manual"'), 'E4 must use Cloudflare-supported redirect=manual.');
assert.ok(hotfix.includes('response.status >= 300 && response.status < 400'), 'E4 must reject redirects instead of following them.');
assert.ok(hotfix.includes('raw.githubusercontent.com'), 'E4 must retain the pinned GitHub host allow-list.');
assert.ok(hotfix.includes('STUDIO_ALBUM_MIGRATION_SOURCE_REF'), 'E4 must retain immutable source-ref validation.');
assert.ok(!hotfix.includes('redirect: "error"'), 'E4 hotfix must never use unsupported redirect=error.');
assert.ok(wrapper.includes("'scripts/build-admin-worker-v518.mjs'"), 'v5.19 must inherit the already-validated v5.18 bundle.');
assert.ok(wrapper.includes('trackManagerVersion: "5.19"'));
assert.ok(wrapper.includes('const STUDIO_BRIDGE_VERSION = "1.11";'));

const output = path.join(os.tmpdir(), `launchpad-r2-admin-worker-v519-test-${process.pid}.js`);
const build = spawnSync(process.execPath, ['scripts/build-admin-worker-v519.mjs', output], { encoding: 'utf8' });
if (build.status !== 0) throw new Error(`TM 5.19 build failed:\n${build.stdout}\n${build.stderr}`);
const bundle = read(output);
assert.ok(bundle.includes('STUDIO_ALBUM_MIGRATION_EDGE_REDIRECT_MODE = "manual"'));
assert.ok(bundle.includes('importStudioAlbumMigrationCoverEdgeSafe'));
assert.ok(bundle.includes('trackManagerVersion: "5.19"'));
assert.ok(bundle.includes('const STUDIO_BRIDGE_VERSION = "1.11";'));
fs.rmSync(output, { force: true });

console.log('C2.5-E4 guards the Cloudflare edge redirect hotfix while preserving pinned cover sources and the one-Album migration contract.');
