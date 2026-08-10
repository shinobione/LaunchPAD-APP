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
// use a dedicated release document until their smoke passes, so README never
// claims a broken Android build is accepted before real-user validation.
const candidateDocs = new Map([
  [
    'phase-ux-c2-5-a-android-studio-passive-canvas-guard-20260810',
    'docs/PHASE-UX-C2-5-A-BUILD80-ANDROID-STUDIO-PASSIVE-GUARD.md'
  ],
  [
    'phase-ux-c2-5-a-android-studio-media-teardown-20260810',
    'docs/PHASE-UX-C2-5-A-BUILD81-ANDROID-STUDIO-MEDIA-TEARDOWN.md'
  ],
  [
    'phase-ux-c2-5-a-mini-player-action-routing-20260810',
    'docs/PHASE-UX-C2-5-A-BUILD82-MINI-PLAYER-ACTION-ROUTING.md'
  ],
  [
    'phase-ux-c2-5-a-surgical-rollback-20260810',
    'docs/PHASE-UX-C2-5-A-BUILD83-SURGICAL-ROLLBACK.md'
  ],
  [
    'phase-ux-c2-5-a-show-track-isolation-20260810',
    'docs/PHASE-UX-C2-5-A-BUILD84-SHOW-TRACK-ISOLATION.md'
  ]
]);
const livingReleaseDocs = candidateDocs.has(release)
  ? [candidateDocs.get(release)]
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
