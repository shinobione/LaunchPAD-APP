import worker from './public-worker-v26.js';

const PUBLIC_WORKER_VERSION = 2.7;
const CATALOG_INDEX_KEY = 'catalog/index.json';
const ALBUMS_PREFIX = 'albums/';
const ALBUM_ASSET_KINDS = new Set(['cover', 'thumbnail']);

function hardenedHeaders(source, { health = false, immutable = false } = {}) {
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
  if (immutable) headers.set('Cache-Control', 'public, max-age=31536000, immutable');
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

function safeAlbumAssetPath(value, kind) {
  if (!value) return null;
  const clean = String(value).replace(/\\/g, '/').replace(/^\/+/, '');
  if (!clean || clean.includes('..')) return null;
  if (kind === 'cover' && !/^cover\/[a-zA-Z0-9._-]+$/.test(clean)) return null;
  if (kind === 'thumbnail' && clean !== 'thumbnail/thumbnail.webp') return null;
  return clean;
}

function assetFilename(path) {
  return String(path || '').split('/').filter(Boolean).at(-1) || null;
}

function albumAssetUrl(origin, album, kind, path) {
  const filename = assetFilename(path);
  if (!filename) return null;
  const url = new URL(`/albums/${encodeURIComponent(album.id)}/media/${kind}/${encodeURIComponent(filename)}`, origin);
  const version = album.updatedAt || album.createdAt || album.schemaVersion || 1;
  url.searchParams.set('v', String(version));
  return url.href;
}

function publicAlbum(album, origin) {
  if (!album?.id || album.status !== 'published') return null;
  const coverPath = safeAlbumAssetPath(album.assets?.cover, 'cover');
  const thumbnailPath = safeAlbumAssetPath(album.assets?.thumbnail, 'thumbnail');
  const cover = coverPath ? {
    path: coverPath,
    filename: assetFilename(coverPath),
    url: albumAssetUrl(origin, album, 'cover', coverPath),
  } : null;
  const thumbnail = thumbnailPath ? {
    path: thumbnailPath,
    filename: assetFilename(thumbnailPath),
    url: albumAssetUrl(origin, album, 'thumbnail', thumbnailPath),
  } : null;

  return {
    ...album,
    source: 'cloudflare-r2',
    cover: thumbnail?.url || cover?.url || null,
    fullCover: cover?.url || thumbnail?.url || null,
    thumbnail: thumbnail?.url || null,
    assets: { cover, thumbnail },
  };
}

async function readAlbumProjection(bucket) {
  const object = await bucket.get(CATALOG_INDEX_KEY);
  if (!object) return null;
  try {
    const index = JSON.parse(await object.text());
    if (index?.schemaVersion !== 1 || !Array.isArray(index.tracks) || !Array.isArray(index.albums)) return null;
    return index;
  } catch {
    return null;
  }
}

async function listPublicAlbums(bucket, origin) {
  const index = await readAlbumProjection(bucket);
  if (!index) return null;
  return index.albums.map(album => publicAlbum(album, origin)).filter(Boolean);
}

async function versionDelegatedResponse(response, { health = false } = {}) {
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: hardenedHeaders(response.headers, { health }),
  });
}

async function versionedHealth(response, env, origin) {
  try {
    const payload = await response.clone().json();
    const albums = await listPublicAlbums(env.MEDIA_BUCKET, origin);
    payload.version = PUBLIC_WORKER_VERSION;
    payload.audioLabCors = true;
    payload.crossOriginResourcePolicy = 'cross-origin';
    payload.albumAuthority = albums === null ? 'unavailable' : 'canonical-r2';
    payload.canonicalAlbums = albums?.length || 0;
    payload.routes = {
      ...(payload.routes || {}),
      albums: '/albums',
      album: '/albums/{id}',
      albumMedia: '/albums/{id}/media/{cover|thumbnail}/{filename}',
    };
    return new Response(JSON.stringify(payload, null, 2), {
      status: response.status,
      statusText: response.statusText,
      headers: hardenedHeaders(response.headers, { health: true }),
    });
  } catch {
    return versionDelegatedResponse(response, { health: true });
  }
}

async function enrichTracksResponse(response, env, origin) {
  if (!response.ok) return versionDelegatedResponse(response);
  const albums = await listPublicAlbums(env.MEDIA_BUCKET, origin);
  if (albums === null) return versionDelegatedResponse(response);

  try {
    const payload = await response.clone().json();
    payload.albumAuthority = 'canonical-r2';
    payload.albumCount = albums.length;
    payload.albums = albums;
    return new Response(JSON.stringify(payload, null, 2), {
      status: response.status,
      statusText: response.statusText,
      headers: hardenedHeaders(response.headers),
    });
  } catch {
    return versionDelegatedResponse(response);
  }
}

