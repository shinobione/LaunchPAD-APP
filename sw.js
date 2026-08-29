importScripts('./js/build-config.js');
const RELEASE = globalThis.SHINOBIWAN_BUILD?.release || 'pwa-update-prompt-dev';
const VERSION = `${globalThis.SHINOBIWAN_BUILD?.cache || 'shinobi-launchpad-dev'}-${RELEASE}`;
const SHELL_CACHE = `${VERSION}-shell`;
const IMAGE_CACHE = `${VERSION}-images`;
const RUNTIME_CACHE = `${VERSION}-runtime`;
const CACHE_NAMES = new Set([SHELL_CACHE, IMAGE_CACHE, RUNTIME_CACHE]);
const CACHE_PREFIX = 'shinobi-launchpad-';

const SHELL_RESOURCES = [
  './','./index.html','./manifest.webmanifest','./robots.txt','./sitemap.xml',
  './css/style.css','./css/header.css','./css/refinements.css','./css/lyrics.css','./css/fixes-v2.css','./css/content-v4.css',
  './css/desktop-hero-wide.css','./css/mobile-top-cleanup.css','./css/mobile-navigation.css','./css/launchpad-features.css','./css/ui-polish-v62.css','./css/player-routing-v83.css','./css/premium-interactions-v92.css','./css/premium-interactions-v93.css',
  './css/catalog-filters.css','./css/feature-10.css','./css/feature-11.css','./css/feature-12.css','./css/theme-scope.css','./css/discography-experience.css','./css/home-editorial.css','./css/svg-icon-system.css','./css/badge-hierarchy.css','./css/admin-tools.css','./css/about-enhancements.css','./css/library-memory.css',
  './css/pwa.css','./css/visual-card.css','./css/track-detail.css','./css/track-videos.css','./css/mobile-studio.css','./css/canvas-identity.css','./css/r2-track-details.css',
  './js/build-config.js','./js/visual-card-export-guard.js','./js/app-engine.js','./js/app-engine-recovery.js','./js/app-main.js','./js/ui-polish-v62.js','./js/catalog.js',
  './js/core/assets.js','./js/core/catalog-store.js','./js/core/catalog-schema.js','./js/core/catalog-ordering.js','./js/core/editorial-normalization.js','./js/core/remote-catalog.js',
  './js/core/player-queue.js','./js/core/router.js','./js/core/share.js','./js/core/theme.js',
  './js/features/ui/ui-controller.js','./js/features/catalog-filters.js','./js/features/content-advisory-badges.js','./js/features/feature-11.js','./js/features/feature-12.js','./js/features/feature-13.js','./js/features/theme-scope.js','./js/features/discography-experience.js','./js/features/home-editorial.js','./js/features/svg-icon-system.js','./js/features/badge-hierarchy.js','./js/features/premium-interactions-v92.js',
  './js/features/audio-lab-signal.js','./js/features/lyrics/lyrics-engine.js','./js/features/visual/visual-engine.js','./js/features/visual/audio-reactivity.js','./js/features/visual/visual-engine-v2.js','./js/features/visual/visual-engine-core-modes.js','./js/features/visual/motion-spring.js','./js/features/visual/pulse-reactor.js','./js/features/visual/bass-fracture.js','./js/features/visual/gravity-lens.js','./js/features/visual/signal-bloom.js','./js/features/visual/halo-vector.js','./js/features/visual/kinetic-glass.js','./js/features/visual/neon-horizon.js','./js/features/visual/pulse-line.js','./js/features/visual/chroma-spectrum.js','./js/features/visual/bio-structure.js','./js/features/visual/void-bloom.js','./js/features/visual/creep-signal.js','./js/features/visual/neon-ribbon.js','./js/features/visual/visual-engine-live.js','./js/features/visual/audio-lab-registry.js','./js/features/visual/audio-lab-sanctuary.js','./js/features/media-session.js','./js/features/queue-ui.js',
  './js/features/album-detail.js','./js/features/track-detail.js','./js/features/track-videos.js','./js/features/smart-canvas.js',
  './js/features/canvas-identity.js','./js/features/mobile-navigation.js','./js/features/lyrics-studio.js','./js/features/player-experience.js',
  './js/features/resilience-accessibility.js','./js/features/audio-readiness.js','./js/features/content/content-controller.js',
  './js/features/audio/audio-focus.js','./js/features/lyrics/wake-lock.js','./js/features/about/about-controller.js',
  './js/features/library-memory-shell.js','./js/features/library-memory.js','./js/features/listening-history-summary.js',
  './js/features/pwa.js','./js/features/visual-card.js','./js/features/admin-access.js'
];

