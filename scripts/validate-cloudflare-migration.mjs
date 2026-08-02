import fs from 'node:fs';

const fail = message => {
  throw new Error(message);
};

const path = 'cloudflare/migration-manifest.json';
if (!fs.existsSync(path)) fail(`Missing ${path}.`);

const plan = JSON.parse(fs.readFileSync(path, 'utf8'));
if (plan.schemaVersion !== 1) fail('Migration schemaVersion must be 1.');
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
  'version: 2.2',
  'readCatalogIndex',
  'caches.default'
]) {
  if (!publicWorker.includes(required)) fail(`Public Worker is missing ${required}.`);
}
if (publicWorker.includes('bucket.head(')) {
  fail('Public catalog listing must not issue per-asset R2 HEAD requests.');
}
if (!publicWorker.includes('/" + kind + "/" + encodeURIComponent(filename)')) {
  fail('Public media URLs must end with their real filename.');
}

console.log(`Cloudflare migration plan is valid: ${plan.tracks.length} legacy tracks.`);
