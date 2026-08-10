import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const buildConfig = fs.readFileSync(path.join(root, 'js/build-config.js'), 'utf8');
const display = /display:\s*'([^']+)'/.exec(buildConfig)?.[1];
const release = /release:\s*'([^']+)'/.exec(buildConfig)?.[1];

assert.ok(display, 'Unable to read build display from js/build-config.js.');
assert.ok(release, 'Unable to read build release from js/build-config.js.');

// README remains the accepted-release marker. Emergency real-device candidates
// may use a dedicated release document until their smoke passes, so the README
// never claims a broken Android build is accepted before the user validates it.
const build80Candidate = 'docs/PHASE-UX-C2-5-A-BUILD80-ANDROID-STUDIO-PASSIVE-GUARD.md';
const livingReleaseDocs = release === 'phase-ux-c2-5-a-android-studio-passive-canvas-guard-20260810'
  ? [build80Candidate]
  : ['README.md'];
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
