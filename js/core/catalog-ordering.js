import { tracks } from './catalog-store.js';

function timestamp(value) {
  if (!value) return null;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function numericSequence(track, index) {
  const candidates = [track.sequence, track.order, track.position, track.remoteMetadata?.sequence];
  for (const candidate of candidates) {
    const value = Number(candidate);
    if (Number.isFinite(value)) return value;
  }
  const idMatch = String(track.id || '').match(/(?:^|[-_])(\d+)$/);
  return idMatch ? Number(idMatch[1]) : index;
}

export function releaseSortTimestamp(track) {
  return timestamp(track.releaseDate)
    ?? timestamp(track.releasedAt)
    ?? timestamp(track.date)
    ?? timestamp(track.createdAt)
    ?? timestamp(track.created_at)
    ?? timestamp(track.updatedAt)
    ?? timestamp(track.updated_at);
}

export function compareTracksNewestFirst(left, right) {
  const leftTime = releaseSortTimestamp(left.track ?? left);
  const rightTime = releaseSortTimestamp(right.track ?? right);
  if (leftTime !== null || rightTime !== null) {
    if (leftTime === null) return 1;
    if (rightTime === null) return -1;
    if (leftTime !== rightTime) return rightTime - leftTime;
  }

  const leftIndex = left.index ?? 0;
  const rightIndex = right.index ?? 0;
  const sequenceDifference = numericSequence(right.track ?? right, rightIndex)
    - numericSequence(left.track ?? left, leftIndex);
  if (sequenceDifference) return sequenceDifference;

  return String(left.track?.id ?? left.id ?? '').localeCompare(
    String(right.track?.id ?? right.id ?? ''),
    'en',
    { numeric: true, sensitivity: 'base' }
  );
}

export function harmonizeCatalogOrder(catalog = tracks) {
  catalog.sort(compareTracksNewestFirst);
  return catalog;
}

export function latestActiveTrackEntries(catalog = tracks, limit = 5) {
  return catalog
    .map((track, index) => ({ track, index }))
    .filter(({ track }) => track.status !== 'draft' && track.status !== 'archived' && track.active !== false)
    .sort(compareTracksNewestFirst)
    .slice(0, limit);
}
