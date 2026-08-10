# LaunchPAD Build 86 — Mobile Player / Studio UI Polish

- Build: `2026.08.10.86`
- Cache: `shinobi-launchpad-v86`
- Release: `phase-ux-c2-5-a-mobile-player-ui-polish-20260810`
- Safety branch: `safety/pre-build86-mobile-player-ui-polish-20260810-2002`

## Fixed

- Prevent the historical mobile cover fallback from flashing through the Studio Canvas at native loop boundaries.
- Hide the temporary `Track page →` Show Track escape hatch from the live mobile Studio UI.
- Make Favorite `.active` state visually authoritative on touch devices instead of sticky `:hover`.
- Suppress oversized Chromium tap-highlight/focus painting inside the mobile mini-player while keeping scoped control focus affordances.

## Preserved

- Build 83/84 single-owner native Studio Canvas loop.
- Build 85 passive `preload=auto` / no-poster parity guard.
- Build 77 single-commit seek and Lyrics settlement.
- Favorite storage semantics and Queue behavior.
- Track Video behavior.

## Explicitly untouched

No Worker deploy, no R2 mutation, no Track Manager change, no C2.5-B+, no SonicTrace C3 and no Phase 7.

Real-user Android smoke remains mandatory before PHASE UX closeout.
