const TRACKS_PREFIX = "tracks/";
const MANIFEST_NAME = "manifest.json";
const CATALOG_INDEX_KEY = "catalog/index.json";
const MAX_LIST_PAGES = 20;
const MAX_LYRICS_BYTES = 1024 * 1024;
const ASSET_KINDS = ["cover", "thumbnail", "audio", "video", "lyrics"];

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    try {
      if (request.method === "OPTIONS") {
        return new Response(null, { status: 204, headers: corsHeaders() });
      }

      if (!["GET", "HEAD"].includes(request.method)) {
        return jsonResponse({ ok: false, error: "Méthode non autorisée." }, 405, { Allow: "GET, HEAD, OPTIONS" });
      }

      if (url.pathname === "/" || url.pathname === "/health") {
        const canonical = await listAllObjects(env.MEDIA_BUCKET, TRACKS_PREFIX);
        const manifests = canonical.filter(object => object.key.endsWith("/" + MANIFEST_NAME)).length;
        return jsonResponse({
          ok: true,
          service: "launchpad-media",
          version: 2.2,
          access: "public-read-only",
          canonicalTracks: manifests,
          routes: {
            tracks: "/tracks",
            track: "/tracks/{slug}",
            media: "/media/{slug}/{cover|thumbnail|audio|video|lyrics}/{filename}",
          },
        });
      }

      if (url.pathname === "/tracks") {
        const cache = caches.default;
        const cacheKey = new Request(url.origin + "/tracks", request);
        const cached = await cache.match(cacheKey);
        if (cached) return cached;

        const tracks = await listPublishedTracks(env.MEDIA_BUCKET, url.origin, false);
        const response = jsonResponse({ ok: true, count: tracks.length, tracks }, 200, {
          "Cache-Control": "public, max-age=60, s-maxage=60, stale-while-revalidate=600",
        });
        ctx?.waitUntil(cache.put(cacheKey, response.clone()));
        return response;
      }

      const trackMatch = url.pathname.match(/^\/tracks\/([a-z0-9][a-z0-9-]{0,119})$/);
      if (trackMatch) {
        const track = await getPublishedTrack(env.MEDIA_BUCKET, trackMatch[1], url.origin, true);
        if (!track) return jsonResponse({ ok: false, error: "Track introuvable." }, 404);
        return jsonResponse({ ok: true, track }, 200, {
          "Cache-Control": "public, max-age=60, stale-while-revalidate=300",
        });
      }

      const mediaMatch = url.pathname.match(/^\/media\/([a-z0-9][a-z0-9-]{0,119})\/(cover|thumbnail|audio|video|lyrics)(?:\/([^/]+))?$/);
      if (mediaMatch) {
        const slug = mediaMatch[1];
        const kind = mediaMatch[2];
        const requestedFilename = mediaMatch[3] ? decodeURIComponent(mediaMatch[3]) : null;
        const manifest = await readManifest(env.MEDIA_BUCKET, slug);
        if (!manifest || manifest.status !== "published") {
          return jsonResponse({ ok: false, error: "Track introuvable." }, 404);
        }

        const filename = manifest.assets?.[kind];
        if (!filename || (requestedFilename && requestedFilename !== filename)) {
          return jsonResponse({ ok: false, error: "Média introuvable." }, 404);
        }
        return streamR2Object(request, env.MEDIA_BUCKET, trackPrefix(slug) + filename);
      }

      return jsonResponse({ ok: false, error: "Route introuvable." }, 404);
    } catch (error) {
      console.error(error);
      return jsonResponse({
        ok: false,
        error: "Erreur interne.",
        details: error instanceof Error ? error.message : "Erreur inconnue.",
      }, 500);
    }
  },
};

async function listPublishedTracks(bucket, origin, includeLyrics) {
  const index = await readCatalogIndex(bucket);
  let manifests = index?.tracks;

  if (!Array.isArray(manifests)) {
    const objects = await listAllObjects(bucket, TRACKS_PREFIX);
    const manifestObjects = objects.filter(object => object.key.endsWith("/" + MANIFEST_NAME));
    manifests = (await Promise.all(manifestObjects.map(async object => {
      const slug = object.key.slice(TRACKS_PREFIX.length, -(MANIFEST_NAME.length + 1));
      return readManifest(bucket, slug);
    }))).filter(Boolean);
  }

  const tracks = (await Promise.all(manifests.map(async manifest => {
    if (!manifest || manifest.status !== "published") return null;
    return publicTrack(manifest, bucket, origin, includeLyrics);
  }))).filter(Boolean);

  tracks.sort((a, b) => {
    const aDate = Date.parse(a.releaseDate || "") || 0;
    const bDate = Date.parse(b.releaseDate || "") || 0;
    if (aDate !== bDate) return bDate - aDate;
    if ((a.year || 0) !== (b.year || 0)) return (b.year || 0) - (a.year || 0);
    return a.title.localeCompare(b.title, "fr", { sensitivity: "base" });
  });
  return tracks;
}

