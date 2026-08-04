import fs from 'node:fs';
import assert from 'node:assert/strict';

const sourcePath = 'cloudflare/admin-worker.parts/09-batch-import.inject.part';
const source = fs.readFileSync(sourcePath, 'utf8');
const start = source.indexOf('var BATCH_AUDIO_EXTENSIONS=');
const end = source.indexOf('function batchIssue(', start);
if (start < 0 || end < 0) throw new Error('Unable to locate batch import grouping helpers.');

const slugifyImportedTitle = value => String(value || '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-|-$/g, '')
  .slice(0, 120);

const helpers = new Function(
  'slugifyImportedTitle',
  'state',
  `${source.slice(start, end)}; return { batchDetectedRole, batchGroupKey, batchGroupFiles, batchRoleCounts, batchAssociationProblems };`
)(slugifyImportedTitle, {});

const file = (name, relative = '') => ({
  name,
  webkitRelativePath: relative,
  size: 1024,
  lastModified: 1,
});

const flat = helpers.batchGroupFiles([
  file('thick.mp3'),
  file('thick.webp'),
  file('thick.txt'),
  file('thick.mp4'),
]);
assert.equal(flat.length, 1);
assert.equal(flat[0].slug, 'thick');
assert.equal(flat[0].title, 'Thick');
assert.deepEqual(helpers.batchRoleCounts(flat[0]), {
  audio: 1,
  cover: 1,
  lyrics: 1,
  video: 1,
  ignore: 0,
});
assert.equal(helpers.batchAssociationProblems(flat[0], new Set()).filter(item => item.level === 'error').length, 0);

const folders = helpers.batchGroupFiles([
  file('thick.mp3', 'thick/thick.mp3'),
  file('thick.webp', 'thick/thick.webp'),
  file('weapon-is-fed.mp3', 'weapon-is-fed/weapon-is-fed.mp3'),
  file('weapon-is-fed.txt', 'weapon-is-fed/weapon-is-fed.txt'),
]);
assert.deepEqual(folders.map(group => group.slug).sort(), ['thick', 'weapon-is-fed']);

const suffixes = helpers.batchGroupFiles([
  file('before-the-noise-audio.mp3'),
  file('before-the-noise-cover.webp'),
  file('before-the-noise-lyrics.lrc'),
  file('before-the-noise-canvas.webm'),
]);
assert.equal(suffixes.length, 1);
assert.equal(suffixes[0].slug, 'before-the-noise');
assert.deepEqual(helpers.batchRoleCounts(suffixes[0]), {
  audio: 1,
  cover: 1,
  lyrics: 1,
  video: 1,
  ignore: 0,
});

const conflicts = helpers.batchGroupFiles([
  file('ghost-signal.mp3'),
  file('ghost-signal.wav'),
  file('ghost-signal.webp'),
  file('ghost-signal.zip'),
])[0];
const conflictProblems = helpers.batchAssociationProblems(conflicts, new Set());
assert(conflictProblems.some(item => item.code === 'multiple-audio' && item.level === 'error'));
assert(conflictProblems.some(item => item.code === 'ignored-files' && item.level === 'info'));

const existing = flat[0];
let existingProblems = helpers.batchAssociationProblems(existing, new Set(['thick']));
assert(existingProblems.some(item => item.code === 'slug-existing' && item.level === 'error'));
existing.mode = 'complete';
existingProblems = helpers.batchAssociationProblems(existing, new Set(['thick']));
assert(!existingProblems.some(item => item.code === 'slug-existing'));

const incomplete = helpers.batchGroupFiles([file('draft-track.txt')])[0];
const incompleteProblems = helpers.batchAssociationProblems(incomplete, new Set());
assert(incompleteProblems.some(item => item.code === 'audio-missing' && item.level === 'warning'));
assert(incompleteProblems.some(item => item.code === 'cover-missing' && item.level === 'warning'));
assert(!incompleteProblems.some(item => item.level === 'error'));

for (const required of [
  'Aucun fichier ne part vers R2 avant confirmation.',
  "$('#batchConfirm').addEventListener('click',startBatchImport)",
  "if(!confirm(confirmation))return",
  "fd.append('create_only',existingManifest?'false':'true')",
  "new File([file],batchBaseName(file.name)+'.txt'",
  "fd.append('thumbnail',new File([group.thumbnailResult.blob],'thumbnail.webp'",
  "await api('/api/tracks/'+encodeURIComponent(created[index]),{method:'DELETE'})",
  'Compléter l’existant',
  'webkitdirectory',
]) {
  assert(source.includes(required), `Batch import source is missing ${required}`);
}

console.log('Batch import groups flat files and folders, exposes conflicts, protects existing slugs, accepts incomplete drafts and wires explicit transactional upload.');
