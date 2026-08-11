# CHANGELOG — C3-C.2 / Build 93

Build: `2026.08.11.93`
Release: `phase-ux-c3-c2-transition-glow-20260811`

## Changed

- reduced the Build 92 pointer-position click bloom intensity and radius;
- shortened bloom visibility to 285 ms;
- reduced bloom expansion from scale 9 to scale 4.6;
- removed the strong persistent outer neon halo from selected Audio Lab preset chips;
- kept selected preset identity through local fill, border and compact depth;
- restored reliable per-route transition replay by giving `.view.active.route-entering` a distinct `lp93-route-enter` animation name;
- aligned route transition duration with Feature 11's 260 ms replay window;
- preserved Build 92 press/release runtime and control-pop behavior;
- added Build 93 cache, build identity, documentation and regression guards.

## Root cause fixed

Build 92 used the same `lp92-view-enter` animation for both the persistent active-view state and the temporary `route-entering` state. Toggling `route-entering` therefore did not necessarily change the computed animation and could fail to restart it. Build 93 gives the temporary route state a separate animation name.

## Unchanged

- player semantics;
- queue/favorites;
- loop/seek;
- router ownership;
- Audio Lab signal/renderers;
- Worker/R2/Track Manager/Studio/SonicTrace/LRC Maker;
- Phase 7 lock.

## Validation status

Candidate until CI and real-user desktop/mobile smoke pass.
