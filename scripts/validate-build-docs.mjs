import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const buildConfig = fs.readFileSync(path.join(root, 'js/build-config.js'), 'utf8');
const display = /display:\s*'([^']+)'/.exec(buildConfig)?.[1];
const release = /release:\s*'([^']+)'/.exec(buildConfig)?.[1];

assert.ok(display, 'Unable to read build display from js/build-config.js.');
assert.ok(release, 'Unable to read build release from js/build-config.js.');

// README remains the accepted-release marker. Candidate builds use a dedicated
// release document until real-user smoke passes, so README never claims an
// unvalidated public release as accepted.
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
  ],
  [
    'phase-ux-c2-5-a-studio-loop-parity-20260810',
    'docs/PHASE-UX-C2-5-A-BUILD85-STUDIO-LOOP-PARITY.md'
  ],
  [
    'phase-ux-c2-5-a-mobile-player-ui-polish-20260810',
    'docs/PHASE-UX-C2-5-A-BUILD86-MOBILE-PLAYER-UI-POLISH.md'
  ],
  [
    'phase-ux-c2-5-a-global-touch-polish-20260810',
    'docs/PHASE-UX-C2-5-A-BUILD87-GLOBAL-TOUCH-POLISH.md'
  ],
  [
    'phase-ux-c2-5-b-canonical-album-read-model-20260810',
    'docs/PHASE-UX-C2-5-B-BUILD88-CANONICAL-ALBUM-READ-MODEL.md'
  ],
  [
    'phase-ux-c2-5-f-canonical-album-public-cutover-20260811',
    'docs/PHASE-UX-C2-5-F-BUILD89-CANONICAL-ALBUM-PUBLIC-CUTOVER.md'
  ],
  [
    'phase-ux-c3-c-premium-feel-20260811',
    'docs/PHASE-UX-C3-C-BUILD91-PREMIUM-FEEL.md'
  ],
  [
    'phase-ux-c3-c1-premium-feel-20260811',
    'docs/PHASE-UX-C3-C1-BUILD92-PREMIUM-FEEL.md'
  ],
  [
    'phase-ux-c3-c2-transition-glow-20260811',
    'docs/PHASE-UX-C3-C2-BUILD93-TRANSITION-GLOW-TUNING.md'
  ],
  [
    'phase-ux-c3-c3-real-route-transitions-20260811',
    'docs/PHASE-UX-C3-C3-BUILD94-REAL-ROUTE-TRANSITIONS.md'
  ],
  [
    'phase-ux-c3-c4-smooth-layout-20260811',
    'docs/PHASE-UX-C3-C4-BUILD95-SMOOTH-LAYOUT.md'
  ],
  [
    'phase-ux-c3-c5-lyrics-autoscroll-20260811',
    'docs/PHASE-UX-C3-C5-BUILD96-LYRICS-AUTOSCROLL.md'
  ],
  [
    'phase-ux-c3-c6-mobile-cleanup-20260811',
    'docs/PHASE-UX-C3-C6-BUILD97-MOBILE-CLEANUP.md'
  ],
  [
    'phase-ux-c3-c7-responsiveness-20260812',
    'docs/PHASE-UX-C3-C7-BUILD98-RESPONSIVENESS.md'
  ],
  [
    'phase-ux-c3-c8-mobile-reactivity-20260812',
    'docs/PHASE-UX-C3-C8-BUILD99-MOBILE-REACTIVITY.md'
  ],
  [
    'phase-ux-c3-c9-mobile-menu-focus-20260812',
    'docs/PHASE-UX-C3-C9-BUILD100-MOBILE-MENU-FOCUS.md'
  ],
  [
    'phase-ux-c3-c10-mini-player-chrome-20260812',
    'docs/PHASE-UX-C3-C10-BUILD101-MINI-PLAYER-CHROME.md'
  ],
  [
    'phase-ux-c3-c11-visual-card-feedback-20260812',
    'docs/PHASE-UX-C3-C11-BUILD102-VISUAL-CARD-FEEDBACK.md'
  ],
  [
    'audiolab-neon-ribbon-v5-20260824',
    'docs/BUILD103-AUDIOLAB-NEON-RIBBON-V5.md'
  ],
  [
    'audiolab-neon-ribbon-v6-radial-orbit-20260824',
    'docs/BUILD104-AUDIOLAB-NEON-RIBBON-V6.md'
  ],
  [
    'audiolab-neon-ribbon-v7-source-port-20260824',
    'docs/BUILD105-AUDIOLAB-NEON-RIBBON-V7-SOURCE-PORT.md'
  ],
  [
    'audiolab-neon-ribbon-v8-source-arc-20260824',
    'docs/BUILD106-AUDIOLAB-NEON-RIBBON-V8-SOURCE-ARC.md'
  ],
  [
    'audiolab-neon-ribbon-v9-exact-projection-20260824',
    'docs/BUILD107-AUDIOLAB-NEON-RIBBON-V9-EXACT-PROJECTION.md'
  ],
  [
    'audiolab-neon-ribbon-v10-rainbow-direct-copy-20260824',
    'docs/BUILD108-AUDIOLAB-RAINBOW-DIRECT-COPY.md'
  ],
  [
    'audiolab-neon-ribbon-v11-fluid-carrier-20260824',
    'docs/BUILD109-AUDIOLAB-NEON-RIBBON-V11-FLUID-CARRIER.md'
  ],
  [
    'audiolab-neon-ribbon-v12-controlled-dynamics-20260825',
    'docs/BUILD110-AUDIOLAB-NEON-RIBBON-V12-CONTROLLED-DYNAMICS.md'
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