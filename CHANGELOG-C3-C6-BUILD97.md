# CHANGELOG — C3-C.6 — Build 97

Build: `2026.08.11.97`  
Release: `phase-ux-c3-c6-mobile-cleanup-20260811`

## Fixed

- Mobile Home hides the redundant `Recently added` catalog block.
- Mobile Album cards are compacted for phone widths; tag clouds become horizontal metadata rails.
- Mobile Show/Hide Tracks expands each Album independently instead of collapsing another Album and moving the viewport.
- Mobile Album expansion bypasses document View Transitions and no longer auto-scrolls the page after a tap.
- Normal Lyrics replaces the oversized white native track dropdown with a bounded dark LaunchPAD listbox.
- Lyrics Studio keeps the native selector and existing Studio behavior.

## Preserved

- Build 96 Lyrics auto-scroll and single-screen desktop workspace.
- Build 95 route motion, desktop Album layout, Audio Lab sizing, Eras cleanup and navigation order.
- Build 93 click/glow tuning.
- Player, queue, favorites, seek, loop/repeat/shuffle and Track Video behavior.
- Worker/R2/Track Manager/Studio/SonicTrace/LRC Maker boundaries.

Safety checkpoint: `safety/pre-c3-c6-build97-mobile-cleanup-20260811-2330`.
