# PHASE UX / C3-C.10 — Build 101

Candidate: `2026.08.12.101`  
Release: `phase-ux-c3-c10-mini-player-chrome-20260812`

## Real-user finding after Build 100

Build 100 removed the unintended cyan/green rectangular chrome from the bottom desktop player transport and range controls, but the sidebar **NOW PLAYING** mini-player still showed the same square around its previous/next icon controls.

## Root cause

The Build 100 corrective targeted `.player-bar .transport button:not(.main-play)` only. The sidebar player uses a separate surface: `.side-player .mini-controls`, while Premium Feel Build 92 applies the same generic hover/active box shadow to `.mini-controls button`.

The remaining square was therefore not a new player-state bug; it was the same presentation rule reaching a second transport surface that Build 100 had not included.

## Build 101 corrective

- extends the desktop player-chrome exception to `.side-player .mini-controls button:not(.mini-play)`;
- removes background, border, outline and box-shadow chrome from sidebar previous/next controls across default, hover, active, focus and focus-visible states;
- preserves a subtle brightness/saturation response so the controls still feel interactive;
- leaves the circular central mini-player Play/Pause button untouched;
- retains the Build 100 mobile drawer ownership, locked pinch zoom and bottom-player corrective unchanged;
- bumps the canonical cache/release identity so GitHub Pages and the service worker cannot keep the old Build 100 presentation asset.

## Safety

Checkpoint: `safety/pre-c3-c10-build101-mini-player-chrome-20260812-0146`

Preserved boundaries:

- canonical audio ownership and playback state;
- Play/Pause, previous/next behavior, seek, queue, favorites, shuffle/repeat/loop;
- Lyrics synchronization;
- Track Video / Studio Canvas;
- Audio Lab;
- mobile navigation behavior from Build 100;
- canonical catalog and Album read model;
- Workers/R2, Track Manager, SonicTrace and LRC Maker.

## Acceptance gate

Do not mark Build 101 real-user accepted until:

1. sidebar mini-player Previous no longer shows a cyan/green square;
2. sidebar mini-player Next no longer shows a cyan/green square;
3. the central circular mini-player Play/Pause retains its intended premium treatment;
4. bottom player Previous/Next and volume/timeline remain clean;
5. mobile Build 100 menu and pinch-zoom fixes remain intact;
6. exact-head LaunchPAD/Chrome, horizontal-overflow and Worker dry-run gates pass.
