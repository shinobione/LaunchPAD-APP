import worker from './public-worker-v27.js';

const PUBLIC_WORKER_VERSION = 2.8;
const CATALOG_INDEX_KEY = 'catalog/index.json';
const ALBUMS_PREFIX = 'albums/';
const ALBUM_MANIFEST_NAME = 'manifest.json';
const MAX_ALBUM_LIST_PAGES = 20;

let visibilityCache = {
  generatedAt: null,
  state: null,
};

function hardenedHeaders(source, { health = false } = {}) {
  const headers = new Headers(source);
  headers.set('Access-Control-Allow-Origin', '*');
  headers.set('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  headers.set('Access-Control-Allow-Headers', 'Range, If-None-Match, Content-Type');
  headers.set('Access-Control-Expose-Headers', 'Accept-Ranges, Content-Length, Content-Range, Content-Type, ETag, Cross-Origin-Resource-Policy, Timing-Allow-Origin, X-LaunchPAD-Media-Version');
  headers.set('Access-Control-Max-Age', '86400');
  headers.set('Cross-Origin-Resource-Policy', 'cross-origin');
  headers.set('Timing-Allow-Origin', '*');
  headers.set('Vary', 'Origin');
  headers.set('X-LaunchPAD-Media-Version', String(PUBLIC_WORKER_VERSION));
  if (health) headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
  return headers;
}

function jsonResponse(payload, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(payload, null, 2), {
    status,
    headers: hardenedHeaders({
      'Content-Type': 'application/json; charset=utf-8',
      'X-Content-Type-Options': 'nosniff',
      ...extraHeaders,
    }),
  });
}

function versionedResponse(response, { health = false } = {}) {
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: hardenedHeaders(response.headers, { health }),
  });
}

async function readCatalogIndex(bucket) {
  const object = await bucket.get(CATALOG_INDEX_KEY);
  if (!object) throw new Error('PUBLIC_VISIBILITY_Catalog projection missing.');
  const index = JSON.parse(await object.text());
  if (index?.schemaVersion !== 1 || !Array.isArray(index.tracks) || !Array.isArray(index.albums)) {
    throw new Error('PUBLIC_VISIBILITY_Catalog projection invalid.');
  }
  return index;
}

async function listAlbumManifestObjects(bucket) {
  const manifests = [];
  let cursor;
  for (let page = 0; page < MAX_ALBUM_LIST_PAGES; page += 1) {
    const result = await bucket.list({ prefix: ALBUMS_PREFIX, cursor, limit: 1000 });
    manifests.push(...result.objects.filter(object => object.key.endsWith('/' + ALBUM_MANIFEST_NAME)));
    if (!result.truncated || !result.cursor) return manifests;
    cursor = result.cursor;
  }
  throw new Error('PUBLIC_VISIBILITY_Album manifest pagination exceeded.');
}

async function buildCanonicalAlbumVisibilityState(bucket, expectedGeneratedAt = null) {
  const manifestObjects = await listAlbumManifestObjects(bucket);
  const owners = new Map();

  for (const object of manifestObjects) {
    const stored = await bucket.get(object.key);
    if (!stored) continue;

    let album;
    try {
      album = JSON.parse(await stored.text());
    } catch {
      throw new Error(`PUBLIC_VISIBILITY_Invalid Album manifest: ${object.key}`);
    }

    if (album?.schemaVersion !== 1 || !album?.id || !Array.isArray(album.trackIds)) {
      throw new Error(`PUBLIC_VISIBILITY_Invalid Album authority: ${object.key}`);
    }

    const status = String(album.status || 'draft').toLowerCase();
    for (const rawTrackId of album.trackIds) {
      const trackId = String(rawTrackId || '').trim();
      if (!trackId) continue;
      if (owners.has(trackId)) {
        owners.set(trackId, { albumId: null, status: 'conflict' });
        continue;
      }
      owners.set(trackId, { albumId: String(album.id), status });
    }
  }

  return {
    generatedAt: expectedGeneratedAt,
    owners,
  };
}

