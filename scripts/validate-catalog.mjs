import { access } from 'node:fs/promises';
import { constants } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import {
  albums,
  tracks,
  validateCatalogRuntime
} from '../js/core/catalog-store.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const structureOnly = process.argv.includes('--structure-only');
const health = validateCatalogRuntime();
const errors = [...health.errors];
const warnings = [...health.warnings];

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
  requireText(album?.type, `${label} type`);
  requireText(album?.description, `${label} description`);

  if (album.year && !/^\d{4}$/.test(String(album.year))) {
    warnings.push(`${label} has a non-standard year: ${album.year}`);
  }

  await requireFile(album.cover, `${label} cover`);
}

for (const [index, track] of tracks.entries()) {
  const label = `Track ${track?.id || index + 1}`;
  requireText(track?.genre, `${label} genre`);
  requireText(track?.mood, `${label} mood`);

  if (!Array.isArray(track.tags) || track.tags.length === 0) {
    errors.push(`${label} must contain at least one tag.`);
  }

  await requireFile(track.file, `${label} audio file`);
  await requireFile(track.cover, `${label} cover`);
  await requireFile(track.lyrics, `${label} lyrics`, { optional: true });
}

const summary = `${albums.length} albums, ${tracks.length} tracks`;

if (warnings.length) {
  console.warn(`\nCatalog warnings (${warnings.length}):`);
  [...new Set(warnings)].forEach(warning => console.warn(`- ${warning}`));
}

if (errors.length) {
  console.error(`\nCatalog validation failed for ${summary}:`);
  [...new Set(errors)].forEach(error => console.error(`- ${error}`));
  process.exitCode = 1;
} else {
  console.log(`Catalog valid: ${summary}.`);
}
