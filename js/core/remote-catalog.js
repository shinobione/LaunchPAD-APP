import { mergeRemoteAlbums, mergeRemoteTracks } from './catalog-store.js';
import { normalizeAlbumSchema, normalizeTrackSchema } from './catalog-schema.js';

const DEFAULT_API_URL = 'https://launchpad-media.jerryquinet.workers.dev';
const FETCH_TIMEOUT_MS = 4500;
const FALLBACK_COVER = 'assets/singles.jpeg';

const LANGUAGE_MAP = new Map([
  ['english', 'English'],
  ['french', 'French'],
  ['vietnamese', 'Vietnamese']
]);

const GENRE_PALETTES = [
  ['#1db954', '#22d3ee'],
  ['#ff4f8b', '#7c4dff'],
  ['#ff8a3d', '#f2b84b'],
  ['#41d6ff', '#8a52ff'],
  ['#ff3f5f', '#7d34ff'],
  ['#d13cff', '#ff4b74']
];

function normalizeApiUrl(value) {
  return String(value || DEFAULT_API_URL).replace(/\/+$/, '');
}

function shouldUseCatalogFixture() {
  if (globalThis.SHINOBIWAN_MEDIA_API) return false;
  const hostname = globalThis.location?.hostname;
  return hostname === '127.0.0.1' || hostname === 'localhost';
}

function normalizeLanguages(values) {
  const source = Array.isArray(values) ? values : [];
  return [...new Set(source.map(value => LANGUAGE_MAP.get(String(value).trim().toLowerCase())).filter(Boolean))];
}

function paletteFor(value) {
  const input = String(value || 'remote');
  let hash = 0;
  for (const character of input) hash = ((hash << 5) - hash + character.charCodeAt(0)) | 0;
  return GENRE_PALETTES[Math.abs(hash) % GENRE_PALETTES.length];
}

