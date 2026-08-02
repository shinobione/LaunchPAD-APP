import { albums as sourceAlbums, tracks as sourceTracks, journeyEras as sourceJourneyEras } from '../catalog.js';
import { ALLOWED_LANGUAGES, trackMetadata } from '../catalog-metadata.js';

export const albums = sourceAlbums;
export const journeyEras = sourceJourneyEras;
export const tracks = sourceTracks.map(track => {
  const metadata = trackMetadata[track.id] || {};
  const languages = Array.isArray(metadata.languages)
    ? [...new Set(metadata.languages.filter(Boolean))]
    : [];

  const enriched = {
    ...track,
    releaseDate: metadata.releaseDate ?? track.releaseDate ?? null,
    languages,
    bpm: Number.isFinite(metadata.bpm) ? metadata.bpm : null,
    key: typeof metadata.key === 'string' ? metadata.key : null,
    keyConfidence: Number.isFinite(metadata.keyConfidence) ? metadata.keyConfidence : null,
    explicit: typeof metadata.explicit === 'boolean' ? metadata.explicit : null,
    duration: Number.isFinite(metadata.duration) ? metadata.duration : null
  };

  enriched.searchText = [
    track.searchText,
    languages.join(' '),
    enriched.bpm,
    enriched.key,
    enriched.explicit === true ? 'explicit' : enriched.explicit === false ? 'clean' : 'unrated',
    enriched.releaseDate
  ]
    .filter(value => value !== null && value !== undefined && value !== '')
    .join(' ')
    .toLowerCase();

  return enriched;
});

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
  const metadataIds = new Set(Object.keys(trackMetadata));
  const allowedLanguages = new Set(ALLOWED_LANGUAGES);
  const hexPattern = /^#[0-9a-f]{6}$/i;
  const keyPattern = /^[A-G](?:#|b)? (?:major|minor)$/;

  albums.forEach((album, index) => {
    if (!album?.id) errors.push(`Album ${index + 1}: missing id.`);
    if (!album?.title) errors.push(`Album ${album?.id || index + 1}: missing title.`);
    if (albumIds.has(album.id)) errors.push(`Duplicate album id: ${album.id}.`);
    albumIds.add(album.id);
    if (!album.cover) errors.push(`Album ${album.id}: missing cover.`);
  });

  tracks.forEach((track, index) => {
    const label = track?.id || `track ${index + 1}`;
    metadataIds.delete(track.id);

    if (!track?.id) errors.push(`Track ${index + 1}: missing id.`);
    if (trackIds.has(track.id)) errors.push(`Duplicate track id: ${track.id}.`);
    trackIds.add(track.id);
    if (!track.title) errors.push(`${label}: missing title.`);
    if (!track.file) errors.push(`${label}: missing audio file.`);
    if (!track.cover) errors.push(`${label}: missing cover.`);
    if (!track.albumId || !albumIds.has(track.albumId)) {
      errors.push(`${label}: unknown albumId "${track.albumId || ''}".`);
    }
    if (!Object.hasOwn(trackMetadata, track.id)) {
      errors.push(`${label}: missing catalog-metadata entry.`);
    }
    if (track.releaseDate && !Number.isFinite(Date.parse(track.releaseDate))) {
      errors.push(`${label}: invalid releaseDate "${track.releaseDate}".`);
    }
    if (!Array.isArray(track.languages) || track.languages.length === 0) {
      errors.push(`${label}: at least one language is required.`);
    } else {
      track.languages.forEach(language => {
        if (!allowedLanguages.has(language)) errors.push(`${label}: unsupported language "${language}".`);
      });
    }
    if (!Number.isInteger(track.bpm) || track.bpm < 30 || track.bpm > 240) {
      errors.push(`${label}: bpm must be an integer between 30 and 240.`);
    }
    if (!keyPattern.test(track.key || '')) {
      errors.push(`${label}: key must use a value such as "F# minor".`);
    }
    if (!Number.isFinite(track.keyConfidence) || track.keyConfidence < 0 || track.keyConfidence > 1) {
      errors.push(`${label}: keyConfidence must be between 0 and 1.`);
    } else if (track.keyConfidence < 0.5) {
      warnings.push(`${label}: musical key has low analysis confidence.`);
    }
    if (track.explicit !== null && typeof track.explicit !== 'boolean') {
      errors.push(`${label}: explicit must be true, false or null.`);
    } else if (track.explicit === null) {
      warnings.push(`${label}: explicit status is not reviewed.`);
    }
    if (!Number.isFinite(track.duration) || track.duration <= 0) {
      errors.push(`${label}: duration must be a positive number of seconds.`);
    }
    ['accent', 'accent2'].forEach(field => {
      if (track[field] && !hexPattern.test(track[field])) {
        errors.push(`${label}: ${field} must be a six-digit hex colour.`);
      }
    });
    if (!track.lyrics) warnings.push(`${label}: lyrics unavailable.`);
  });

  metadataIds.forEach(id => errors.push(`Unknown catalog-metadata id: ${id}.`));
  return { errors, warnings, valid: errors.length === 0 };
}
