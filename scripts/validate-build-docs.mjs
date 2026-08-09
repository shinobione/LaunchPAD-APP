import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const buildConfig = fs.readFileSync(path.join(root, 'js/build-config.js'), 'utf8');
const display = /display:\s*'([^']+)'/.exec(buildConfig)?.[1];
const release = /release:\s*'([^']+)'/.exec(buildConfig)?.[1];

assert.ok(display, 'Unable to read build display from js/build-config.js.');
assert.ok(release, 'Unable to read build release from js/build-config.js.');

// README is the living release marker. CHANGELOG and historical phase/audit
// Markdown files are timelines/snapshots and must not be rewritten merely to
// pretend that an older document described a later public build.
const livingReleaseDocs = ['README.md'];
const stale = [];

for (const relative of livingReleaseDocs) {
  const absolute = path.join(root, relative);
  assert.ok(fs.existsSync(absolute), `Missing living release document: ${relative}`);
  const content = fs.readFileSync(absolute, 'utf8');
  if (!content.includes(display) || !content.includes(release)) stale.push(relative);
}

assert.deepEqual(
  stale,
  [],
  `Living release docs must mention current build ${display} and release ${release}. Stale: ${stale.join(', ')}`
);

console.log(`Build documentation is coherent: ${livingReleaseDocs.join(', ')} matches ${display} / ${release}.`);
