# PHASE UX / C3-C.2 — LaunchPAD Build 93 Transition + Glow Tuning

Candidate: `2026.08.11.93`
Release: `phase-ux-c3-c2-transition-glow-20260811`
Date: 2026-08-11
Safety checkpoint: `safety/pre-c3-c2-build93-transition-glow-20260811-2058`

## Real-user finding from Build 92

Build 92 made premium interaction feedback materially visible, but desktop smoke exposed two presentation defects:

1. the pointer-position click bloom was too large/bright and felt excessive;
2. Audio Lab preset chips kept a persistent outer neon halo after selection, which read like leftover click light;
3. expected page transitions were effectively absent during normal navigation.

The transition issue was traced to CSS animation identity, not the router itself. `Feature 11` correctly adds and removes `.route-entering` after the active route changes, but Build 92 assigned the same `lp92-view-enter` animation to both `.view.active` and `.view.active.route-entering`. Because the computed animation name did not change, browsers had no reliable reason to restart an already-finished animation when `.route-entering` was added.

## Build 93 corrective

Build 93 keeps Build 92 interaction runtime/press semantics intact and loads one small presentation-only overlay after it.

### Click bloom

- reduce bloom core brightness;
- reduce cyan/violet energy;
- reduce maximum bloom expansion from Build 92 scale 9 to scale 4.6;
- shorten the visible bloom to 285 ms;
- keep pointer-event ownership disabled.

### Audio Lab selected preset

- preserve a clear selected-state fill/border;
- remove the strong persistent exterior glow from `.lab-controls .chip.active`;
- keep only small local depth so selected state cannot be confused with a click effect still running.

### Route transition replay

- `.view.active.route-entering` now uses a distinct `lp93-route-enter` animation name;
- duration is exactly 260 ms to match Feature 11's existing route replay window;
- transition uses short opacity/depth/translate/focus resolution without delaying routing;
- normal `.view.active` keeps the inherited Build 92 initial-entry animation;
- reduced-motion users receive no route/bloom animation.

## Safety boundaries

Build 93 does not change:

- router parsing or navigation ownership;
- player/queue/loop/seek/favorites behavior;
- Audio Lab analyser/rendering logic;
- Media Session;
- canonical Album authority;
- Worker runtime or deployment;
- R2 catalog/media state;
- Track Manager;
- Studio;
- SonicTrace;
- LRC Maker;
- Phase 7 authorization state.

No `preventDefault()`, `stopPropagation()`, route delay, timeout-gated navigation or data mutation is introduced.

## Acceptance

CI is necessary but not sufficient. Real-user smoke must confirm:

- page changes now show a clearly perceptible but short transition;
- click bloom is visible without becoming a flash;
- selected Audio Lab presets remain legible without residual-looking neon light;
- Play/Pause, favorites, queue, Album/Track navigation, tabs/buttons and mini-player still behave normally;
- touch/mobile retains no sticky hover or gesture ownership regressions.

Until that smoke passes, Build 93 remains a candidate and C3-C stays open.
