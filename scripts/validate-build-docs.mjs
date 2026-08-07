import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const buildConfig = fs.readFileSync(path.join(root, 'js/build-config.js'), 'utf8');
const display = /display:\s*'([^']+)'/.exec(buildConfig)?.[1];
const release = /release:\s*'([^']+)'/.exec(buildConfig)?.[1];

assert.ok(display, 'Unable to read build display from js/build-config.js.');
assert.ok(release, 'Unable to read build release from js/build-config.js.');

const ignoredDirectories = new Set(['.git', 'node_modules', 'dist']);
const markdownFiles = [];

function walk(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (entry.isDirectory() && ignoredDirectories.has(entry.name)) continue;
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) walk(absolute);
    else if (entry.isFile() && /\.md$/i.test(entry.name)) markdownFiles.push(absolute);
  }
}

walk(root);
assert.ok(markdownFiles.length > 0, 'No Markdown documentation found.');

const stale = [];
for (const file of markdownFiles) {
  const content = fs.readFileSync(file, 'utf8');
  const relative = path.relative(root, file).replaceAll('\\', '/');
  if (!content.includes(display) || !content.includes(release)) {
    stale.push(relative);
  }
}

assert.deepEqual(
  stale,
  [],
  `Every Markdown document must mention current build ${display} and release ${release}. Stale: ${stale.join(', ')}`
);

console.log(`Build documentation is coherent: ${markdownFiles.length} Markdown files match ${display} / ${release}.`);
