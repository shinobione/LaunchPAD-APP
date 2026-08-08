import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const runtimePath = 'cloudflare/admin-worker.parts/01-runtime.part';
const runtime = fs.readFileSync(runtimePath, 'utf8');
const builtPath = path.join(os.tmpdir(), 'launchpad-studio-bridge-test-worker.js');

const build = spawnSync(process.execPath, ['scripts/build-admin-worker.mjs', builtPath], {
  encoding: 'utf8',
});
if (build.status !== 0) {
  process.stdout.write(build.stdout || '');
  process.stderr.write(build.stderr || '');
  process.exit(build.status || 1);
}

const built = fs.readFileSync(builtPath, 'utf8');

assert.ok(runtime.includes('const STUDIO_ALLOWED_ORIGIN = "https://shinobione.github.io";'), 'Studio bridge origin must be exact.');
assert.ok(runtime.includes('const STUDIO_BRIDGE_VERSION = "1.0";'), 'Studio bridge contract version missing.');
assert.ok(runtime.includes('"Access-Control-Allow-Methods": "GET, OPTIONS"'), 'Studio CORS must remain GET/OPTIONS only.');
assert.ok(runtime.includes('write: []'), 'Studio health contract must explicitly expose no write capability.');

for (const route of [
  'url.pathname === "/api/studio/health"',
  'url.pathname === "/api/studio/tracks"',
  '/^\\/api\\/studio\\/tracks\\/([a-z0-9][a-z0-9-]{0,119})$/'
]) {
  assert.ok(runtime.includes(route), `Missing Studio read route: ${route}`);
}

assert.ok(
  runtime.includes('if (["POST", "PUT", "PATCH", "DELETE"].includes(request.method)) {\n        enforceSameOrigin(request, url);\n      }'),
  'Legacy write methods must remain protected by enforceSameOrigin().'
);

assert.ok(
  !/request\.method\s*===\s*["'](?:POST|PUT|PATCH|DELETE)["'][\s\S]{0,180}\/api\/studio\//.test(runtime),
  'Studio namespace must not expose write routes.'
);
assert.ok(
  !/\/api\/studio\/[\s\S]{0,180}request\.method\s*===\s*["'](?:POST|PUT|PATCH|DELETE)["']/.test(runtime),
  'Studio namespace must not be paired with write methods.'
);

const authIndex = runtime.indexOf('const user = await verifyAccessJwt(request, env);');
const dataRouteIndex = runtime.indexOf('url.pathname === "/api/studio/health"');
assert.ok(authIndex >= 0 && dataRouteIndex > authIndex, 'Studio data GET routes must remain behind Cloudflare Access JWT verification.');

const optionsIndex = runtime.indexOf('request.method === "OPTIONS" && url.pathname.startsWith("/api/studio/")');
assert.ok(optionsIndex >= 0 && optionsIndex < authIndex, 'CORS preflight must be handled before Access JWT verification.');

assert.ok(built.includes('version: "5.8"'), 'Built Track Manager contract must be v5.8.');
assert.ok(built.includes('trackManagerVersion: "5.8"'), 'Studio bridge must report Track Manager v5.8.');
assert.ok(built.includes('Access-Control-Allow-Origin'), 'Built worker lost Studio CORS headers.');

console.log('Studio private read bridge guard passed: exact origin, Access-authenticated GETs, no cross-origin writes.');
