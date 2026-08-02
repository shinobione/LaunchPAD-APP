import { albums as sourceAlbums, tracks as sourceTracks } from '../catalog.js?v=20260802-wave1';

export const albums = sourceAlbums;
export const tracks = sourceTracks;

const albumById = new Map(albums.map(album => [album.id, album]));
const trackById = new Map(tracks.map(track => [track.id, track]));
const trackIndexById = new Map(tracks.map((track, index) => [track.id, index]));

export function getAlbum(albumId) {
  return albumById.get(albumId) || null;
}

export function getTrack(trackId) {
  return trackById.get(trackId) || null;
}

export function getTrackIndex(trackId) {
  return trackIndexById.has(trackId) ? trackIndexById.get(trackId) : -1;
}

export function getAlbumTracks(albumId) {
  return tracks
    .map((track, index) => ({ ...track, index }))
    .filter(track => track.albumId === albumId);
}

export function getAlbumTrackIndexes(albumId) {
  return getAlbumTracks(albumId).map(track => track.index);
}

export function getCatalogTags() {
  return [...new Set(
    tracks.flatMap(track => Array.isArray(track.tags) ? track.tags : [track.genre]).filter(Boolean)
  )];
}

export function getGenreCounts() {
  return tracks.reduce((counts, track) => {
    counts[track.genre] = (counts[track.genre] || 0) + 1;
    return counts;
  }, {});
}

function releaseTimestamp(track) {
  const value = track.releaseDate || track.releasedAt || track.date;
  if (!value) return null;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : null;
}

export function getLatestTrackEntries(limit = 5) {
  return tracks
    .map((track, index) => ({ track, index, timestamp: releaseTimestamp(track) }))
    .sort((a, b) => {
      const aHasDate = a.timestamp !== null;
      const bHasDate = b.timestamp !== null;

      if (aHasDate && bHasDate && a.timestamp !== b.timestamp) {
        return b.timestamp - a.timestamp;
      }

      if (aHasDate !== bHasDate) {
        return aHasDate ? -1 : 1;
      }

      return b.index - a.index;
    })
    .slice(0, limit);
}

export function validateCatalogRuntime() {
  const errors = [];
  const warnings = [];
  const albumIds = new Set();
  const trackIds = new Set();
  const hexPattern = /^#[0-9a-f]{6}$/i;

  albums.forEach((album, index) => {
    if (!album?.id) errors.push(`Album ${index + 1}: missing id.`);
    if (!album?.title) errors.push(`Album ${album?.id || index + 1}: missing title.`);
    if (albumIds.has(album.id)) errors.push(`Duplicate album id: ${album.id}.`);
    albumIds.add(album.id);
    if (!album.cover) errors.push(`Album ${album.id}: missing cover.`);
  });

  tracks.forEach((track, index) => {
    const label = track?.id || `track ${index + 1}`;
    if (!track?.id) errors.push(`Track ${index + 1}: missing id.`);
    if (trackIds.has(track.id)) errors.push(`Duplicate track id: ${track.id}.`);
    trackIds.add(track.id);
    if (!track.title) errors.push(`${label}: missing title.`);
    if (!track.file) errors.push(`${label}: missing audio file.`);
    if (!track.cover) errors.push(`${label}: missing cover.`);
    if (!track.albumId || !albumIds.has(track.albumId)) {
      errors.push(`${label}: unknown albumId "${track.albumId || ''}".`);
    }
    if (track.releaseDate && !Number.isFinite(Date.parse(track.releaseDate))) {
      errors.push(`${label}: invalid releaseDate "${track.releaseDate}".`);
    }
    ['accent', 'accent2'].forEach(field => {
      if (track[field] && !hexPattern.test(track[field])) {
        errors.push(`${label}: ${field} must be a six-digit hex colour.`);
      }
    });
    if (!track.lyrics) warnings.push(`${label}: lyrics unavailable.`);
  });

  return { errors, warnings, valid: errors.length === 0 };
}