function finiteOrNull(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function timestampState(value) {
  if (value === true) return true;
  if (value === false) return false;
  return null;
}

function firstTimestamp(...values) {
  return values.find(value => value && Number.isFinite(Date.parse(value))) || null;
}

function buildSearchText(track) {
  return [track.title, track.genre, ...(track.tags || []), track.mood, track.album,
    ...(track.languages || []), track.remoteMetadata?.era, ...(track.remoteMetadata?.themes || [])]
    .filter(Boolean).join(' ').toLowerCase();
}

function mapRemoteAlbum(item, importIndex = 0) {
  if (!item?.id) return null;
  return normalizeAlbumSchema({
    ...item,
    source: item.source || 'cloudflare-r2',
  }, importIndex);
}

function mapRemoteTrack(item, activeApiUrl = DEFAULT_API_URL, importIndex = 0) {
  if (!item?.slug || !item?.assets?.audio?.url) return null;
  const genres = Array.isArray(item.genres) && item.genres.length ? item.genres.filter(Boolean) : ['Other'];
  const tags = Array.isArray(item.tags) && item.tags.length ? item.tags.filter(Boolean) : genres;
  const moods = Array.isArray(item.moods) ? item.moods.filter(Boolean) : [];
  const themes = Array.isArray(item.themes) ? item.themes.filter(Boolean) : [];
  const fallbackPalette = paletteFor(item.slug);
  const languages = normalizeLanguages(item.languages);
  const albumId = item.album?.id || 'singles';
  const album = item.album?.title || 'Singles';
  const cover = item.assets.cover?.url || FALLBACK_COVER;
  const createdAt = firstTimestamp(item.createdAt, item.created_at, item.migration?.importedAt, item.updatedAt, item.updated_at);
  const updatedAt = firstTimestamp(item.updatedAt, item.updated_at, createdAt);

  const track = normalizeTrackSchema({
    id: item.slug,
    title: item.title || item.slug,
    file: item.assets.audio.url,
    audioContentType: item.assets.audio?.contentType || null,
    cover,
    fullCover: item.assets.cover?.fullUrl || cover,
    coverContentType: item.assets.cover?.contentType || null,
    coverFilename: item.assets.cover?.filename || null,
    video: item.assets.video?.url || null,
    videoContentType: item.assets.video?.contentType || null,
    videoFilename: item.assets.video?.filename || null,
    genre: genres[0],
    genres,
    tags: [...new Set([...tags, ...genres, ...themes])],
    mood: moods.join(', ') || item.energy || 'Independent release',
    moods,
    themes,
    albumId,
    album,
    lyrics: item.assets.lyrics?.url || null,
    accent: /^#[0-9a-f]{6}$/i.test(item.accent || '') ? item.accent : fallbackPalette[0],
    accent2: /^#[0-9a-f]{6}$/i.test(item.accent2 || '') ? item.accent2 : fallbackPalette[1],
    releaseDate: firstTimestamp(item.releaseDate, item.releasedAt, item.date),
    createdAt,
    importedAt: item.migration?.importedAt || createdAt,
    updatedAt,
    status: item.status || 'published',
    active: item.active !== false && item.status !== 'archived',
    sequence: finiteOrNull(item.sequence ?? item.order ?? item.position),
    importIndex,
    languages: languages.length ? languages : ['English'],
    bpm: Number.isInteger(item.bpm) ? item.bpm : null,
    key: typeof item.key === 'string' && item.key ? item.key : null,
    keyConfidence: finiteOrNull(item.keyConfidence),
    explicit: typeof item.explicit === 'boolean' ? item.explicit : null,
    duration: finiteOrNull(item.duration),
    remote: true,
    source: 'cloudflare-r2',
    remoteMetadata: {
      type: item.type || null,
      year: Number.isInteger(item.year) ? item.year : null,
      genres, tags, moods, themes,
      era: item.era || null,
      energy: item.energy || null,
      sequence: finiteOrNull(item.sequence ?? item.order ?? item.position),
      timestampsAvailable: timestampState(item.timestampsAvailable),
      importedAt: item.migration?.importedAt || createdAt,
      apiUrl: item.urls?.self || `${activeApiUrl}/tracks/${encodeURIComponent(item.slug)}`
    }
  }, importIndex);

  track.searchText = buildSearchText(track);
  return track;
}

async function fetchRemoteCatalogPayload({ apiUrl = globalThis.SHINOBIWAN_MEDIA_API || DEFAULT_API_URL, timeoutMs = FETCH_TIMEOUT_MS } = {}) {
  if (shouldUseCatalogFixture()) {
    const { catalogFixture } = await import('../catalog-fixture.js');
    return {
      albums: [],
      tracks: catalogFixture.map((track, index) => normalizeTrackSchema({ ...track }, index)),
      albumAuthority: null,
    };
  }

  const normalizedApiUrl = normalizeApiUrl(apiUrl);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(`${normalizedApiUrl}/tracks`, {
      method: 'GET', headers: { Accept: 'application/json' }, cache: 'no-store', signal: controller.signal
    });
    if (!response.ok) throw new Error(`Remote catalog request failed with HTTP ${response.status}.`);
    const payload = await response.json();
    if (!payload?.ok || !Array.isArray(payload.tracks)) throw new Error('Remote catalog response is invalid.');
    return {
      albums: Array.isArray(payload.albums)
        ? payload.albums.map((item, index) => mapRemoteAlbum(item, index)).filter(Boolean)
        : [],
      tracks: payload.tracks.map((item, index) => mapRemoteTrack(item, normalizedApiUrl, index)).filter(Boolean),
      albumAuthority: payload.albumAuthority === 'canonical-r2' ? 'canonical-r2' : null,
    };
  } finally {
    clearTimeout(timeout);
  }
}

export async function fetchRemoteTracks(options = {}) {
  const payload = await fetchRemoteCatalogPayload(options);
  return payload.tracks;
}

export async function fetchRemoteAlbums(options = {}) {
  const payload = await fetchRemoteCatalogPayload(options);
  return payload.albums;
}

export async function hydrateRemoteCatalog(options = {}) {
  const remote = await fetchRemoteCatalogPayload(options);
  const albumResult = mergeRemoteAlbums(remote.albums, {
    authoritative: remote.albumAuthority === 'canonical-r2',
  });
  const trackResult = mergeRemoteTracks(remote.tracks);
  return {
    ...trackResult,
    remoteCount: remote.tracks.length,
    remoteAlbumCount: remote.albums.length,
    albumAuthority: remote.albumAuthority,
    albumResult,
  };
}
