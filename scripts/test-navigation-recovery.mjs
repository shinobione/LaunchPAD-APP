import assert from 'node:assert/strict';
import fs from 'node:fs';
import { assertCurrentBuild } from './lib/build-metadata.mjs';

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

const build = assertCurrentBuild('Navigation bootstrap');
for (const required of [
  'js/app-engine-recovery.js?v=',
  'const initialStylesheets = new WeakSet',
  'if (initialStylesheets.has(link)) return link;',
  'js/navigation-stability-v39.js?v='
]) assert.ok(build.source.includes(required), `Navigation bootstrap is missing ${required}.`);

const router = fs.readFileSync('js/core/router.js', 'utf8');
assert.ok(router.includes("if (route.type === 'track')"), 'Dedicated track routes must bypass the generic view router.');
assert.ok(router.includes('announceRoute(route);'), 'Track routes must still announce route state.');
assert.ok(!router.includes('isPassiveTrackDetail'), 'The generic router must not depend on the old passive-track history gate.');

const stability = fs.readFileSync('css/ui-stability-v39.css', 'utf8');
assert.ok(stability.includes('body[data-viewed-track-theme] #view-track,'), 'Track detail outer frame suppression must remain enabled.');
assert.ok(stability.includes('height:clamp(330px,43dvh,430px);'), 'Audio Lab must remain viewport-aware on desktop.');
assert.ok(stability.includes('.now-playing-card-badge-v39'), 'NOW PLAYING card alignment must remain guarded.');

const worker = fs.readFileSync('sw.js', 'utf8');
assert.ok(worker.includes("'./js/app-engine-recovery.js'"), 'The recovery bootstrap must be part of the PWA shell.');
assert.ok(worker.includes("url.pathname.endsWith('/js/app-engine-recovery.js')"), 'The recovery bootstrap must bypass stale caches.');
assert.ok(worker.includes("fetch(request, { cache: 'no-store' })"), 'The recovery bootstrap must be fetched without cache reuse.');

console.log(`Navigation renders dedicated track routes once and keeps the runtime cache-safe under Build ${build.number}.`);