async function getPublishedTrack(bucket, slug, origin, includeLyrics) {
  const manifest = await readManifest(bucket, slug);
  if (!manifest || manifest.status !== "published") return null;
  return publicTrack(manifest, bucket, origin, includeLyrics);
}

async function publicTrack(manifest, bucket, origin, includeLyrics) {
  const assets = Object.fromEntries(ASSET_KINDS.map(kind => {
    const filename = manifest.assets?.[kind];
    if (!filename) return [kind, null];
    return [kind, {
      originalName: filename,
      filename,
      contentType: guessContentType(getExtension(filename)),
      size: null,
      uploaded: manifest.updatedAt || manifest.createdAt || null,
      url: mediaUrl(origin, manifest, kind, filename),
    }];
  }));

  // The catalog uses a 512px WebP thumbnail for immediate UI rendering.
  // The original artwork remains available through fullUrl for detailed views.
  if (assets.thumbnail && assets.cover) {
    assets.cover = {
      ...assets.thumbnail,
      originalName: assets.cover.originalName,
      fullUrl: assets.cover.url,
      optimized: true,
    };
  }

  let lyrics = null;
  let timestampsAvailable = false;
  if (includeLyrics && assets.lyrics) {
    const object = await bucket.get(trackPrefix(manifest.slug) + manifest.assets.lyrics);
    if (!object) {
      assets.lyrics = null;
    } else if (object.size <= MAX_LYRICS_BYTES) {
      const raw = await object.text();
      lyrics = { raw, segments: parseLyricSegments(raw) };
      timestampsAvailable = detectTimestamps(raw);
      assets.lyrics.size = object.size;
      assets.lyrics.uploaded = object.uploaded ? object.uploaded.toISOString() : assets.lyrics.uploaded;
      assets.lyrics.contentType = object.httpMetadata?.contentType || assets.lyrics.contentType;
    }
  }

  return {
    slug: manifest.slug,
    title: manifest.title,
    status: manifest.status,
    type: manifest.type,
    year: manifest.year,
    releaseDate: manifest.releaseDate,
    album: manifest.album,
    genres: manifest.genres || [],
    tags: manifest.tags || manifest.genres || [],
    moods: manifest.moods || [],
    themes: manifest.themes || [],
    era: manifest.era,
    energy: manifest.energy,
    languages: manifest.languages || [],
    bpm: manifest.bpm,
    key: manifest.key,
    keyConfidence: manifest.keyConfidence,
    explicit: manifest.explicit,
    duration: manifest.duration,
    accent: manifest.accent,
    accent2: manifest.accent2,
    lyricsAvailable: Boolean(assets.lyrics),
    timestampsAvailable,
    assets,
    urls: { self: origin + "/tracks/" + encodeURIComponent(manifest.slug) },
    ...(includeLyrics ? { lyrics } : {}),
  };
}

function mediaUrl(origin, manifest, kind, filename) {
  const url = new URL(
    "/media/" + encodeURIComponent(manifest.slug) + "/" + kind + "/" + encodeURIComponent(filename),
    origin
  );
  const version = manifest.updatedAt || manifest.createdAt || manifest.schemaVersion || 1;
  url.searchParams.set("v", String(version));
  return url.href;
}

async function readCatalogIndex(bucket) {
  const object = await bucket.get(CATALOG_INDEX_KEY);
  if (!object) return null;
  try {
    const index = JSON.parse(await object.text());
    if (index?.schemaVersion !== 1 || !Array.isArray(index.tracks)) return null;
    return index;
  } catch {
    return null;
  }
}

async function readManifest(bucket, slug) {
  const object = await bucket.get(trackPrefix(slug) + MANIFEST_NAME);
  if (!object) return null;
  try {
    const manifest = JSON.parse(await object.text());
    if (manifest?.schemaVersion !== 1 || manifest.slug !== slug) return null;
    return manifest;
  } catch {
    return null;
  }
}

async function listAllObjects(bucket, prefix) {
  const objects = [];
  let cursor;
  for (let page = 0; page < MAX_LIST_PAGES; page += 1) {
    const result = await bucket.list({ prefix, cursor, limit: 1000 });
    objects.push(...result.objects);
    if (!result.truncated || !result.cursor) return objects;
    cursor = result.cursor;
  }
  throw new Error("Le catalogue dépasse la pagination configurée.");
}

