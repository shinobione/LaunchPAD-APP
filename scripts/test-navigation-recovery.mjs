import assert from 'node:assert/strict';
import fs from 'node:fs';

const engine = fs.readFileSync('js/app-engine.js', 'utf8');

for (const required of [
  "data.remoteCatalog = 'fallback'",
  "data.remoteTrackCount = '0'",
  "data.catalogFallback = 'local'",
  'normalizeCatalogEditorialTags();',
  'feature11.prepareFeature11Catalog();',
  "console.warn('Cloudflare R2 catalog unavailable; continuing with the local catalog.'",
  "await import(versioned('./app-main.js'))"
]) {
  assert.ok(engine.includes(required), `Navigation recovery is missing ${required}.`);
}

assert.ok(
  !engine.includes("throw new Error('The online catalog could not be loaded.'"),
  'A remote catalog failure must never abort application boot or navigation initialization.'
);

const fallbackIndex = engine.indexOf("data.remoteCatalog = 'fallback'");
const appMainIndex = engine.indexOf("await import(versioned('./app-main.js'))");
assert.ok(fallbackIndex >= 0 && appMainIndex > fallbackIndex, 'The application must continue booting after the local catalog fallback.');

console.log('Navigation remains available when the Cloudflare catalog is unavailable.');
