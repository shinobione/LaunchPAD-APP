# LaunchPAD Build 94 — C3-C.3 real route transitions

Date: 2026-08-11
Build: `2026.08.11.94`
Release: `phase-ux-c3-c3-real-route-transitions-20260811`

## Changed

- replaced unreliable CSS-only route replay with a fresh Web Animations API transition on the actual active view;
- normal router events, hash changes, history navigation and direct Track Detail pushState navigation are covered;
- transition is deliberately visible: 340 ms opacity/depth/micro-scale settle without delaying the underlying navigation;
- Build 93 click bloom tuning remains intact;
- `Open project →` and Track Detail Album text actions no longer receive the button-style impact bloom or persistent outer box-shadow;
- reduced-motion behavior remains supported;
- added Build 94 regression coverage and converted the Build 93 guard to successor-safe ancestry semantics.

## Preserved

No player, queue, loop, seek, favorites, routing ownership, Audio Lab DSP/rendering, Worker, R2, Track Manager, Studio, SonicTrace or LRC Maker behavior change.

Safety checkpoint: `safety/pre-c3-c3-build94-real-transitions-20260811-2115`.

Real-user acceptance remains pending.