async function streamR2Object(request, bucket, key) {
  const rangeHeader = request.headers.get("range");
  let object;

  if (rangeHeader) {
    const parsedRange = parseRangeHeader(rangeHeader);
    if (!parsedRange) return new Response(null, { status: 416, headers: corsHeaders() });
    object = await bucket.get(key, { range: parsedRange });
  } else {
    object = await bucket.get(key);
  }

  if (!object) return jsonResponse({ ok: false, error: "Média introuvable." }, 404);

  const headers = new Headers(corsHeaders());
  object.writeHttpMetadata(headers);
  headers.set("ETag", object.httpEtag);
  headers.set("Accept-Ranges", "bytes");
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("Cross-Origin-Resource-Policy", "cross-origin");
  headers.set("Timing-Allow-Origin", "*");
  headers.set("Cache-Control", "public, max-age=31536000, immutable");

  const body = request.method === "HEAD" ? null : object.body;
  if (object.range) {
    const start = object.range.offset;
    const end = start + object.range.length - 1;
    headers.set("Content-Range", "bytes " + start + "-" + end + "/" + object.size);
    headers.set("Content-Length", String(object.range.length));
    return new Response(body, { status: 206, headers });
  }

  headers.set("Content-Length", String(object.size));
  return new Response(body, { status: 200, headers });
}

function parseRangeHeader(value) {
  const match = String(value || "").match(/^bytes=(\d*)-(\d*)$/);
  if (!match) return null;
  const start = match[1] ? Number(match[1]) : null;
  const end = match[2] ? Number(match[2]) : null;
  if (start !== null && end !== null && end < start) return null;
  if (start !== null) return end === null ? { offset: start } : { offset: start, length: end - start + 1 };
  if (end !== null && end > 0) return { suffix: end };
  return null;
}

function parseLyricSegments(raw) {
  const normalized = stripMetadataHeader(String(raw || "").replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n"));
  const timestamped = [];
  const timedPattern = /^\[(\d{1,2}):(\d{2}(?:\.\d{1,3})?)]\s*(.*)$/;
  for (const line of normalized.split("\n")) {
    const match = line.match(timedPattern);
    if (match) timestamped.push({ time: Number(match[1]) * 60 + Number(match[2]), text: match[3].trim() });
  }
  if (timestamped.length) return timestamped;

  const sections = [];
  let current = { label: "Lyrics", lines: [] };
  for (const rawLine of normalized.split("\n")) {
    const line = rawLine.trim();
    const heading = line.match(/^\[(.+)]$/);
    if (heading) {
      if (current.lines.length || current.label !== "Lyrics") sections.push(current);
      current = { label: heading[1].trim(), lines: [] };
    } else if (line) {
      current.lines.push(line);
    }
  }
  if (current.lines.length || current.label !== "Lyrics") sections.push(current);
  return sections;
}

function stripMetadataHeader(text) {
  const marker = text.match(/^LYRICS\s*:\s*$/im);
  return marker ? text.slice(marker.index + marker[0].length).trim() : text.trim();
}
function detectTimestamps(text) { return /^\[\d{1,2}:\d{2}(?:\.\d{1,3})?]/m.test(stripMetadataHeader(text)); }
function trackPrefix(slug) { return TRACKS_PREFIX + slug + "/"; }
function getExtension(filename) { const value = String(filename || "").toLowerCase(); const dot = value.lastIndexOf("."); return dot >= 0 ? value.slice(dot + 1).split(/[?#]/)[0] : ""; }
function guessContentType(extension) {
  const map = { jpg:"image/jpeg", jpeg:"image/jpeg", png:"image/png", webp:"image/webp", gif:"image/gif", mp3:"audio/mpeg", wav:"audio/wav", flac:"audio/flac", m4a:"audio/mp4", aac:"audio/aac", ogg:"audio/ogg", mp4:"video/mp4", webm:"video/webm", txt:"text/plain; charset=utf-8", json:"application/json; charset=utf-8" };
  return map[extension] || "application/octet-stream";
}
function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
    "Access-Control-Allow-Headers": "Range, If-None-Match, Content-Type",
    "Access-Control-Expose-Headers": "Accept-Ranges, Content-Length, Content-Range, ETag",
    "Vary": "Origin",
  };
}
function jsonResponse(payload, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(payload, null, 2), {
    status,
    headers: {
      ...corsHeaders(),
      "Content-Type": "application/json; charset=utf-8",
      "X-Content-Type-Options": "nosniff",
      ...extraHeaders,
    },
  });
}
