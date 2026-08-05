import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import { spawnSync } from 'node:child_process';

const partsDirectory = 'cloudflare/admin-worker.parts';
const outputArgument = process.argv[2];
const outputPath = outputArgument
  ? path.resolve(outputArgument)
  : path.join(os.tmpdir(), 'launchpad-r2-admin-worker.js');

if (!fs.existsSync(partsDirectory)) {
  throw new Error(`Missing ${partsDirectory}.`);
}

const parts = fs.readdirSync(partsDirectory)
  .filter(filename => filename.endsWith('.part'))
  .sort((left, right) => left.localeCompare(right, 'en', { numeric: true }));

if (parts.length < 20) {
  throw new Error(`Expected at least 20 Track Manager source parts, received ${parts.length}.`);
}

const injectionParts = parts.filter(filename => filename.includes('.inject.'));
const sourceParts = parts.filter(filename => !filename.includes('.inject.'));
let source = sourceParts
  .map(filename => fs.readFileSync(path.join(partsDirectory, filename), 'utf8').replace(/[\r\n]+$/, ''))
  .join('');

if (injectionParts.length) {
  const insertionMarker = '\ninstallQualityWorkspace();';
  if (!source.includes(insertionMarker)) {
    throw new Error('Unable to locate the Track Manager UI installation marker.');
  }
  const injectionSource = injectionParts
    .map(filename => fs.readFileSync(path.join(partsDirectory, filename), 'utf8').trim())
    .join('\n');
  source = source.replace(insertionMarker, `\n${injectionSource}${insertionMarker}`);
}

for (const stale of [
  'version: "4.5"',
  'version: "4.6"',
  'version: "4.7"',
  'version: "4.8"',
  'version: "4.9"',
  'version: "5.0"'
]) {
  source = source.replaceAll(stale, 'version: "5.1"');
}
for (const stale of [
  '<span class="version-pill">v4.5</span>',
  '<span class="version-pill">v4.6</span>',
  '<span class="version-pill">v4.7</span>',
  '<span class="version-pill">v4.8</span>',
  '<span class="version-pill">v4.9</span>',
  '<span class="version-pill">v5.0</span>'
]) {
  source = source.replaceAll(stale, '<span class="version-pill">v5.1</span>');
}
for (const stale of [
  "version.textContent='v4.5'",
  "version.textContent='v4.6'",
  "version.textContent='v4.7'",
  "version.textContent='v4.8'",
  "version.textContent='v4.9'",
  "version.textContent='v5.0'"
]) {
  source = source.replaceAll(stale, "version.textContent='v5.1'");
}
source = source.replace(
  ":' sans timestamps.'))}catch(error)",
  ":' sans timestamps.')))}catch(error)",
);

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, source, 'utf8');

const syntax = spawnSync(process.execPath, ['--check', outputPath], {
  stdio: 'inherit'
});

if (syntax.status !== 0) {
  process.exit(syntax.status || 1);
}

const embeddedScript = source.match(/<script>([\s\S]*?)<\/script>/)?.[1];
if (!embeddedScript) {
  throw new Error('Built Track Manager Worker is missing its embedded UI script.');
}
try {
  new vm.Script(embeddedScript, { filename: 'track-manager-ui.js' });
} catch (error) {
  throw new Error(`Built Track Manager UI script has invalid syntax:\n${error.stack || error.message}`);
}

for (const forbidden of [
  'id="importGithub"',
  'id="migrateLegacy"',
  'id="migrationModal"',
  'id="legacyPanel"',
  '<span class="version-pill">v4.5</span>',
  '<span class="version-pill">v4.7</span>',
  '<span class="version-pill">v4.8</span>',
  '<span class="version-pill">v4.9</span>',
  '<span class="version-pill">v5.0</span>',
  "version.textContent='v4.6'",
  "version.textContent='v4.7'",
  "version.textContent='v4.8'",
  "version.textContent='v4.9'",
  "version.textContent='v5.0'",
  'version: "4.7"',
  'version: "4.8"',
  'version: "4.9"',
  'version: "5.0"',
  "TRACK_MANAGER_LYRICS_BADGES_VERSION='4.9'"
]) {
  if (source.includes(forbidden)) {
    throw new Error(`Built Track Manager Worker still exposes obsolete content: ${forbidden}.`);
  }
}

