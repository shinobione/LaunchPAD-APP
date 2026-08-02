import { access } from 'node:fs/promises';
import { constants } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { albums, tracks } from '../js/catalog.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const structureOnly = process.argv.includes('--structure-only');
const errors = [];
const warnings = [];
const albumIds = new Set();
const trackIds = new Set();
const hexPattern = /^#[0-9a-f]{6}$/i;
const datePattern = /^\d{4}-\d{2}-\d{2}$/;

function requireText(value, label) {
  if (typeof value !== 'string' || !value.trim()) errors.push(`${label} is required.`);
}

async function requireFile(relativePath, label, { optional = false } = {}) {
  if (!relativePath) {
    if (!optional) errors.push(`${label} is required.`);
    return;
  }

  if (structureOnly) return;

  try {
    await access(path.join(root, relativePath), constants.R_OK);
  } catch {
    errors.push(`${label} does not exist: ${relativePath}`);
  }
}

for (const [index, album] of albums.entries()) {
  const label = `Album ${album?.id || index + 1}`;
  requireText(album?.id, `${label} id`);
  requireText(album?.title, `${label} title`);
  requireText(album?.type, `${label} type`);
  requireText(album?.cover, `${label} cover`);

  if (albumIds.has(album.id)) errors.push(`Duplicate album id: ${album.id}`);
  albumIds.add(album.id);

  if (album.year && !/^\d{4}$/.test(String(album.year))) {
    warnings.push(`${label} has a non-standard year: ${album.year}`);
  }

  await requireFile(album.cover, `${label} cover`);
}

for (const [index, track] of tracks.entries()) {
  const label = `Track ${track?.id || index + 1}`;
  requireText(track?.id, `${label} id`);
  requireText(track?.title, `${label} title`);
  requireText(track?.file, `${label} audio file`);
  requireText(track?.cover, `${label} cover`);
  requireText(track?.genre, `${label} genre`);
  requireText(track?.mood, `${label} mood`);
  requireText(track?.albumId, `${label} albumId`);

  if (trackIds.has(track.id)) errors.push(`Duplicate track id: ${track.id}`);
  trackIds.add(track.id);

  if (!albumIds.has(track.albumId)) {
    errors.push(`${label} references unknown albumId: ${track.albumId}`);
  }

  if (!Array.isArray(track.tags) || track.tags.length === 0) {
    errors.push(`${label} must contain at least one tag.`);
  }

  if (track.releaseDate) {
    if (!datePattern.test(track.releaseDate) || !Number.isFinite(Date.parse(track.releaseDate))) {
      errors.push(`${label} has an invalid releaseDate: ${track.releaseDate}`);
    }
  }

  for (const field of ['accent', 'accent2']) {
    if (!hexPattern.test(track[field] || '')) {
      errors.push(`${label} ${field} must be a six-digit hex colour.`);
    }
  }

  await requireFile(track.file, `${label} audio file`);
  await requireFile(track.cover, `${label} cover`);
  await requireFile(track.lyrics, `${label} lyrics`, { optional: true });

  if (!track.lyrics) warnings.push(`${label} has no lyrics file.`);
}

const summary = `${albums.length} albums, ${tracks.length} tracks`;

if (warnings.length) {
  console.warn(`\nCatalog warnings (${warnings.length}):`);
  warnings.forEach(warning => console.warn(`- ${warning}`));
}

if (errors.length) {
  console.error(`\nCatalog validation failed for ${summary}:`);
  errors.forEach(error => console.error(`- ${error}`));
  process.exitCode = 1;
} else {
  console.log(`Catalog valid: ${summary}.`);
}
