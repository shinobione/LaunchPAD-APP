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

if (parts.length < 16) {
  throw new Error(`Expected at least 16 Track Manager source parts, received ${parts.length}.`);
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

source = source.replace('version: "4.6"', 'version: "4.8"');
source = source.replace('<span class="version-pill">v4.5</span>', '<span class="version-pill">v4.8</span>');
source = source.replace("version.textContent='v4.6'", "version.textContent='v4.8'");
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
  "version.textContent='v4.6'",
  "version.textContent='v4.7'",
  'version: "4.7"'
]) {
  if (source.includes(forbidden)) {
    throw new Error(`Built Track Manager Worker still exposes obsolete content: ${forbidden}.`);
  }
}

for (const required of [
  'version: "4.8"',
  '<span class="version-pill">v4.8</span>',
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
  "TRACK_MANAGER_LYRICS_BADGES_VERSION='4.8'",
  'function trackLyricsBadge(track)',
  'lyrics absentes',
  'lyrics non timestampées',
  'lyrics timestampées',
  'data-lyrics-status',
  "version.textContent='v4.8'",
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
