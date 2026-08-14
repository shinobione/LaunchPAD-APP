import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import { spawnSync } from 'node:child_process';

const outputPath = process.argv[2]
  ? path.resolve(process.argv[2])
  : path.join(os.tmpdir(), 'launchpad-r2-admin-worker-v522.js');

const base = spawnSync(process.execPath, ['scripts/build-admin-worker-v521.mjs', outputPath], { stdio: 'inherit' });
if (base.status !== 0) process.exit(base.status || 1);

let source = fs.readFileSync(outputPath, 'utf8');

function replaceOnce(marker, replacement, label) {
  if (!source.includes(marker)) throw new Error(`TM 5.22 wrapper could not find ${label}.`);
  source = source.replace(marker, replacement);
}

for (const marker of [
  'version: "5.21"',
  'trackManagerVersion: "5.21"',
  'const STUDIO_BRIDGE_VERSION = "1.11";',
  'async function validateStudioTrackMetadata(slug, request, env, user) {',
  'async function saveStudioTrackMetadata(slug, request, env, user) {',
  'async function uploadStudioTrackAsset(slug, kind, request, env, user) {',
]) {
  if (!source.includes(marker)) throw new Error(`TM 5.22 wrapper could not find required v5.21 marker: ${marker}`);
}

const evidenceHelpers = `function studioNormalizeAudioEvidence(input) {\n  const rawDuration = Number(input?.audio?.duration);\n  const duration = Number.isFinite(rawDuration) && rawDuration > 0 && rawDuration <= 12 * 60 * 60\n    ? Number(rawDuration.toFixed(3))\n    : null;\n  const readable = input?.audio?.readable === true || duration != null;\n  return duration == null && !readable ? {} : { audio: { duration, readable } };\n}\n\nfunction studioApplyAudioDurationEvidence(manifest, evidence) {\n  const duration = Number(evidence?.audio?.duration);\n  if (!manifest?.assets?.audio || !Number.isFinite(duration) || duration <= 0) return manifest;\n  return normalizeManifest({ ...manifest, duration: Number(duration.toFixed(3)) });\n}\n\nfunction studioMetadataChangedFieldsWithDerived(existing, proposed) {\n  const changed = studioMetadataChangedFields(existing, proposed);\n  const beforeDuration = Number(existing?.duration ?? 0);\n  const afterDuration = Number(proposed?.duration ?? 0);\n  if (beforeDuration !== afterDuration && !changed.includes("duration")) changed.push("duration");\n  return changed;\n}\n\n`;
replaceOnce(
  'async function validateStudioTrackMetadata(slug, request, env, user) {',
  `${evidenceHelpers}async function validateStudioTrackMetadata(slug, request, env, user) {`,
  'metadata validation insertion point',
);

const validateProposal = `  const patch = normalizeStudioMetadataPatch(payload.metadata);\n  const proposed = normalizeManifest({\n    ...existing,\n    ...patch,\n    slug: existing.slug,\n    assets: existing.assets,\n    migration: existing.migration,\n    createdAt: existing.createdAt,\n    updatedAt: existing.updatedAt,\n    updatedBy: existing.updatedBy,\n  });\n\n  const objects = await listAllObjects(env.MEDIA_BUCKET, trackPrefix(slug));\n  const quality = await inspectTrackQuality(env.MEDIA_BUCKET, proposed, objects);\n  const valid = proposed.status !== "published" || quality.publishable === true;`;
const validateProposalV522 = `  const patch = normalizeStudioMetadataPatch(payload.metadata);\n  const evidence = studioNormalizeAudioEvidence(payload.evidence);\n  const proposedBase = normalizeManifest({\n    ...existing,\n    ...patch,\n    slug: existing.slug,\n    assets: existing.assets,\n    migration: existing.migration,\n    createdAt: existing.createdAt,\n    updatedAt: existing.updatedAt,\n    updatedBy: existing.updatedBy,\n  });\n  const proposed = studioApplyAudioDurationEvidence(proposedBase, evidence);\n\n  const objects = await listAllObjects(env.MEDIA_BUCKET, trackPrefix(slug));\n  const quality = await inspectTrackQuality(env.MEDIA_BUCKET, proposed, objects, evidence);\n  const valid = proposed.status !== "published" || quality.publishable === true;`;
replaceOnce(validateProposal, validateProposalV522, 'metadata validation proposal block');
replaceOnce(
  '    changedFields: studioMetadataChangedFields(existing, proposed),',
  '    changedFields: studioMetadataChangedFieldsWithDerived(existing, proposed),\n    derivedFields: Number(existing?.duration ?? 0) !== Number(proposed?.duration ?? 0) ? ["duration"] : [],',
  'metadata validation changed fields',
);

const saveProposal = `  const patch = normalizeStudioMetadataPatch(payload.metadata);\n  const proposed = normalizeManifest({\n    ...existing,\n    ...patch,\n    slug: existing.slug,\n    assets: existing.assets,\n    migration: existing.migration,\n    createdAt: existing.createdAt,\n    updatedAt: new Date().toISOString(),\n    updatedBy: String(user.email || "authorized-user"),\n  });\n\n  const changedFields = studioMetadataChangedFields(existing, proposed);\n  const objects = await listAllObjects(env.MEDIA_BUCKET, trackPrefix(slug));\n  const quality = await inspectTrackQuality(env.MEDIA_BUCKET, proposed, objects);`;
const saveProposalV522 = `  const patch = normalizeStudioMetadataPatch(payload.metadata);\n  const evidence = studioNormalizeAudioEvidence(payload.evidence);\n  const proposedBase = normalizeManifest({\n    ...existing,\n    ...patch,\n    slug: existing.slug,\n    assets: existing.assets,\n    migration: existing.migration,\n    createdAt: existing.createdAt,\n    updatedAt: new Date().toISOString(),\n    updatedBy: String(user.email || "authorized-user"),\n  });\n  const proposed = studioApplyAudioDurationEvidence(proposedBase, evidence);\n\n  const changedFields = studioMetadataChangedFieldsWithDerived(existing, proposed);\n  const objects = await listAllObjects(env.MEDIA_BUCKET, trackPrefix(slug));\n  const quality = await inspectTrackQuality(env.MEDIA_BUCKET, proposed, objects, evidence);`;
replaceOnce(saveProposal, saveProposalV522, 'metadata save proposal block');