const IMAGE_RESOURCES = [
  './assets/app-icon-neon.svg','./assets/app-icon-neon-maskable.svg','./assets/app-icon-neon-192.png','./assets/app-icon-neon-512.png',
  './assets/logo.png','./assets/shinoprofil.jpeg','./assets/launchpad.png','./assets/ShinoLaunchpadLogo.png','./assets/neon-heartbreaks.jpeg','./assets/coal-to-diamond.jpeg',
  './assets/love-letters.jpeg','./assets/singles.jpeg'
];

async function cacheSafely(cacheName, resources) {
  const cache = await caches.open(cacheName);
  await Promise.allSettled(resources.map(async resource => {
    const request = new Request(resource, { cache: 'reload' });
    const response = await fetch(request);
    if (response.ok) await cache.put(request, response);
  }));
}

async function trimCache(cacheName, maximumEntries) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  await Promise.all(keys.slice(0, Math.max(0, keys.length - maximumEntries)).map(key => cache.delete(key)));
}

async function cacheFirst(request, cacheName, maximumEntries = 80) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request, { ignoreSearch: true });
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) {
    await cache.put(request, response.clone());
    trimCache(cacheName, maximumEntries);
  }
  return response;
}

async function staleWhileRevalidate(request) {
  const runtime = await caches.open(RUNTIME_CACHE);
  const shell = await caches.open(SHELL_CACHE);
  const cached = (await runtime.match(request, { ignoreSearch: true })) || (await shell.match(request, { ignoreSearch: true }));
  const networkPromise = fetch(request).then(async response => {
    if (response.ok) {
      await runtime.put(request, response.clone());
      trimCache(RUNTIME_CACHE, 120);
    }
    return response;
  }).catch(() => null);
  if (cached) return cached;
  return (await networkPromise) || new Response('', { status: 504, statusText: 'Offline' });
}

async function freshBuildMetadata(request) {
  try {
    const response = await fetch(request, { cache: 'no-store' });
    if (response.ok) {
      const runtime = await caches.open(RUNTIME_CACHE);
      await runtime.put(new Request('./js/build-config.js'), response.clone());
    }
    return response;
  } catch {
    const runtime = await caches.open(RUNTIME_CACHE);
    const shell = await caches.open(SHELL_CACHE);
    return (await runtime.match('./js/build-config.js', { ignoreSearch: true }))
      || (await shell.match('./js/build-config.js', { ignoreSearch: true }))
      || new Response('', { status: 504, statusText: 'Offline' });
  }
}

async function navigationResponse(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(RUNTIME_CACHE);
      await cache.put('./index.html', response.clone());
    }
    return response;
  } catch {
    const shell = await caches.open(SHELL_CACHE);
    return (await shell.match('./index.html', { ignoreSearch: true }))
      || (await shell.match('./', { ignoreSearch: true }))
      || new Response('SHINOBIWAN Launchpad is offline.', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
  }
}

self.addEventListener('install', event => {
  event.waitUntil(Promise.all([cacheSafely(SHELL_CACHE, SHELL_RESOURCES), cacheSafely(IMAGE_CACHE, IMAGE_RESOURCES)]));
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names
      .filter(name => name.startsWith(CACHE_PREFIX) && !CACHE_NAMES.has(name))
      .map(name => caches.delete(name)));
    await self.clients.claim();
  })());
});

self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
    return;
  }
  if (event.data?.type === 'GET_RELEASE') {
    event.ports?.[0]?.postMessage({ release: RELEASE, version: VERSION });
  }
});

self.addEventListener('fetch', event => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (url.pathname.endsWith('/js/build-config.js')) {
    event.respondWith(freshBuildMetadata(request));
    return;
  }

  if (url.pathname.endsWith('/js/app-engine-recovery.js')) {
    event.respondWith(fetch(request, { cache: 'no-store' }));
    return;
  }

  const isVideo = request.destination === 'video' || /\.(mp4|webm|mov)$/i.test(url.pathname);
  if (isVideo) {
    event.respondWith(fetch(request, { cache: request.headers.has('range') ? 'no-store' : 'force-cache' }));
    return;
  }

  const isAudio = request.destination === 'audio' || /\.(mp3|m4a|wav|ogg|flac)$/i.test(url.pathname);
  if (isAudio) {
    event.respondWith(fetch(request));
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith(navigationResponse(request));
    return;
  }

  if (request.destination === 'image' || /\.(png|jpe?g|webp|gif|svg)$/i.test(url.pathname)) {
    event.respondWith(cacheFirst(request, IMAGE_CACHE));
    return;
  }

  event.respondWith(staleWhileRevalidate(request));
});