async function listAlbumsResponse(request, env, origin) {
  if (!['GET', 'HEAD'].includes(request.method)) {
    return jsonResponse({ ok: false, error: 'Méthode non autorisée.' }, 405, { Allow: 'GET, HEAD, OPTIONS' });
  }
  const albums = await listPublicAlbums(env.MEDIA_BUCKET, origin);
  if (albums === null) {
    return jsonResponse({ ok: false, error: 'Projection Album canonique indisponible.', albumAuthority: 'unavailable' }, 503, {
      'Cache-Control': 'no-store',
    });
  }
  const payload = { ok: true, albumAuthority: 'canonical-r2', count: albums.length, albums };
  if (request.method === 'HEAD') {
    return new Response(null, { status: 200, headers: hardenedHeaders({ 'Cache-Control': 'public, max-age=60, stale-while-revalidate=300' }) });
  }
  return jsonResponse(payload, 200, { 'Cache-Control': 'public, max-age=60, stale-while-revalidate=300' });
}

async function getAlbumResponse(request, env, origin, albumId) {
  if (!['GET', 'HEAD'].includes(request.method)) {
    return jsonResponse({ ok: false, error: 'Méthode non autorisée.' }, 405, { Allow: 'GET, HEAD, OPTIONS' });
  }
  const albums = await listPublicAlbums(env.MEDIA_BUCKET, origin);
  if (albums === null) return jsonResponse({ ok: false, error: 'Projection Album canonique indisponible.' }, 503);
  const album = albums.find(item => item.id === albumId);
  if (!album) return jsonResponse({ ok: false, error: 'Album introuvable.' }, 404);
  if (request.method === 'HEAD') return new Response(null, { status: 200, headers: hardenedHeaders() });
  return jsonResponse({ ok: true, albumAuthority: 'canonical-r2', album });
}

async function streamAlbumAsset(request, env, origin, albumId, kind, requestedFilename) {
  if (!['GET', 'HEAD'].includes(request.method)) {
    return jsonResponse({ ok: false, error: 'Méthode non autorisée.' }, 405, { Allow: 'GET, HEAD, OPTIONS' });
  }
  if (!ALBUM_ASSET_KINDS.has(kind)) return jsonResponse({ ok: false, error: 'Média introuvable.' }, 404);

  const index = await readAlbumProjection(env.MEDIA_BUCKET);
  const album = index?.albums?.find(item => item?.id === albumId && item.status === 'published');
  if (!album) return jsonResponse({ ok: false, error: 'Album introuvable.' }, 404);

  const path = safeAlbumAssetPath(album.assets?.[kind], kind);
  const filename = assetFilename(path);
  if (!path || !filename || requestedFilename !== filename) {
    return jsonResponse({ ok: false, error: 'Média introuvable.' }, 404);
  }

  const object = await env.MEDIA_BUCKET.get(`${ALBUMS_PREFIX}${albumId}/${path}`);
  if (!object) return jsonResponse({ ok: false, error: 'Média introuvable.' }, 404);

  const headers = hardenedHeaders(new Headers(), { immutable: true });
  object.writeHttpMetadata?.(headers);
  if (object.httpEtag) headers.set('ETag', object.httpEtag);
  if (Number.isFinite(object.size)) headers.set('Content-Length', String(object.size));
  headers.set('X-Content-Type-Options', 'nosniff');

  return new Response(request.method === 'HEAD' ? null : object.body, {
    status: 200,
    headers,
  });
}

export default {
  async fetch(request, env, ctx) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: hardenedHeaders() });
    }

    const url = new URL(request.url);
    const pathname = url.pathname;

    if (pathname === '/' || pathname === '/health') {
      return versionedHealth(await worker.fetch(request, env, ctx), env, url.origin);
    }

    if (pathname === '/tracks') {
      return enrichTracksResponse(await worker.fetch(request, env, ctx), env, url.origin);
    }

    if (pathname === '/albums') {
      return listAlbumsResponse(request, env, url.origin);
    }

    const albumMatch = pathname.match(/^\/albums\/([a-z0-9][a-z0-9-]{0,119})$/);
    if (albumMatch) {
      return getAlbumResponse(request, env, url.origin, albumMatch[1]);
    }

    const mediaMatch = pathname.match(/^\/albums\/([a-z0-9][a-z0-9-]{0,119})\/media\/(cover|thumbnail)\/([^/]+)$/);
    if (mediaMatch) {
      let filename;
      try {
        filename = decodeURIComponent(mediaMatch[3]);
      } catch {
        return jsonResponse({ ok: false, error: 'Média introuvable.' }, 404);
      }
      return streamAlbumAsset(request, env, url.origin, mediaMatch[1], mediaMatch[2], filename);
    }

    return versionDelegatedResponse(await worker.fetch(request, env, ctx));
  }
};