const uploadEvidenceMarker = `  const file = formData.get("file");\n  if (!(file instanceof File) || file.size <= 0) throw new Error("UPLOAD_Fichier manquant.");\n  validateUploadFile(file, kind);`;
const uploadEvidenceReplacement = `  const file = formData.get("file");\n  if (!(file instanceof File) || file.size <= 0) throw new Error("UPLOAD_Fichier manquant.");\n  validateUploadFile(file, kind);\n  const uploadEvidence = kind === "audio"\n    ? studioNormalizeAudioEvidence({ audio: { duration: formData.get("audioDuration"), readable: formData.get("audioReadable") === "true" } })\n    : {};`;
replaceOnce(uploadEvidenceMarker, uploadEvidenceReplacement, 'asset upload evidence block');
replaceOnce(
  '    const nextManifest = studioPhase4NextManifest(manifest, user, { [kind]: filename });\n    const objects = await listAllObjects(env.MEDIA_BUCKET, prefix);\n    const quality = await inspectTrackQuality(env.MEDIA_BUCKET, nextManifest, objects);',
  '    const nextManifest = studioApplyAudioDurationEvidence(studioPhase4NextManifest(manifest, user, { [kind]: filename }), uploadEvidence);\n    const objects = await listAllObjects(env.MEDIA_BUCKET, prefix);\n    const quality = await inspectTrackQuality(env.MEDIA_BUCKET, nextManifest, objects, uploadEvidence);',
  'asset upload quality block',
);
replaceOnce(
  '      updatedAt: rereadManifest.updatedAt || null,\n      quality,',
  '      updatedAt: rereadManifest.updatedAt || null,\n      duration: rereadManifest.duration ?? null,\n      quality,',
  'asset upload response duration',
);

source = source.replaceAll('version: "5.21"', 'version: "5.22"');
source = source.replaceAll('trackManagerVersion: "5.21"', 'trackManagerVersion: "5.22"');
source = source.replaceAll('const STUDIO_BRIDGE_VERSION = "1.11";', 'const STUDIO_BRIDGE_VERSION = "1.12";');
source = source.replaceAll('v5.21', 'v5.22');

for (const required of [
  'version: "5.22"',
  'trackManagerVersion: "5.22"',
  'const STUDIO_BRIDGE_VERSION = "1.12";',
  'function studioNormalizeAudioEvidence(input)',
  'function studioApplyAudioDurationEvidence(manifest, evidence)',
  'function studioMetadataChangedFieldsWithDerived(existing, proposed)',
  'const evidence = studioNormalizeAudioEvidence(payload.evidence);',
  'inspectTrackQuality(env.MEDIA_BUCKET, proposed, objects, evidence)',
  'formData.get("audioDuration")',
  'duration: rereadManifest.duration ?? null',
]) assert.ok(source.includes(required), `TM 5.22 bundle missing duration-evidence contract: ${required}`);

for (const forbidden of ['version: "5.21"', 'trackManagerVersion: "5.21"', 'const STUDIO_BRIDGE_VERSION = "1.11";']) {
  assert.ok(!source.includes(forbidden), `Stale TM 5.21 marker remains: ${forbidden}`);
}

fs.writeFileSync(outputPath, source, 'utf8');
const syntax = spawnSync(process.execPath, ['--check', outputPath], { stdio: 'inherit' });
if (syntax.status !== 0) process.exit(syntax.status || 1);

const embeddedScript = source.match(/<script>([\s\S]*?)<\/script>/)?.[1];
if (!embeddedScript) throw new Error('TM 5.22 bundle is missing its embedded UI script.');
new vm.Script(embeddedScript, { filename: 'track-manager-ui-v522.js' });

const helperMatch = source.match(/function studioNormalizeAudioEvidence\(input\) \{[\s\S]*?\n\}\n\nfunction studioMetadataChangedFieldsWithDerived\(existing, proposed\) \{[\s\S]*?\n\}/);
if (!helperMatch) throw new Error('TM 5.22 bundle is missing isolated duration-evidence helpers.');
const helperContext = {
  normalizeManifest: value => ({ ...value }),
};
vm.createContext(helperContext);
vm.runInContext(`${helperMatch[0]}\nglobalThis.__normalizeEvidence = studioNormalizeAudioEvidence;\nglobalThis.__applyEvidence = studioApplyAudioDurationEvidence;`, helperContext);
const evidence = helperContext.__normalizeEvidence({ audio: { duration: 235.417, readable: true } });
assert.equal(evidence.audio.duration, 235.417);
assert.equal(helperContext.__applyEvidence({ assets: { audio: 'audio.mp3' }, duration: 0 }, evidence).duration, 235.417);
assert.equal(helperContext.__applyEvidence({ assets: { audio: null }, duration: 0 }, evidence).duration, 0);
assert.deepEqual(helperContext.__normalizeEvidence({ audio: { duration: -2 } }), {});

console.log(`Track Manager v5.22 / Studio bridge v1.12 duration evidence repair verified: ${outputPath}`);
