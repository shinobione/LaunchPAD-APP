# CHANGELOG — C3-C.5 — Build 96

Build: `2026.08.11.96`  
Release: `phase-ux-c3-c5-lyrics-autoscroll-20260811`

## Fixed

- Normal desktop Lyrics no longer depends on page-level vertical scrolling; the workspace is constrained above the persistent player.
- `#lyrics-reader` is again an explicit finite internal scroll container.
- Auto-scroll now repairs a stale active-line DOM state when playback progressed while Lyrics was hidden.
- Lyrics route changes reconcile after layout settle and force-center the current synchronized line.
- Lyrics loads performed while the view is visible receive the same settled reconciliation.

## Preserved

- Build 95 smooth route motion, navigation order, Eras scrollbar cleanup, Album scalability, Show/Hide Tracks pill and Audio Lab sizing.
- Build 93 click/glow tuning.
- Lyrics Studio behavior and Canvas/native-loop ownership.
- Global player, queue, favorites, seek, loop/repeat/shuffle.
- Worker/R2/Track Manager/Studio/SonicTrace/LRC Maker boundaries.

Safety checkpoint: `safety/pre-c3-c5-build96-lyrics-autoscroll-viewport-20260811-2300`.
