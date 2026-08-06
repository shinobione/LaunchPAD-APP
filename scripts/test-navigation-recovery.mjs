import assert from 'node:assert/strict';
import fs from 'node:fs';

for (const path of ['js/app-engine.js', 'js/app-engine-recovery.js']) {
  const engine = fs.readFileSync(path, 'utf8');
  for (const required of [
    "data.remoteCatalog = 'fallback'",
    "data.remoteTrackCount = '0'",
    "data.catalogFallback = 'local'",
    'normalizeCatalogEditorialTags();',
    'feature11.prepareFeature11Catalog();',
    "console.warn('Cloudflare R2 catalog unavailable; continuing with the local catalog.'",
    "await import(versioned('./app-main.js'))"
  ]) {
    assert.ok(engine.includes(required), `${path} navigation recovery is missing ${required}.`);
  }

  assert.ok(
    !engine.includes("throw new Error('The online catalog could not be loaded.'"),
    `${path} must not abort application boot when the remote catalog fails.`
  );

  const fallbackIndex = engine.indexOf("data.remoteCatalog = 'fallback'");
  const appMainIndex = engine.indexOf("await import(versioned('./app-main.js'))");
  assert.ok(fallbackIndex >= 0 && appMainIndex > fallbackIndex, `${path} must continue booting after the local catalog fallback.`);
}

const build = fs.readFileSync('js/build-config.js', 'utf8');
assert.ok(build.includes('js/app-engine-recovery.js?v='), 'Build 37 must load the uncached recovery bootstrap.');

const worker = fs.readFileSync('sw.js', 'utf8');
assert.ok(worker.includes("'./js/app-engine-recovery.js'"), 'The recovery bootstrap must be part of the PWA shell.');
assert.ok(worker.includes("url.pathname.endsWith('/js/app-engine-recovery.js')"), 'The recovery bootstrap must bypass stale caches.');
assert.ok(worker.includes("fetch(request, { cache: 'no-store' })"), 'The recovery bootstrap must be fetched without cache reuse.');

console.log('Navigation remains available and the recovery bootstrap bypasses stale PWA caches.');
