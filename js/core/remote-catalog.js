import { mergeRemoteTracks } from './catalog-store.js';

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

function shouldUseBundledCatalog() {
  if (globalThis.SHINOBIWAN_MEDIA_API) return false;
  const hostname = globalThis.location?.hostname;
  return hostname === '127.0.0.1' || hostname === 'localhost';
}

function normalizeLanguages(values) {
  const source = Array.isArray(values) ? values : [];
  return [...new Set(
    source
      .map(value => LANGUAGE_MAP.get(String(value).trim().toLowerCase()))
      .filter(Boolean)
  )];
}

function paletteFor(value) {
  const input = String(value || 'remote');
  let hash = 0;
  for (const character of input) {
    hash = ((hash << 5) - hash + character.charCodeAt(0)) | 0;
  }
  return GENRE_PALETTES[Math.abs(hash) % GENRE_PALETTES.length];
}

function finiteOrNull(value) {
  return Number.isFinite(value) ? value : null;
}

function buildSearchText(track) {
  return [
    track.title,
    track.genre,
    ...(track.tags || []),
    track.mood,
    track.album,
    ...(track.languages || []),
    track.remoteMetadata?.era,
    ...(track.remoteMetadata?.themes || [])
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

function mapRemoteTrack(item) {
  if (!item?.slug || !item?.assets?.audio?.url) return null;

  const genres = Array.isArray(item.genres) && item.genres.length
    ? item.genres.filter(Boolean)
    : ['Other'];
  const tags = Array.isArray(item.tags) && item.tags.length
    ? item.tags.filter(Boolean)
    : genres;
  const moods = Array.isArray(item.moods) ? item.moods.filter(Boolean) : [];
  const fallbackPalette = paletteFor(item.slug);
  const languages = normalizeLanguages(item.languages);
  const albumId = item.album?.id || 'singles';
  const album = item.album?.title || 'Singles';

  const track = {
    id: item.slug,
    title: item.title || item.slug,
    file: item.assets.audio.url,
    audioContentType: item.assets.audio?.contentType || null,
    cover: item.assets.cover?.url || FALLBACK_COVER,
    coverContentType: item.assets.cover?.contentType || null,
    coverFilename: item.assets.cover?.filename || null,
    genre: genres[0],
    tags: [...new Set([...tags, ...genres])],
    mood: moods.join(', ') || item.energy || 'Independent release',
    albumId,
    album,
    lyrics: item.assets.lyrics?.url || null,
    accent: /^#[0-9a-f]{6}$/i.test(item.accent || '') ? item.accent : fallbackPalette[0],
    accent2: /^#[0-9a-f]{6}$/i.test(item.accent2 || '') ? item.accent2 : fallbackPalette[1],
    releaseDate: item.releaseDate || null,
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
      moods,
      themes: Array.isArray(item.themes) ? item.themes.filter(Boolean) : [],
      era: item.era || null,
      energy: item.energy || null,
      timestampsAvailable: item.timestampsAvailable === true,
      apiUrl: item.urls?.self || null
    }
  };

  track.searchText = buildSearchText(track);
  return track;
}

export async function fetchRemoteTracks({
  apiUrl = globalThis.SHINOBIWAN_MEDIA_API || DEFAULT_API_URL,
  timeoutMs = FETCH_TIMEOUT_MS
} = {}) {
  if (shouldUseBundledCatalog()) return [];

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${normalizeApiUrl(apiUrl)}/tracks`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      cache: 'default',
      signal: controller.signal
    });

    if (!response.ok) {
      throw new Error(`Remote catalog request failed with HTTP ${response.status}.`);
    }

    const payload = await response.json();
    if (!payload?.ok || !Array.isArray(payload.tracks)) {
      throw new Error('Remote catalog response is invalid.');
    }

    return payload.tracks.map(mapRemoteTrack).filter(Boolean);
  } finally {
    clearTimeout(timeout);
  }
}

export async function hydrateRemoteCatalog(options = {}) {
  const remoteTracks = await fetchRemoteTracks(options);
  return {
    ...mergeRemoteTracks(remoteTracks),
    remoteCount: remoteTracks.length
  };
}
