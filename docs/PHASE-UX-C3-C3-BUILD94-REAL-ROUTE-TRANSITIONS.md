# PHASE UX / C3-C.3 — Build 94 real route transitions

Date: 2026-08-11
LaunchPAD candidate: `2026.08.11.94`
Release: `phase-ux-c3-c3-real-route-transitions-20260811`
Safety checkpoint: `safety/pre-c3-c3-build94-real-transitions-20260811-2115`

## Real-user finding after Build 93

The Build 93 glow tuning is accepted perceptually, but the expected page transitions are still not visible in real browser use. The supplied real-user video confirms abrupt navigation for examples including:

- Favorites → Discography;
- Albums → Neon Heartbreaks;
- Neon Heartbreaks → Before the Noise.

The same video also exposes a separate interaction-quality issue on the Album library `Open project →` text action: treating this text link like a glowing button produces a visually noisy impact state.

## Root cause

CSS class replay alone is not a reliable transition owner for this application topology.

Normal hash routes are announced through the shared router, but Track Detail has an intentionally isolated direct route path: `navigateToTrack()` performs `history.pushState()` and renders `#view-track` directly. That route does not emit the same generic route-change event. Reusing CSS animation declarations on `.view.active` therefore cannot guarantee a fresh, visible animation across every route family.

## Build 94 behavior

Build 94 keeps application routing ownership unchanged and moves only the presentation transition replay into the existing premium runtime.

The premium runtime now:

- listens to `shinobi:route-change`, `hashchange` and `popstate`;
- detects user navigation intents such as sidebar navigation, `data-view-target`, Album open actions, Track cover links and Track Detail back/lyrics routes;
- waits until the existing route handler has completed;
- resolves the actual `.main-content > .view.active` surface;
- runs a fresh Web Animations API transition on that surface every time;
- uses a clearly visible but short 340 ms settle: opacity + 24 px vertical depth + micro-scale + brightness/saturation settle;
- cancels an in-flight presentation animation cleanly if the user navigates again;
- respects `prefers-reduced-motion`;
- never calls `preventDefault()`, `stopPropagation()` or `stopImmediatePropagation()`.

The historical Feature 11/CSS replay remains in the repository for compatibility ancestry, but Build 94 disables CSS-owned `.view.active` animations so there is only one perceptual transition owner.

## Open project action cleanup

Album `Open project →` and Track Detail Album text links now behave like premium text actions rather than luminous pills:

- no impact bloom child is rendered visibly;
- no persistent box-shadow;
- hover uses a small horizontal movement and restrained text shimmer;
- press remains tactile without producing a glowing rectangle.

The stronger bloom remains available on actual buttons and player controls where the real-user smoke already judged it acceptable.

## Frozen boundaries

Build 94 does not change:

- router logic or URL semantics;
- Track Detail ownership;
- player / queue / loop / seek / favorites behavior;
- Audio Lab analyser or renderer logic;
- Album membership/order or canonical data;
- Worker runtime or deployment;
- R2;
- Track Manager;
- Studio;
- SonicTrace;
- LRC Maker.

Phase 7 remains locked.

## Acceptance

Build 94 remains a candidate until real-user smoke confirms both:

1. page transitions are now clearly visible across normal views **and** Track Detail navigation;
2. `Open project →` no longer produces an ugly glow/pill artifact.
