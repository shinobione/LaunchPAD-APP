import { tracks as catalogTracks } from './catalog-store.js';

const HIDDEN_TAG_PATTERN = /^(?:spotify\s+)?canva(?:s)?$/i;

const PARENT_TAG_RULES = [
  ['Trap', /\b(?:trap|cybertrap|rage|abyssal)\b/i],
  ['Drill', /\bdrill\b/i],
  ['Phonk', /\bphonk\b/i],
  ['R&B', /\b(?:r\s*&\s*b|rnb|rhythm\s+and\s+blues|neo\s+soul|soul)\b/i],
  ['Hip-hop', /\b(?:hip[ -]?hop|rap|boom[ -]?bap|cypher)\b/i],
  ['House', /\b(?:house|garage|ukg|2[ -]?step)\b/i],
  ['Dancehall', /\b(?:dancehall|reggae|ragga)\b/i],
  ['Pop', /\b(?:pop|hyperpop|synthpop)\b/i],
  ['Electronic', /\b(?:electronic|electro|edm|techno|trance|synthwave|dnb|drum\s*(?:and|&)\s*bass)\b/i],
  ['Lo-fi', /\b(?:lo[ -]?fi|chillhop)\b/i],
  ['Afro', /\b(?:afrobeat|afropop|amapiano)\b/i],
  ['Bolero', /\bbolero\b/i],
  ['Cinematic', /\b(?:cinematic|orchestral|soundtrack|score)\b/i],
  ['Rock', /\b(?:rock|metal|punk)\b/i]
];

const PRESERVED_LABELS = new Map([
  ['love', 'Love'],
  ['romantic', 'Romantic'],
  ['vietnam', 'Vietnam'],
  ['vietnamese', 'Vietnamese'],
  ['english', 'English'],
  ['french', 'French'],
  ['experimental', 'Experimental'],
  ['instrumental', 'Instrumental']
]);

function cleanTag(value) {
  return String(value ?? '')
    .normalize('NFKC')
    .replace(/[\u200B-\u200D\u2060\uFEFF]/g, '')
    .replace(/[_–—]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function canonicalKey(value) {
  return cleanTag(value).toLocaleLowerCase('en');
}

function fallbackLabel(value) {
  return cleanTag(value)
    .split(' ')
    .filter(Boolean)
    .map(word => {
      const upper = word.toUpperCase();
      if (['AI', 'EDM', 'UK', 'Y2K', 'EP'].includes(upper)) return upper;
      if (/^r&b$/i.test(word)) return 'R&B';
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');
}

export function parentEditorialTag(value) {
  const clean = cleanTag(value);
  if (!clean || HIDDEN_TAG_PATTERN.test(clean)) return null;

  const preserved = PRESERVED_LABELS.get(canonicalKey(clean));
  if (preserved) return preserved;

  for (const [label, pattern] of PARENT_TAG_RULES) {
    if (pattern.test(clean)) return label;
  }

  return fallbackLabel(clean);
}

export function normalizeEditorialTags(values, { max = 4 } = {}) {
  const source = Array.isArray(values) ? values : [values];
  const normalized = [];
  const seen = new Set();

  for (const raw of source) {
    const label = parentEditorialTag(raw);
    if (!label) continue;
    const key = canonicalKey(label);
    if (seen.has(key)) continue;
    seen.add(key);
    normalized.push(label);
    if (normalized.length >= max) break;
  }

  return normalized;
}

export function normalizeTrackEditorialTags(track, { max = 4 } = {}) {
  if (!track || typeof track !== 'object') return [];
  const remoteGenres = Array.isArray(track.remoteMetadata?.genres)
    ? track.remoteMetadata.genres
    : [];
  const candidates = [
    track.genre,
    ...remoteGenres,
    ...(Array.isArray(track.tags) ? track.tags : [])
  ];
  const normalized = normalizeEditorialTags(candidates, { max });
  track.tags = normalized.length ? normalized : normalizeEditorialTags(track.genre || 'Other', { max: 1 });
  if (track.remoteMetadata) track.remoteMetadata.genres = [...track.tags];
  return track.tags;
}

export function normalizeCatalogEditorialTags(tracks = catalogTracks) {
  tracks.forEach(track => normalizeTrackEditorialTags(track));
  return tracks;
}