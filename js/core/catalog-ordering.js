import { tracks, reindexCatalog } from './catalog-store.js';

function timestamp(value) {
  if (!value) return null;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function numericSequence(track, index) {
  const candidates = [
    track.sequence,
    track.order,
    track.position,
    track.importIndex,
    track.remoteMetadata?.sequence
  ];
  for (const candidate of candidates) {
    const value = Number(candidate);
    if (Number.isFinite(value)) return value;
  }
  const idMatch = String(track.id || '').match(/(?:^|[-_])(\d+)$/);
  return idMatch ? Number(idMatch[1]) : index;
}

export function releaseDateTimestamp(track) {
  return timestamp(track.releaseDate)
    ?? timestamp(track.releasedAt)
    ?? timestamp(track.date);
}

export function createdTimestamp(track) {
  return timestamp(track.createdAt)
    ?? timestamp(track.created_at)
    ?? timestamp(track.importedAt)
    ?? timestamp(track.migration?.importedAt);
}

export function updatedTimestamp(track) {
  return timestamp(track.updatedAt)
    ?? timestamp(track.updated_at);
}

export function releaseSortInfo(track, index = 0) {
  const release = releaseDateTimestamp(track);
  if (release !== null) return { timestamp: release, source: 'releaseDate', fallback: false };

  const created = createdTimestamp(track);
  if (created !== null) return { timestamp: created, source: 'createdAt', fallback: true };

  const updated = updatedTimestamp(track);
  if (updated !== null) return { timestamp: updated, source: 'updatedAt', fallback: true };

  return {
    timestamp: numericSequence(track, index),
    source: 'sequence',
    fallback: true
  };
}

export function releaseSortTimestamp(track, index = 0) {
  return releaseSortInfo(track, index).timestamp;
}

function compareByRelease(left, right) {
  const leftIndex = left.index ?? 0;
  const rightIndex = right.index ?? 0;
  const leftInfo = releaseSortInfo(left.track ?? left, leftIndex);
  const rightInfo = releaseSortInfo(right.track ?? right, rightIndex);
  if (leftInfo.timestamp !== rightInfo.timestamp) return rightInfo.timestamp - leftInfo.timestamp;

  const sequenceDifference = numericSequence(right.track ?? right, rightIndex)
    - numericSequence(left.track ?? left, leftIndex);
  if (sequenceDifference) return sequenceDifference;

  return String(left.track?.id ?? left.id ?? '').localeCompare(
    String(right.track?.id ?? right.id ?? ''),
    'en',
    { numeric: true, sensitivity: 'base' }
  );
}

export function compareTracksNewestFirst(left, right) {
  return compareByRelease(left, right);
}

export function compareTracksRecentlyAdded(left, right) {
  const leftTrack = left.track ?? left;
  const rightTrack = right.track ?? right;
  const leftIndex = left.index ?? 0;
  const rightIndex = right.index ?? 0;
  const leftTime = createdTimestamp(leftTrack) ?? updatedTimestamp(leftTrack) ?? numericSequence(leftTrack, leftIndex);
  const rightTime = createdTimestamp(rightTrack) ?? updatedTimestamp(rightTrack) ?? numericSequence(rightTrack, rightIndex);
  if (leftTime !== rightTime) return rightTime - leftTime;
  return numericSequence(rightTrack, rightIndex) - numericSequence(leftTrack, leftIndex);
}

export function harmonizeCatalogOrder(catalog = tracks) {
  catalog.sort(compareTracksNewestFirst);
  if (catalog === tracks) reindexCatalog();
  return catalog;
}

function isPublishedActive(track) {
  const status = String(track.status || 'published').toLowerCase();
  return status !== 'draft'
    && status !== 'archived'
    && status !== 'upcoming'
    && track.active !== false;
}

export function latestActiveTrackEntries(catalog = tracks, limit = 5, now = Date.now()) {
  return catalog
    .map((track, index) => ({ track, index, sort: releaseSortInfo(track, index) }))
    .filter(({ track, sort }) => {
      if (!isPublishedActive(track)) return false;
      const officialRelease = releaseDateTimestamp(track);
      if (officialRelease !== null && officialRelease > now) return false;
      return Number.isFinite(sort.timestamp);
    })
    .sort(compareTracksNewestFirst)
    .slice(0, limit);
}

export function recentlyAddedTrackEntries(catalog = tracks, limit = 5) {
  return catalog
    .map((track, index) => ({ track, index }))
    .filter(({ track }) => String(track.status || '').toLowerCase() !== 'archived' && track.active !== false)
    .sort(compareTracksRecentlyAdded)
    .slice(0, limit);
}