for (const required of [
  'version: "5.1"',
  '<span class="version-pill">v5.1</span>',
  'const ADMIN_HTML = String.raw`',
  'rel="icon" href="data:image/svg+xml',
  'class="form-section"',
  'justify-content:space-between',
  'document.querySelector',
  'aria-label="Actions du catalogue"',
  'function writeCatalogIndex(',
  'function parseTimestampedLyrics(',
  'timestampsAvailable',
  "THUMBNAIL_PIPELINE_VERSION='v2'",
  'THUMBNAIL_RENDER_SIZE=1024',
  'THUMBNAIL_TARGET_BYTES=180*1024',
  "imageSmoothingQuality='high'",
  'async function createThumbnailResult(blob)',
  'Régénérer les ',
  'TXT_METADATA_FIELD_MAP',
  'function parseLyricsTxtMetadata(text)',
  'function applyLyricsTxtMetadata(result)',
  "elements.lyrics.addEventListener('change',importLyricsTxtFile)",
  'Métadonnées du TXT importées dans le formulaire.',
  'baseParseLyricsTxtMetadata',
  "metadata.type='album-track'",
  'result.albumDetected=true',
  'async function inspectTrackQuality(',
  'function publicationQualityMessage(',
  'enrichTrackSummariesQuality',
  'function lyricsStatusFromQuality(',
  'lyricsStatus,',
  'Publication bloquée par le contrôle qualité.',
  "panel.id='qualityPanel'",
  'id="qualityCheck"',
  'Contrôle avant publication',
  'qualityEvidence',
  'create_only',
  'state.qualityRunPromise',
  'state.qualityRerunRequested',
  'refreshQualityFromCachedEvidence',
  'client-lyrics-pending',
  'Audio sélectionné : contrôle complet en attente.',
  'qualityFileSignature()!==requestedSignature',
  'Le contrôle a échoué',
  'qualityFileInputGuard',
  'element&&element.files&&element.files[0]',
  "TRACK_MANAGER_LYRICS_BADGES_VERSION='5.0'",
  'function trackLyricsBadge(track)',
  "track.quality.timestampsAvailable===true",
  'lyrics absentes',
  'lyrics non timestampées',
  'lyrics timestampées',
  'data-lyrics-status',
  "TRACK_MANAGER_SMART_PARSING_VERSION='10.2'",
  'function feature10ParseReleaseDate(text)',
  'function feature10InferSignals(payload)',
  'async function feature10ExtractCoverColors(blob)',
  'id="feature10Recalculate"',
  'Analyser / recalculer',
  "TRACK_MANAGER_COLOR_DIVERSITY_VERSION='10.3'",
  'function feature103ChooseThemeColors(candidates)',
  'feature103HueDistance',
  "TRACK_MANAGER_FEATURE_10_VERSION='5.1'",
  'data-catalog-filter',
  'function feature10StatusMatches(track,filter)',
  'function feature10IssueMatches(track,filter)',
  'function feature10LyricsMatches(track,filter)',
  'function feature10ContentMatches(track,filter)',
  "panel.id='catalogAdvancedFilters'",
  'id="catalogIssueFilter"',
  'id="catalogLyricsFilter"',
  'id="catalogContentFilter"',
  'Complets mais sans date',
  'DATE ABSENTE',
  'data-content-rating',
  'CONTENU NON VÉRIFIÉ',
  "version.textContent='v5.1'",
  "modal.id='batchImportModal'",
  'id="batchFiles"',
  'id="batchFolder"',
  'webkitdirectory',
  'function batchGroupFiles(',
  'function batchAssociationProblems(',
  'async function batchAnalyzeGroup(',
  'async function startBatchImport(',
  'Compléter l’existant',
  'Aucun fichier ne part vers R2 avant confirmation.',
  'thumbnail.webp'
]) {
  if (!source.includes(required)) {
    throw new Error(`Built Track Manager Worker is missing ${required}.`);
  }
}

console.log(`Built ${outputPath} from ${sourceParts.length} source parts and ${injectionParts.length} UI injection(s) (${Buffer.byteLength(source)} bytes).`);