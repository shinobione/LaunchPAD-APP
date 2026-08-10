const DATE_FIELDS = Object.freeze({
  release: ['releaseDate', 'releasedAt', 'date'],
  created: ['createdAt', 'created_at', 'importedAt'],
  updated: ['updatedAt', 'updated_at']
});

export const CANONICAL_ALBUM_TYPES = Object.freeze(['album', 'ep', 'collection']);
export const CANONICAL_ALBUM_STATUSES = Object.freeze(['draft', 'published', 'archived']);

function firstValue(source, fields) {
  for (const field of fields) {
    const value = source?.[field];
    if (value !== undefined && value !== null && value !== '') return value;
  }
  return null;
}

export function firstValidDate(source, fields) {
  for (const field of fields) {
    const value = source?.[field];
    if (!value) continue;
    const timestamp = Date.parse(value);
    if (Number.isFinite(timestamp)) return new Date(timestamp).toISOString();
  }
  return null;
}

function list(value) {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (value === undefined || value === null || value === '') return [];
  return [value].filter(Boolean);
}

function finite(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function uniqueStrings(value) {
  return [...new Set(list(value).map(item => String(item).trim()).filter(Boolean))];
}

function cleanNullable(value) {
  const clean = value === undefined || value === null ? '' : String(value).trim();
  return clean || null;
}

function albumAsset(input, kind) {
  const direct = input?.[kind];
  if (typeof direct === 'string' && direct.trim()) return direct.trim();
  const asset = input?.assets?.[kind];
  if (typeof asset === 'string' && asset.trim()) return asset.trim();
  if (typeof asset?.url === 'string' && asset.url.trim()) return asset.url.trim();
  return null;
}

export function normalizeAlbumSchema(input = {}, importIndex = 0) {
  const releaseDate = firstValidDate(input, DATE_FIELDS.release);
  const createdAt = firstValidDate(input, DATE_FIELDS.created);
  const updatedAt = firstValidDate(input, DATE_FIELDS.updated) || createdAt;
  const type = String(input.type || 'album').trim().toLowerCase();
  const status = String(input.status || 'published').trim().toLowerCase();
  const yearValue = finite(input.year);

  return {
    ...input,
    schemaVersion: Number.isInteger(Number(input.schemaVersion)) ? Number(input.schemaVersion) : 1,
    id: String(input.id || input.slug || '').trim(),
    title: String(input.title || input.name || input.id || '').trim(),
    type,
    status,
    active: input.active !== false && status !== 'archived',
    year: Number.isInteger(yearValue) ? yearValue : null,
    releaseDate,
    releasedAt: releaseDate,
    description: cleanNullable(input.description),
    heading: cleanNullable(input.heading || input.editorialHeading),
    trackIds: uniqueStrings(input.trackIds),
    cover: albumAsset(input, 'cover'),
    thumbnail: albumAsset(input, 'thumbnail'),
    accent: cleanNullable(input.accent),
    accent2: cleanNullable(input.accent2),
    createdAt,
    updatedAt,
    source: input.source || 'canonical-album',
    importIndex: Number.isFinite(Number(input.importIndex)) ? Number(input.importIndex) : importIndex,
  };
}

export function normalizeAlbumCollection(items = []) {
  return Array.isArray(items)
    ? items.map((item, index) => normalizeAlbumSchema(item, index))
    : [];
}

export function normalizeTrackSchema(input = {}, importIndex = 0) {
  const releaseDate = firstValidDate(input, DATE_FIELDS.release);
  const createdAt = firstValidDate(
    { ...input, importedAt: input.importedAt ?? input.migration?.importedAt },
    DATE_FIELDS.created
  );
  const updatedAt = firstValidDate(input, DATE_FIELDS.updated) || createdAt;
  const status = String(input.status || 'published').toLowerCase();
  const genres = list(input.genres?.length ? input.genres : input.genre);
  const moods = list(input.moods?.length ? input.moods : input.mood);
  const themes = list(input.themes?.length ? input.themes : input.remoteMetadata?.themes);
  const languages = list(input.languages?.length ? input.languages : input.language);
  const tags = [...new Set([
    ...list(input.tags),
    ...genres,
    ...themes
  ].map(value => String(value).trim()).filter(Boolean))];

  return {
    ...input,
    id: String(input.id || input.slug || `track-${importIndex + 1}`),
    title: input.title || input.name || input.slug || `Track ${importIndex + 1}`,
    releaseDate,
    releasedAt: releaseDate,
    createdAt,
    updatedAt,
    importedAt: createdAt,
    status,
    active: input.active !== false && status !== 'archived',
    genre: input.genre || genres[0] || 'Other',
    genres: genres.length ? genres : [input.genre || 'Other'],
    mood: input.mood || moods.join(', ') || 'Independent release',
    moods,
    themes,
    languages,
    tags,
    sequence: finite(input.sequence ?? input.order ?? input.position ?? input.remoteMetadata?.sequence),
    importIndex: Number.isFinite(Number(input.importIndex)) ? Number(input.importIndex) : importIndex,
    source: input.source || (input.remote ? 'cloudflare-r2' : 'legacy'),
    releaseDateSource: releaseDate ? 'releaseDate' : (createdAt ? 'createdAt' : (updatedAt ? 'updatedAt' : 'sequence')),
    originalDateFields: {
      releaseDate: firstValue(input, DATE_FIELDS.release),
      createdAt: firstValue(input, DATE_FIELDS.created),
      updatedAt: firstValue(input, DATE_FIELDS.updated)
    }
  };
}

// Canonical public name used by the consolidated master-spec guard.
// Keep normalizeTrackSchema as the backwards-compatible implementation name.
export const normalizeCatalogTrack = normalizeTrackSchema;

export function normalizeTrackCollection(items = []) {
  return Array.isArray(items)
    ? items.map((item, index) => normalizeCatalogTrack(item, index))
    : [];
}
