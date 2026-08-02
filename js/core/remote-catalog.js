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

function buildSearchText(track) {
  return [
    track.title,
    track.genre,
    ...(track.tags || []),
    track.mood,
    track.album,
    ...(track.languages || [])
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
  const moods = Array.isArray(item.moods) ? item.moods.filter(Boolean) : [];
  const [accent, accent2] = paletteFor(item.slug);
  const languages = normalizeLanguages(item.languages);

  const track = {
    id: item.slug,
    title: item.title || item.slug,
    file: item.assets.audio.url,
    cover: item.assets.cover?.url || FALLBACK_COVER,
    genre: genres[0],
    tags: [...new Set(genres)],
    mood: moods.join(', ') || item.energy || 'Independent release',
    albumId: 'singles',
    album: 'Singles',
    lyrics: item.assets.lyrics?.url || null,
    accent,
    accent2,
    releaseDate: null,
    languages: languages.length ? languages : ['English'],
    bpm: null,
    key: null,
    keyConfidence: null,
    explicit: null,
    duration: null,
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
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${normalizeApiUrl(apiUrl)}/tracks`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      cache: 'no-store',
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
