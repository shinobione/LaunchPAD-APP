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
assert.ok(build.includes('js/app-engine-recovery.js?v='), 'Build 38 must load the uncached recovery bootstrap.');
assert.ok(build.includes('const initialStylesheets = new WeakSet'), 'Build bootstrap must remember parser-delivered stylesheets.');
assert.ok(build.includes('if (initialStylesheets.has(link)) return link;'), 'Parser-delivered stylesheets must not be rewritten after first paint.');

const router = fs.readFileSync('js/core/router.js', 'utf8');
assert.ok(router.includes("if (route.type === 'track')"), 'Dedicated track routes must bypass the generic view router.');
assert.ok(router.includes('announceRoute(route);'), 'Passive track routes must still announce route state.');

const themeScope = fs.readFileSync('css/theme-scope.css', 'utf8');
assert.ok(themeScope.includes('body[data-viewed-track-theme] #view-track{\n  background:none;'), 'Track detail must not paint a full-view translucent theme frame.');
assert.ok(themeScope.includes('height:clamp(390px,calc(100dvh - 460px),500px);'), 'Audio Lab stage must fit preset controls above the desktop player.');
assert.ok(themeScope.includes('.album-card.is-current::after{\n  top:19px!important;'), 'NOW PLAYING must align vertically with cover badges.');

const worker = fs.readFileSync('sw.js', 'utf8');
assert.ok(worker.includes("'./js/app-engine-recovery.js'"), 'The recovery bootstrap must be part of the PWA shell.');
assert.ok(worker.includes("url.pathname.endsWith('/js/app-engine-recovery.js')"), 'The recovery bootstrap must bypass stale caches.');
assert.ok(worker.includes("fetch(request, { cache: 'no-store' })"), 'The recovery bootstrap must be fetched without cache reuse.');

console.log('Navigation remains available, dedicated track routes render once, and layout polish stays cache-safe.');
