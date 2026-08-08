import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import { spawnSync } from 'node:child_process';

const partsDirectory = 'cloudflare/admin-worker.parts';
const outputPath = process.argv[2]
  ? path.resolve(process.argv[2])
  : path.join(os.tmpdir(), 'launchpad-r2-admin-worker.js');

if (!fs.existsSync(partsDirectory)) throw new Error(`Missing ${partsDirectory}.`);

const parts = fs.readdirSync(partsDirectory)
  .filter(filename => filename.endsWith('.part'))
  .sort((left, right) => left.localeCompare(right, 'en', { numeric: true }));

if (parts.length < 25) throw new Error(`Expected at least 25 Track Manager source parts, received ${parts.length}.`);

const injections = parts.filter(filename => filename.includes('.inject.'));
const sources = parts.filter(filename => !filename.includes('.inject.'));
let source = sources
  .map(filename => fs.readFileSync(path.join(partsDirectory, filename), 'utf8').replace(/[\r\n]+$/, ''))
  .join('');

if (injections.length) {
  const marker = '\ninstallQualityWorkspace();';
  if (!source.includes(marker)) throw new Error('Unable to locate the Track Manager UI installation marker.');
  const injected = injections
    .map(filename => fs.readFileSync(path.join(partsDirectory, filename), 'utf8').trim())
    .join('\n');
  source = source.replace(marker, `\n${injected}${marker}`);
}

const staleVersions = ['4.5','4.6','4.7','4.8','4.9','5.0','5.1','5.2','5.3','5.4','5.5','5.6','5.7'];
for (const stale of staleVersions) {
  source = source.replaceAll(`version: "${stale}"`, 'version: "5.8"');
  source = source.replaceAll(`<span class="version-pill">v${stale}</span>`, '<span class="version-pill">v5.8</span>');
  source = source.replaceAll(`version.textContent='v${stale}'`, "version.textContent='v5.8'");
}
source = source.replace(":' sans timestamps.'))}catch(error)", ":' sans timestamps.')))}catch(error)");

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, source, 'utf8');
const syntax = spawnSync(process.execPath, ['--check', outputPath], { stdio: 'inherit' });
if (syntax.status !== 0) process.exit(syntax.status || 1);

const embeddedScript = source.match(/<script>([\s\S]*?)<\/script>/)?.[1];
if (!embeddedScript) throw new Error('Built Track Manager Worker is missing its embedded UI script.');
try {
  new vm.Script(embeddedScript, { filename: 'track-manager-ui.js' });
} catch (error) {
  throw new Error(`Built Track Manager UI script has invalid syntax:\n${error.stack || error.message}`);
}

for (const serverOnlySymbol of ['buildCanonicalTrackSummaries', 'readManifest', 'writeCatalogIndex']) {
  if (new RegExp(`\\b${serverOnlySymbol}\\b`).test(embeddedScript)) {
    throw new Error(`Built Track Manager UI references server-only symbol: ${serverOnlySymbol}.`);
  }
}

for (const required of [
  'version: "5.8"',
  '<span class="version-pill">v5.8</span>',
  'const ADMIN_HTML = String.raw`',
  'function parseLyricsTxtMetadata(text)',
  'async function inspectTrackQuality(',
  'function trackLyricsBadge(track)',
  'function feature10ExtractCoverColors(blob)',
  'function phase12TrackMatches(track)',
  'Extraire les couleurs',
  "TRACK_MANAGER_PHASE_13_VERSION='5.5'",
  "TRACK_MANAGER_MILESTONE_3_VERSION='5.6'",
  "TRACK_MANAGER_MILESTONE_8_VERSION='5.7'",
  'function milestone3InstallReactiveFilters()',
  'function milestone3InstallManualPalette()',
  "milestone3VersionPill.textContent='v5.6'",
  'function milestone8Hydrate()',
  'function milestone8RenderBadges(card)',
  'function phase13ChooseThemeColors(candidates)',
  'Sans lyrics',
  'Lyrics non timestampées',
  "modal.id='batchImportModal'",
  'thumbnail.webp',
  'const STUDIO_ALLOWED_ORIGIN = "https://shinobione.github.io"',
  'const STUDIO_BRIDGE_VERSION = "1.0"',
  'url.pathname === "/api/studio/health"',
  'url.pathname === "/api/studio/tracks"',
  'Access-Control-Allow-Methods": "GET, OPTIONS"',
  'write: []'
]) {
  if (!source.includes(required)) throw new Error(`Built Track Manager Worker is missing ${required}.`);
}

for (const forbidden of [
  'id="importGithub"',
  'id="migrateLegacy"',
  'id="migrationModal"',
  'id="legacyPanel"',
  '<span class="version-pill">v5.7</span>',
  'version: "5.7"'
]) {
  if (source.includes(forbidden)) throw new Error(`Built Track Manager Worker still exposes obsolete content: ${forbidden}.`);
}

console.log(`Built ${outputPath} from ${sources.length} source parts and ${injections.length} UI injection(s) (${Buffer.byteLength(source)} bytes).`);
