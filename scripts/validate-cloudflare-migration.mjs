
import fs from 'node:fs';

const fail = message => {
  throw new Error(message);
};

const path = 'cloudflare/migration-manifest.json';
if (!fs.existsSync(path)) fail(`Missing ${path}.`);

const plan = JSON.parse(fs.readFileSync(path, 'utf8'));
if (plan.schemaVersion !== 1) fail('Migration schemaVersion must be 1.');
if (!/^[0-9a-f]{40}$/.test(plan.source?.ref || '')) {
  fail('Migration source ref must be an immutable 40-character commit SHA.');
}
if (!Array.isArray(plan.tracks) || plan.tracks.length !== 14) {
  fail(`Expected 14 legacy tracks, received ${plan.tracks?.length ?? 0}.`);
}

const slugs = new Set();
for (const track of plan.tracks) {
  if (!/^[a-z0-9][a-z0-9-]{0,119}$/.test(track.slug || '')) {
    fail(`Invalid migration slug: ${track.slug || '<empty>'}.`);
  }
  if (slugs.has(track.slug)) fail(`Duplicate migration slug: ${track.slug}.`);
  slugs.add(track.slug);

  if (!track.title || !track.album?.id || !track.album?.title) {
    fail(`${track.slug}: title and album metadata are required.`);
  }
  if (!track.sources?.audio || !track.sources?.cover) {
    fail(`${track.slug}: audio and cover source URLs are required.`);
  }
  for (const [kind, value] of Object.entries(track.sources)) {
    if (value === null) continue;
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.hostname !== 'raw.githubusercontent.com') {
      fail(`${track.slug}: ${kind} must use an HTTPS raw.githubusercontent.com URL.`);
    }
    if (!url.pathname.includes(`/${plan.source.ref}/`)) {
      fail(`${track.slug}: ${kind} must be pinned to migration commit ${plan.source.ref}.`);
    }
  }
}

const publicWorker = fs.readFileSync('cloudflare/public-worker.js', 'utf8');
for (const required of [
  'tracks/',
  'manifest.json',
  'catalog/index.json',
  '/tracks',
  '/media/',
  'thumbnail',
  'Accept-Ranges',
  'request.headers.get("range")',
  'version: 2.4',
  'readCatalogIndex',
  'caches.default',
  'timestampsAvailable = manifest.timestampsAvailable === true',
  'function parseLyricSegments(',
  'function detectTimestamps(',
  'if (rangeHeader && object.range)'
]) {
  if (!publicWorker.includes(required)) fail(`Public Worker core is missing ${required}.`);
}
if (publicWorker.includes('bucket.head(')) {
  fail('Public catalog listing must not issue per-asset R2 HEAD requests.');
}
if (publicWorker.includes('if (object.range)')) {
  fail('Full media requests must not be mislabeled as HTTP 206 responses.');
}
if (!publicWorker.includes('/" + kind + "/" + encodeURIComponent(filename)')) {
  fail('Public media URLs must end with their real filename.');
}

const publicWrapper = fs.readFileSync('cloudflare/public-worker-v26.js', 'utf8');
for (const required of [
  'PUBLIC_WORKER_VERSION = 2.6',
  "headers.set('Access-Control-Allow-Origin', '*')",
  "headers.set('Cross-Origin-Resource-Policy', 'cross-origin')",
  "headers.set('Timing-Allow-Origin', '*')",
  "headers.set('X-LaunchPAD-Media-Version', String(PUBLIC_WORKER_VERSION))",
  "headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')",
  'payload.audioLabCors = true',
  "payload.crossOriginResourcePolicy = 'cross-origin'"
]) {
  if (!publicWrapper.includes(required)) fail(`Public Worker v2.6 wrapper is missing ${required}.`);
}

const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
if (packageJson.devDependencies?.wrangler !== '4.118.0') {
  fail('Wrangler must remain pinned to 4.118.0.');
}

for (const [configPath, expected] of [
  ['cloudflare/wrangler.public.jsonc', { name: 'launchpad-media', main: 'public-worker-v26.js' }],
  ['cloudflare/wrangler.admin.jsonc', { name: 'launchpad-r2-api', main: '../dist/launchpad-r2-admin-worker.js' }]
]) {
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  if (config.name !== expected.name || config.main !== expected.main) {
    fail(`${configPath}: unexpected Worker name or entry point.`);
  }
  if (config.keep_vars !== true) fail(`${configPath}: dashboard variables must be preserved.`);
  const mediaBucket = config.r2_buckets?.find(binding => binding.binding === 'MEDIA_BUCKET');
  if (mediaBucket?.bucket_name !== 'shinobiwan-media') {
    fail(`${configPath}: MEDIA_BUCKET must target shinobiwan-media.`);
  }
}

console.log(`Cloudflare migration plan is valid: ${plan.tracks.length} legacy tracks and public Worker v2.6 hardened CORS wrapper.`);