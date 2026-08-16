import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const outputPath = process.argv[2]
  ? path.resolve(process.argv[2])
  : path.join(os.tmpdir(), 'launchpad-r2-admin-worker-v524.js');

const base = spawnSync(process.execPath, ['scripts/build-admin-worker-v523.mjs', outputPath], { stdio: 'inherit' });
if (base.status !== 0) process.exit(base.status || 1);

let source = fs.readFileSync(outputPath, 'utf8');

function functionRange(name) {
  const marker = `async function ${name}(`;
  const start = source.indexOf(marker);
  if (start < 0) throw new Error(`TM 5.24 wrapper could not find ${name}.`);
  const nextAsync = source.indexOf('\nasync function ', start + marker.length);
  const nextFunction = source.indexOf('\nfunction ', start + marker.length);
  const candidates = [nextAsync, nextFunction].filter(index => index > start);
  const end = candidates.length ? Math.min(...candidates) : source.length;
  return { start, end, text: source.slice(start, end) };
}

function replaceFunction(name, transform) {
  const { start, end, text } = functionRange(name);
  const next = transform(text);
  if (next === text) throw new Error(`TM 5.24 wrapper made no change inside ${name}.`);
  source = source.slice(0, start) + next + source.slice(end);
}

for (const marker of [
  'version: "5.23"',
  'trackManagerVersion: "5.23"',
  'const STUDIO_BRIDGE_VERSION = "1.13";',
  'async function uploadStudioAlbumAsset(albumId, kind, request, env, user) {',
  'async function uploadStudioTrackAsset(slug, kind, request, env, user) {',
  'studioApplyAudioDurationEvidence(studioPhase4NextManifest(manifest, user, { [kind]: filename }), uploadEvidence)',
]) {
  if (!source.includes(marker)) throw new Error(`TM 5.24 wrapper missing required v5.23 marker: ${marker}`);
}

const evidenceDeclaration = `  const uploadEvidence = kind === "audio"\n    ? studioNormalizeAudioEvidence({ audio: { duration: formData.get("audioDuration"), readable: formData.get("audioReadable") === "true" } })\n    : {};\n`;

const declarationCountBefore = source.split(evidenceDeclaration).length - 1;
assert.equal(declarationCountBefore, 1, 'TM 5.23 input bundle must contain exactly one uploadEvidence declaration before corrective relocation.');
assert.ok(functionRange('uploadStudioAlbumAsset').text.includes(evidenceDeclaration), 'TM 5.23 regression signature changed: misplaced uploadEvidence must be proven inside Album asset upload before correction.');
assert.ok(!functionRange('uploadStudioTrackAsset').text.includes(evidenceDeclaration), 'TM 5.23 regression signature changed: Track asset upload unexpectedly already owns uploadEvidence.');

replaceFunction('uploadStudioAlbumAsset', block => block.replace(evidenceDeclaration, ''));

const trackEvidenceMarker = `  const file = formData.get("file");\n  if (!(file instanceof File) || file.size <= 0) throw new Error("UPLOAD_Fichier manquant.");\n  validateUploadFile(file, kind);\n`;
replaceFunction('uploadStudioTrackAsset', block => {
  if (!block.includes(trackEvidenceMarker)) throw new Error('TM 5.24 wrapper could not find Track asset evidence insertion point.');
  return block.replace(trackEvidenceMarker, trackEvidenceMarker + evidenceDeclaration);
});

source = source.replaceAll('version: "5.23"', 'version: "5.24"');
source = source.replaceAll('trackManagerVersion: "5.23"', 'trackManagerVersion: "5.24"');
source = source.replaceAll('const STUDIO_BRIDGE_VERSION = "1.13";', 'const STUDIO_BRIDGE_VERSION = "1.14";');
source = source.replaceAll('v5.23', 'v5.24');

const trackBlock = functionRange('uploadStudioTrackAsset').text;
const albumBlock = functionRange('uploadStudioAlbumAsset').text;
const declarationCountAfter = source.split(evidenceDeclaration).length - 1;

assert.equal(declarationCountAfter, 1, 'TM 5.24 bundle must contain exactly one uploadEvidence declaration.');
assert.ok(trackBlock.includes(evidenceDeclaration), 'Track asset upload must own the duration/readability evidence declaration.');
assert.ok(trackBlock.includes('studioApplyAudioDurationEvidence(studioPhase4NextManifest(manifest, user, { [kind]: filename }), uploadEvidence)'), 'Track asset upload must apply its local uploadEvidence to the next manifest.');
assert.ok(trackBlock.includes('inspectTrackQuality(env.MEDIA_BUCKET, nextManifest, objects, uploadEvidence)'), 'Track asset quality inspection must receive the same local uploadEvidence.');
assert.ok(!albumBlock.includes('uploadEvidence'), 'Album asset upload must not contain Track audio evidence plumbing.');
assert.ok(source.includes('version: "5.24"'));
assert.ok(source.includes('trackManagerVersion: "5.24"'));
assert.ok(source.includes('const STUDIO_BRIDGE_VERSION = "1.14";'));
for (const stale of ['version: "5.23"', 'trackManagerVersion: "5.23"', 'const STUDIO_BRIDGE_VERSION = "1.13";']) {
  assert.ok(!source.includes(stale), `Stale TM 5.23 marker remains in v5.24 bundle: ${stale}`);
}

fs.writeFileSync(outputPath, source, 'utf8');
const syntax = spawnSync(process.execPath, ['--check', outputPath], { stdio: 'inherit' });
if (syntax.status !== 0) process.exit(syntax.status || 1);

console.log(`Track Manager v5.24 / Studio bridge v1.14 Track asset evidence scope corrective verified: ${outputPath}`);
