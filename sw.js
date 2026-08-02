importScripts('./js/build-config.js');
const VERSION = globalThis.SHINOBIWAN_BUILD?.cache || 'shinobi-launchpad-dev';
const SHELL_CACHE = `${VERSION}-shell`;
const IMAGE_CACHE = `${VERSION}-images`;
const RUNTIME_CACHE = `${VERSION}-runtime`;
const CACHE_NAMES = new Set([SHELL_CACHE, IMAGE_CACHE, RUNTIME_CACHE]);

const SHELL_RESOURCES = [
  './',
  './index.html',
  './manifest.webmanifest',
  './robots.txt',
  './sitemap.xml',
  './css/style.css',
  './css/header.css',
  './css/refinements.css',
  './css/lyrics.css',
  './css/fixes-v2.css',
  './css/content-v4.css',
  './css/desktop-hero-wide.css',
  './css/mobile-top-cleanup.css',
  './css/launchpad-features.css',
  './css/about-enhancements.css',
  './css/library-memory.css',
  './css/pwa.css',
  './css/visual-card.css',
  './js/build-config.js',
  './js/app-engine.js',
  './js/app-main.js',
  './js/catalog.js',
  './js/catalog-metadata.js',
  './js/core/assets.js',
  './js/core/catalog-store.js',
  './js/core/player-queue.js',
  './js/core/router.js',
  './js/core/share.js',
  './js/core/theme.js',
  './js/features/ui/ui-controller.js',
  './js/features/lyrics/lyrics-engine.js',
  './js/features/visual/visual-engine.js',
  './js/features/media-session.js',
  './js/features/queue-ui.js',
  './js/features/album-detail.js',
  './js/features/lyrics-studio.js',
  './js/features/player-experience.js',
  './js/features/resilience-accessibility.js',
  './js/features/content/content-controller.js',
  './js/features/audio/audio-focus.js',
  './js/features/lyrics/wake-lock.js',
  './js/features/about/about-controller.js',
  './js/features/library-memory-shell.js',
  './js/features/library-memory.js',
  './js/features/pwa.js',
  './js/features/visual-card.js'
];

const IMAGE_RESOURCES = [
  './assets/favicon-v6.svg',
  './assets/pwa-icon-192.svg',
  './assets/pwa-icon-512.svg',
  './assets/logo.png',
  './assets/shinoprofil.jpeg',
  './assets/launchpad.png',
  './assets/neon-heartbreaks.jpeg',
  './assets/coal-to-diamond.jpeg',
  './assets/love-letters.jpeg',
  './assets/singles.jpeg',
  './assets/before-the-noise.jpeg',
  './assets/low-bitrate-love.jpeg',
  './assets/thick.jpeg',
  './assets/real-love-doesnt-rush.jpeg',
  './assets/jusquau-dernier-souffle.jpeg',
  './assets/tinh-bolero-cho-tran.png',
  './assets/saigon-bound.png',
  './assets/the-throne-resonates.jpeg',
  './assets/carved-from-pressure.jpeg',
  './assets/ligne3.jpeg',
  './assets/covers/albums/coal-to-diamond/obey.jpeg',
  './assets/covers/singles/close-to-you.jpeg',
  './assets/covers/singles/ghost-signal.jpeg',
  './assets/covers/singles/husband.jpeg'
];

const LYRIC_RESOURCES = [
  './assets/lyrics/before-the-noise.txt',
  './assets/lyrics/low-bitrate-love.txt',
  './assets/lyrics/thick.txt',
  './assets/lyrics/real-love-doesnt-rush.txt',
  './assets/lyrics/jusquau-dernier-souffle.txt',
  './assets/lyrics/tinh-bolero-cho-tran.txt',
  './assets/lyrics/saigon-bound.txt',
  './assets/lyrics/the-throne-resonates.txt',
  './assets/lyrics/carved-from-pressure.txt',
  './assets/lyrics/ligne3.txt'
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
  const cached = (await runtime.match(request, { ignoreSearch: true }))
    || (await shell.match(request, { ignoreSearch: true }));
  const networkPromise = fetch(request)
    .then(async response => {
      if (response.ok) {
        await runtime.put(request, response.clone());
        trimCache(RUNTIME_CACHE, 120);
      }
      return response;
    })
    .catch(() => null);

  if (cached) return cached;
  return (await networkPromise) || new Response('', { status: 504, statusText: 'Offline' });
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
      || new Response('SHINOBIWAN Launchpad is offline.', {
        status: 503,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' }
      });
  }
}

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    await Promise.all([
      cacheSafely(SHELL_CACHE, [...SHELL_RESOURCES, ...LYRIC_RESOURCES]),
      cacheSafely(IMAGE_CACHE, IMAGE_RESOURCES)
    ]);
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter(name => !CACHE_NAMES.has(name)).map(name => caches.delete(name)));
    await self.clients.claim();
  })());
});

self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', event => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  const isAudio = request.destination === 'audio'
    || /\.(mp3|m4a|wav|ogg|flac)$/i.test(url.pathname)
    || request.headers.has('range');
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
