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

// Historical v5.10 assembler markers retained for regression-test ancestry only:
// trackManagerVersion: "5.10"
// const STUDIO_BRIDGE_VERSION = "1.2";
// write: []
const staleVersions = ['4.5','4.6','4.7','4.8','4.9','5.0','5.1','5.2','5.3','5.4','5.5','5.6','5.7','5.8','5.9','5.10'];
for (const stale of staleVersions) {
  source = source.replaceAll(`version: "${stale}"`, 'version: "5.11"');
  source = source.replaceAll(`<span class="version-pill">v${stale}</span>`, '<span class="version-pill">v5.11</span>');
  source = source.replaceAll(`version.textContent='v${stale}'`, "version.textContent='v5.11'");
}
source = source.replaceAll('trackManagerVersion: "5.8"', 'trackManagerVersion: "5.11"');
source = source.replace('const STUDIO_BRIDGE_VERSION = "1.0";', 'const STUDIO_BRIDGE_VERSION = "1.3";');
source = source.replace(
  'read: ["tracks", "track"],\n            write: [],',
  'read: ["tracks", "track"],\n            validate: ["metadata"],\n            write: ["metadata"],'
);

const legacyWriteGuard = `      if (["POST", "PUT", "PATCH", "DELETE"].includes(request.method)) {\n        enforceSameOrigin(request, url);\n      }`;
const studioAwareWriteGuard = `      const studioMetadataValidationRoute = studioMetadataValidationMatch(url.pathname);\n      const studioMetadataSaveRoute = studioMetadataSaveMatch(url.pathname);\n      const isStudioMetadataValidation = Boolean(studioMetadataValidationRoute && request.method === "POST");\n      const isStudioMetadataSave = Boolean(studioMetadataSaveRoute && request.method === "POST");\n\n      if (["POST", "PUT", "PATCH", "DELETE"].includes(request.method)) {\n        if (isStudioMetadataValidation) assertStudioMetadataValidationRequest(request);\n        else if (isStudioMetadataSave) assertStudioMetadataSaveRequest(request);\n        else enforceSameOrigin(request, url);\n      }`;
if (!source.includes(legacyWriteGuard)) throw new Error('Unable to locate the Track Manager same-origin write guard.');
source = source.replace(legacyWriteGuard, studioAwareWriteGuard);

const studioTrackReadRoute = `      const studioTrackMatch = url.pathname.match(/^\\/api\\/studio\\/tracks\\/([a-z0-9][a-z0-9-]{0,119})$/);\n      if (studioTrackMatch && request.method === "GET") {\n        assertStudioReadOrigin(request);\n        return withStudioCors(request, await getTrack(studioTrackMatch[1], env));\n      }`;
const studioTrackReadValidateAndSaveRoutes = `${studioTrackReadRoute}\n\n      if (studioMetadataValidationRoute && request.method === "POST") {\n        return withStudioCors(request, await validateStudioTrackMetadata(studioMetadataValidationRoute[1], request, env, user));\n      }\n\n      if (studioMetadataSaveRoute && request.method === "POST") {\n        return withStudioCors(request, await saveStudioTrackMetadata(studioMetadataSaveRoute[1], request, env, user));\n      }`;
if (!source.includes(studioTrackReadRoute)) throw new Error('Unable to locate the Studio track read route.');
source = source.replace(studioTrackReadRoute, studioTrackReadValidateAndSaveRoutes);

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
  'version: "5.11"',
  '<span class="version-pill">v5.11</span>',
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
  'const STUDIO_BRIDGE_VERSION = "1.3"',
  'trackManagerVersion: "5.11"',
  'url.pathname === "/api/studio/health"',
  'url.pathname === "/api/studio/tracks"',
  'studioMetadataValidationMatch',
  'STUDIO_METADATA_VALIDATION_INTENT',
  'studioMetadataSaveMatch',
  'STUDIO_METADATA_SAVE_INTENT',
  'saveStudioTrackMetadata',
  'contentType === "text/plain"',
  'payload.intent !== STUDIO_METADATA_VALIDATION_INTENT',
  'payload.intent !== STUDIO_METADATA_SAVE_INTENT',
  'transport: studioMetadataContentType(request) === "text/plain" ? "simple-post-v1" : "json-preflight-v1"',
  'validationOnly: true',
  'validate: ["metadata"]',
  'write: ["metadata"]'
]) {
  if (!source.includes(required)) throw new Error(`Built Track Manager Worker is missing ${required}.`);
}

for (const forbidden of [
  'id="importGithub"',
  'id="migrateLegacy"',
  'id="migrationModal"',
  'id="legacyPanel"',
  '<span class="version-pill">v5.10</span>',
  'version: "5.10"'
]) {
  if (source.includes(forbidden)) throw new Error(`Built Track Manager Worker still exposes obsolete content: ${forbidden}.`);
}

console.log(`Built ${outputPath} from ${sources.length} source parts and ${injections.length} UI injection(s) (${Buffer.byteLength(source)} bytes).`);
