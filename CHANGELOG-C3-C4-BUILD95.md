# LaunchPAD Build 95 — C3-C.4

Date: 2026-08-11
Build: `2026.08.11.95`
Release: `phase-ux-c3-c4-smooth-layout-20260811`

## Fixed

- route transitions are de-janked: 280 ms opacity + small vertical settle only, no blur/scale/filter stack;
- repeated route signals are de-duplicated so the same page does not visibly restart its transition;
- Albums is placed directly below Discography and above Favorites in the real desktop nav DOM;
- redundant cyan/violet active-menu rail removed;
- Era strip browser scrollbar hidden while horizontal scrolling stays available;
- Lyrics desktop workspace fits the normal viewport/player budget more cleanly;
- Audio Lab stage uses substantially more available vertical space;
- Audio Lab preset pills get enough overflow/clearance to avoid losing their top edge;
- Album Show/Hide Tracks control is now a stable integrated pill with track count and chevron;
- future Album libraries with five or more projects gain a three-column wide-desktop mode instead of endlessly widening cards.

## Preserved

- Build 93 click-glow intensity remains the accepted interaction baseline;
- Show/Hide Tracks Album Focus behavior remains functional;
- no player, queue, seek, loop, favorites, router destination, Audio Lab DSP, Worker, R2, Track Manager, Studio, SonicTrace or LRC Maker behavior change;
- Phase 7 remains locked.

Safety checkpoint: `safety/pre-c3-c4-build95-layout-smooth-20260811-2142`.

Real-user acceptance pending.