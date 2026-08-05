import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync('cloudflare/admin-worker.parts/14-quality-file-guard.inject.part', 'utf8');
const coverFile = { name: 'ghost-signal-cover.jpeg', size: 1_234_567, lastModified: 1 };
const form = {
  elements: {
    audio: { files: [] },
    cover: { files: [coverFile] },
    lyrics: { files: [] },
    video: { files: [] },
  },
};

const context = vm.createContext({
  $: selector => selector === '#trackForm' ? form : null,
  selectedFile() {
    throw new Error('unsafe legacy selectedFile should be replaced');
  },
});

vm.runInContext(source, context);

assert.equal(context.qualityFileInputGuard, true);
assert.equal(context.selectedFile('cover'), coverFile, 'the newly selected cover must remain available');
assert.equal(context.selectedFile('audio'), null, 'an empty existing input must return null');
assert.equal(context.selectedFile('thumbnail'), null, 'the generated thumbnail has no file input and must not throw');
assert.equal(context.selectedFile('unknown'), null, 'unknown asset kinds must be ignored safely');

const qualitySource = fs.readFileSync('cloudflare/admin-worker.parts/08-ui-e.part', 'utf8');
assert.ok(qualitySource.includes("inspectImageSource('thumbnail')"), 'the quality check must continue to inspect the generated/R2 thumbnail');
assert.ok(qualitySource.includes("['audio','cover','lyrics','video']"), 'track saves must continue to upload the four editable media inputs');

console.log('Track Manager safely handles generated thumbnail assets and cover-only edits.');
