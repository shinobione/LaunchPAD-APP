import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const injectionPath = 'cloudflare/admin-worker.parts/25-phase6-protected-media-range.inject.part';
const source = fs.readFileSync(injectionPath, 'utf8');

const rangeBody = source.match(
  /function phase6ParseSingleByteRange\(rangeHeader, size\) \{([\s\S]*?)\n\}\n\nfunction phase6ProtectedMediaHeaders/,
)?.[1];
assert.ok(rangeBody, 'Range parser must remain extractable for regression tests.');
const parseRange = new Function('rangeHeader', 'size', rangeBody);

assert.equal(parseRange('', 1000), null, 'No Range header must keep a normal full response.');
assert.deepEqual(parseRange('bytes=0-99', 1000), { start: 0, end: 99, length: 100 });
assert.deepEqual(parseRange('bytes=500-', 1000), { start: 500, end: 999, length: 500 });
assert.deepEqual(parseRange('bytes=-250', 1000), { start: 750, end: 999, length: 250 });
assert.deepEqual(parseRange('bytes=900-1200', 1000), { start: 900, end: 999, length: 100 });
assert.deepEqual(parseRange('bytes=-5000', 1000), { start: 0, end: 999, length: 1000 });
for (const invalid of ['bytes=1000-', 'bytes=200-100', 'bytes=0-1,4-5', 'items=0-5', 'bytes=-0']) {
  assert.equal(parseRange(invalid, 1000)?.invalid, true, `Invalid range must be rejected: ${invalid}`);
}

for (const required of [
  'Access-Control-Allow-Headers"] = "Content-Type, Range"',
  'Access-Control-Expose-Headers"] = "Accept-Ranges, Content-Range, Content-Length, ETag"',
  'headers.set("Accept-Ranges", "bytes")',
  'headers.set("Content-Range", `bytes */${size}`)',
  'status: 416',
  'range: { offset: range.start, length: range.length }',
  'headers.set("Content-Range", `bytes ${range.start}-${range.end}/${size}`)',
  'status: 206',
]) assert.ok(source.includes(required), `Protected media range contract missing: ${required}`);

const builtPath = path.join(os.tmpdir(), 'launchpad-phase6-media-range-worker.js');
const build = spawnSync(process.execPath, ['scripts/build-admin-worker.mjs', builtPath], { encoding: 'utf8' });
if (build.status !== 0) {
  process.stdout.write(build.stdout || '');
  process.stderr.write(build.stderr || '');
  process.exit(build.status || 1);
}
const built = fs.readFileSync(builtPath, 'utf8');
for (const required of [
  'function phase6ParseSingleByteRange(rangeHeader, size)',
  'getProtectedMedia = async function phase6GetProtectedMedia',
  'Accept-Ranges',
  'Content-Range',
  'status: 206',
  'range: { offset: range.start, length: range.length }',
]) assert.ok(built.includes(required), `Built admin Worker lost media seek contract: ${required}`);

assert.ok(
  built.indexOf('const user = await verifyAccessJwt(request, env);') < built.indexOf('const mediaMatch = url.pathname.match('),
  'Protected media range reads must remain behind Cloudflare Access JWT verification.',
);

console.log('Protected media range guard passed: canonical audio/video reads support single-byte ranges for HTML media seeking without weakening Access/CORS.');