async function canonicalAlbumVisibilityState(bucket) {
  const index = await readCatalogIndex(bucket);
  const generatedAt = String(index.generatedAt || '');
  if (!generatedAt) throw new Error('PUBLIC_VISIBILITY_Catalog generation marker missing.');

  if (visibilityCache.generatedAt === generatedAt && visibilityCache.state) {
    return visibilityCache.state;
  }

  const state = await buildCanonicalAlbumVisibilityState(bucket, generatedAt);
  visibilityCache = { generatedAt, state };
  return state;
}

function trackIsPubliclyVisible(state, trackId) {
  const owner = state.owners.get(String(trackId || ''));
  return !owner || owner.status === 'published';
}

async function requirePublicTrackVisibility(bucket, trackId) {
  const state = await canonicalAlbumVisibilityState(bucket);
  return trackIsPubliclyVisible(state, trackId);
}

async function filteredTracksResponse(response, env) {
  if (!response.ok) return versionedResponse(response);
  const state = await canonicalAlbumVisibilityState(env.MEDIA_BUCKET);
  const payload = await response.clone().json();
  if (!payload?.ok || !Array.isArray(payload.tracks)) {
    return jsonResponse({ ok: false, error: 'Projection Track publique invalide.' }, 503, { 'Cache-Control': 'no-store' });
  }

  payload.tracks = payload.tracks.filter(track => trackIsPubliclyVisible(state, track?.slug));
  payload.count = payload.tracks.length;
  payload.parentAlbumVisibility = 'canonical-trackIds-v1';

  return new Response(JSON.stringify(payload, null, 2), {
    status: response.status,
    statusText: response.statusText,
    headers: hardenedHeaders(response.headers),
  });
}

async function versionedHealth(response) {
  try {
    const payload = await response.clone().json();
    payload.version = PUBLIC_WORKER_VERSION;
    payload.parentAlbumVisibility = 'canonical-trackIds-v1';
    return new Response(JSON.stringify(payload, null, 2), {
      status: response.status,
      statusText: response.statusText,
      headers: hardenedHeaders(response.headers, { health: true }),
    });
  } catch {
    return versionedResponse(response, { health: true });
  }
}

export default {
  async fetch(request, env, ctx) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: hardenedHeaders() });
    }

    const url = new URL(request.url);
    const pathname = url.pathname;

    try {
      if (pathname === '/' || pathname === '/health') {
        return versionedHealth(await worker.fetch(request, env, ctx));
      }

      if (pathname === '/tracks') {
        return filteredTracksResponse(await worker.fetch(request, env, ctx), env);
      }

      const trackMatch = pathname.match(/^\/tracks\/([a-z0-9][a-z0-9-]{0,119})$/);
      if (trackMatch && !(await requirePublicTrackVisibility(env.MEDIA_BUCKET, trackMatch[1]))) {
        return jsonResponse({ ok: false, error: 'Track introuvable.' }, 404);
      }

      const mediaMatch = pathname.match(/^\/media\/([a-z0-9][a-z0-9-]{0,119})\/(cover|thumbnail|audio|video|lyrics)(?:\/([^/]+))?$/);
      if (mediaMatch && !(await requirePublicTrackVisibility(env.MEDIA_BUCKET, mediaMatch[1]))) {
        return jsonResponse({ ok: false, error: 'Média introuvable.' }, 404);
      }

      return versionedResponse(await worker.fetch(request, env, ctx));
    } catch (error) {
      console.error('Public parent-Album visibility gate failed', error);
      return jsonResponse({
        ok: false,
        error: 'Projection publique temporairement indisponible.',
        code: 'PUBLIC_VISIBILITY_UNAVAILABLE',
      }, 503, { 'Cache-Control': 'no-store' });
    }
  },
};

export {
  buildCanonicalAlbumVisibilityState,
  canonicalAlbumVisibilityState,
  trackIsPubliclyVisible,
};
