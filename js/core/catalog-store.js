import { albums as sourceAlbums, journeyEras as sourceJourneyEras } from '../catalog.js';
import { normalizeTrackSchema } from './catalog-schema.js';
import { CANONICAL_ALBUM_STATUSES, CANONICAL_ALBUM_TYPES, normalizeAlbumSchema } from './catalog-schema.js';

const ALLOWED_LANGUAGES = ['French', 'English', 'Vietnamese'];
const ERA_QUEUE_PREFIX = 'era:';

const legacyAlbums = sourceAlbums.map((album, index) => normalizeAlbumSchema({
  ...album,
  status: 'published',
  source: 'legacy-catalog-js',
}, index));

export const albums = [...legacyAlbums];
export const canonicalAlbums = [];
export const journeyEras = sourceJourneyEras;
export const tracks = [];

const legacyAlbumById = new Map(legacyAlbums.map(album => [album.id, album]));
const canonicalAlbumById = new Map();
const albumById = new Map();
const trackById = new Map();
const trackIndexById = new Map();

function canonicalEraValue(value) {
  return String(value ?? '')
    .normalize('NFKC')
    .replace(/[\u00a0\u2007\u202f]/g, ' ')
    .replace(/[\s_\u2010-\u2015\u2212-]+/g, ' ')
    .trim()
    .toLocaleLowerCase('en');
}

function decodeEraQueueId(value) {
  const id = String(value ?? '');
  if (!id.startsWith(ERA_QUEUE_PREFIX)) return null;
  const encoded = id.slice(ERA_QUEUE_PREFIX.length);
  try {
    return canonicalEraValue(decodeURIComponent(encoded));
  } catch {
    return canonicalEraValue(encoded);
  }
}

function rebuildAlbumIndexes() {
  canonicalAlbumById.clear();
  canonicalAlbums.forEach(album => canonicalAlbumById.set(album.id, album));

  albumById.clear();
  legacyAlbums.forEach(album => albumById.set(album.id, album));
  canonicalAlbums.forEach(album => albumById.set(album.id, album));

  const effective = legacyAlbums.map(album => canonicalAlbumById.get(album.id) || album);
  const legacyIds = new Set(legacyAlbums.map(album => album.id));
  effective.push(...canonicalAlbums.filter(album => !legacyIds.has(album.id)));
  albums.splice(0, albums.length, ...effective);
}

function rebuildTrackIndexes() {
  trackById.clear();
  trackIndexById.clear();
  tracks.forEach((track, index) => {
    trackById.set(track.id, track);
    trackIndexById.set(track.id, index);
  });
}

export function reindexCatalog() {
  rebuildAlbumIndexes();
  rebuildTrackIndexes();
  return tracks;
}

function mergeSearchText(track) {
  return [
    track.searchText,
    track.title,
    track.genre,
    Array.isArray(track.genres) ? track.genres.join(' ') : '',
    Array.isArray(track.tags) ? track.tags.join(' ') : '',
    track.mood,
    Array.isArray(track.moods) ? track.moods.join(' ') : '',
    Array.isArray(track.themes) ? track.themes.join(' ') : '',
    track.album,
    Array.isArray(track.languages) ? track.languages.join(' ') : ''
  ].filter(Boolean).join(' ').toLowerCase();
}

rebuildAlbumIndexes();
rebuildTrackIndexes();

export function mergeRemoteAlbums(remoteAlbums = []) {
  const normalized = Array.isArray(remoteAlbums)
    ? remoteAlbums
      .map((album, index) => normalizeAlbumSchema({ ...album, source: album?.source || 'cloudflare-r2' }, index))
      .filter(album => album.id)
    : [];

  canonicalAlbums.splice(0, canonicalAlbums.length, ...normalized);
  rebuildAlbumIndexes();
  return {
    canonical: canonicalAlbums.length,
    effective: albums.length,
    legacyFallback: albums.filter(album => !canonicalAlbumById.has(album.id)).length,
  };
}

