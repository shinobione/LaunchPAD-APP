# CHANGELOG — C3-C.7 — Build 98

Build: `2026.08.12.98`  
Release: `phase-ux-c3-c7-responsiveness-20260812`

## Fixed

- Mobile menu gets a temporary boot listener before remote catalog hydration, removing the several-second dead first tap during cold start.
- Noncritical About/history/Visual Card/Smart Canvas/Canvas identity work is deferred until after the core app is ready.
- Mobile lyrics requests are capped at two concurrent fetches, with visible Lyrics requests prioritized over background indexing.
- Playback controls self-heal from stale `starting` state when native media time is genuinely advancing.
- Track Detail Moods / Themes are reconciled into the hero as soon as the Track Detail DOM renders instead of waiting for a later interaction.

## Preserved

- Build 96 Lyrics auto-scroll / single-screen desktop behavior.
- Build 97 mobile Home / Albums / bounded Lyrics picker behavior.
- Player/queue/favorites/loop/repeat/shuffle/seek semantics.
- Audio Lab, Track Video, Workers/R2, Track Manager, Studio, SonicTrace and LRC Maker boundaries.

Safety checkpoint: `safety/pre-c3-c7-build98-responsiveness-20260812-0038`.