export function mergeRemoteTracks(remoteTracks = []) {
  if (!Array.isArray(remoteTracks) || remoteTracks.length === 0) {
    return { added: 0, updated: 0, total: tracks.length };
  }

  let added = 0;
  let updated = 0;

  remoteTracks.forEach((remoteTrack, importIndex) => {
    if (!remoteTrack?.id && !remoteTrack?.slug) return;
    const normalizedRemote = normalizeTrackSchema(remoteTrack, importIndex);
    const existingIndex = trackIndexById.has(normalizedRemote.id) ? trackIndexById.get(normalizedRemote.id) : -1;

    if (existingIndex >= 0) {
      const existing = normalizeTrackSchema(tracks[existingIndex], existingIndex);
      const merged = normalizeTrackSchema({
        ...existing,
        ...normalizedRemote,
        file: normalizedRemote.file || existing.file,
        cover: normalizedRemote.cover || existing.cover,
        lyrics: normalizedRemote.lyrics || existing.lyrics,
        tags: [...new Set([
          ...(Array.isArray(existing.tags) ? existing.tags : []),
          ...(Array.isArray(normalizedRemote.tags) ? normalizedRemote.tags : [])
        ].filter(Boolean))],
        remoteAvailable: true,
        remoteMetadata: normalizedRemote.remoteMetadata || existing.remoteMetadata || null
      }, existingIndex);
      merged.searchText = mergeSearchText(merged);
      tracks[existingIndex] = merged;
      updated += 1;
      return;
    }

    const addedTrack = normalizeTrackSchema(normalizedRemote, tracks.length);
    addedTrack.searchText = mergeSearchText(addedTrack);
    tracks.push(addedTrack);
    added += 1;
  });

  rebuildTrackIndexes();
  return { added, updated, total: tracks.length };
}

export function getAlbum(albumId) { return albumById.get(albumId) || null; }
export function getCanonicalAlbum(albumId) { return canonicalAlbumById.get(albumId) || null; }
export function hasCanonicalAlbum(albumId) { return canonicalAlbumById.has(albumId); }
export function getTrack(trackId) { return trackById.get(trackId) || null; }
export function getTrackIndex(trackId) { return trackIndexById.has(trackId) ? trackIndexById.get(trackId) : -1; }
export function getAlbumTracks(albumId) {
  const canonical = canonicalAlbumById.get(albumId);
  if (canonical) {
    return canonical.trackIds
      .map(trackId => {
        const index = getTrackIndex(trackId);
        return index >= 0 ? { ...tracks[index], index } : null;
      })
      .filter(Boolean);
  }
  return tracks.map((track, index) => ({ ...track, index })).filter(track => track.albumId === albumId);
}
export function getEraTrackIndexes(eraValue) {
  const expected = canonicalEraValue(eraValue);
  if (!expected) return [];
  return tracks
    .map((track, index) => ({ track, index }))
    .filter(({ track }) => canonicalEraValue(track?.remoteMetadata?.era || track?.era) === expected)
    .map(({ index }) => index);
}
export function getAlbumTrackIndexes(albumId) {
  const virtualEra = decodeEraQueueId(albumId);
  return virtualEra ? getEraTrackIndexes(virtualEra) : getAlbumTracks(albumId).map(track => track.index);
}
export function getCatalogTags() { return [...new Set(tracks.flatMap(track => Array.isArray(track.tags) ? track.tags : [track.genre]).filter(Boolean))]; }
export function getGenreCounts() { return tracks.reduce((counts, track) => { counts[track.genre] = (counts[track.genre] || 0) + 1; return counts; }, {}); }

function parseTimestamp(value) {
  if (!value) return null;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : null;
}

function releaseSortInfo(track, index) {
  const release = parseTimestamp(track.releaseDate || track.releasedAt || track.date);
  if (release !== null) return { timestamp: release, source: 'releaseDate', fallback: false };
  const created = parseTimestamp(track.createdAt || track.created_at || track.importedAt || track.migration?.importedAt);
  if (created !== null) return { timestamp: created, source: 'createdAt', fallback: true };
  const updated = parseTimestamp(track.updatedAt || track.updated_at);
  if (updated !== null) return { timestamp: updated, source: 'updatedAt', fallback: true };
  const sequence = Number(track.sequence ?? track.order ?? track.position ?? track.importIndex ?? index);
  return { timestamp: Number.isFinite(sequence) ? sequence : index, source: 'sequence', fallback: true };
}

export function getLatestTrackEntries(limit = 5, now = Date.now()) {
  return tracks
    .map((track, index) => ({ track, index, sort: releaseSortInfo(track, index) }))
    .filter(({ track }) => {
      const status = String(track.status || 'published').toLowerCase();
      if (status === 'draft' || status === 'archived' || status === 'upcoming' || track.active === false) return false;
      const officialRelease = parseTimestamp(track.releaseDate || track.releasedAt || track.date);
      return officialRelease === null || officialRelease <= now;
    })
    .sort((a, b) => b.sort.timestamp - a.sort.timestamp || b.index - a.index)
    .slice(0, limit);
}

export function validateCatalogRuntime() {
  const errors = [];
  const warnings = [];
  const albumIds = new Set();
  const trackIds = new Set();
  const allowedLanguages = new Set(ALLOWED_LANGUAGES);
  const allowedAlbumTypes = new Set(CANONICAL_ALBUM_TYPES);
  const allowedAlbumStatuses = new Set(CANONICAL_ALBUM_STATUSES);
  const hexPattern = /^#[0-9a-f]{6}$/i;
  const keyPattern = /^[A-G](?:#|b)? (?:major|minor)$/i;

  albums.forEach((album, index) => {
    const canonical = canonicalAlbumById.has(album.id);
    if (!album?.id) errors.push(`Album ${index + 1}: missing id.`);
    if (!album?.title) errors.push(`Album ${album?.id || index + 1}: missing title.`);
    if (albumIds.has(album.id)) errors.push(`Duplicate album id: ${album.id}.`);
    albumIds.add(album.id);
    if (canonical && !allowedAlbumTypes.has(album.type)) errors.push(`Album ${album.id}: unsupported canonical type "${album.type}".`);
    if (canonical && !allowedAlbumStatuses.has(album.status)) errors.push(`Album ${album.id}: unsupported canonical status "${album.status}".`);
    if (album.status === 'published' && !album.cover) errors.push(`Album ${album.id}: missing cover.`);
    if (canonical && !Array.isArray(album.trackIds)) errors.push(`Album ${album.id}: trackIds must be an ordered array.`);
  });

  tracks.forEach((track, index) => {
    const label = track?.id || `track ${index + 1}`;
    const isRemote = track?.remote === true;
    if (!track?.id) errors.push(`Track ${index + 1}: missing id.`);
    if (trackIds.has(track.id)) errors.push(`Duplicate track id: ${track.id}.`);
    trackIds.add(track.id);
    if (!track.title) errors.push(`${label}: missing title.`);
    if (!track.file) errors.push(`${label}: missing audio file.`);
    if (!track.cover) errors.push(`${label}: missing cover.`);
    if (!track.albumId || !albumIds.has(track.albumId)) errors.push(`${label}: unknown albumId "${track.albumId || ''}".`);
    if (track.releaseDate && !Number.isFinite(Date.parse(track.releaseDate))) errors.push(`${label}: invalid releaseDate "${track.releaseDate}".`);
    if (!Array.isArray(track.languages) || track.languages.length === 0) errors.push(`${label}: at least one language is required.`);
    else track.languages.forEach(language => { if (!allowedLanguages.has(language)) errors.push(`${label}: unsupported language "${language}".`); });

    if (isRemote && track.bpm === null) warnings.push(`${label}: BPM is not available from the remote catalog.`);
    else if (!Number.isInteger(track.bpm) || track.bpm < 30 || track.bpm > 240) errors.push(`${label}: bpm must be an integer between 30 and 240.`);

    if (isRemote && track.key === null) warnings.push(`${label}: musical key is not available from the remote catalog.`);
    else if (!keyPattern.test(track.key || '')) errors.push(`${label}: key must use a value such as "F# minor".`);

    if (isRemote && track.keyConfidence === null) warnings.push(`${label}: key confidence is not available from the remote catalog.`);
    else if (!Number.isFinite(track.keyConfidence) || track.keyConfidence < 0 || track.keyConfidence > 1) errors.push(`${label}: keyConfidence must be between 0 and 1.`);
    else if (track.keyConfidence < 0.5) warnings.push(`${label}: musical key has low analysis confidence.`);

    if (track.explicit !== null && typeof track.explicit !== 'boolean') errors.push(`${label}: explicit must be true, false or null.`);
    else if (track.explicit === null) warnings.push(`${label}: explicit status is not reviewed.`);

    if (isRemote && track.duration === null) warnings.push(`${label}: duration will be read from the audio element.`);
    else if (!Number.isFinite(track.duration) || track.duration <= 0) errors.push(`${label}: duration must be a positive number of seconds.`);

    ['accent', 'accent2'].forEach(field => { if (track[field] && !hexPattern.test(track[field])) errors.push(`${label}: ${field} must be a six-digit hex colour.`); });
    if (!track.lyrics) warnings.push(`${label}: lyrics unavailable.`);
  });

  canonicalAlbums.forEach(album => {
    album.trackIds.forEach(trackId => {
      if (!trackIds.has(trackId)) errors.push(`Album ${album.id}: unknown trackId "${trackId}" in canonical order.`);
    });
  });

  tracks.forEach(track => {
    const canonical = canonicalAlbumById.get(track.albumId);
    if (canonical && !canonical.trackIds.includes(track.id)) {
      warnings.push(`${track.id}: compatibility album cache points to ${canonical.id}, but canonical album.trackIds does not contain the track.`);
    }
  });

  return { errors, warnings, valid: errors.length === 0 };
}
