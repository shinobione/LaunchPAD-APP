# LaunchPAD Build 77 — Mobile seek + Canvas recovery

Date: 2026-08-10

Release: `phase-ux-c2-5-a-mobile-seek-canvas-20260810`

Cache: `shinobi-launchpad-v77`

## Fixed

- Main seek dragging no longer writes repeatedly to `audio.currentTime`; drag is preview-only and release commits one media seek.
- Lyrics synchronization pauses its scroll clock while seeking and performs one settled recenter after `seeked`.
- Lyrics no longer slowly chase a seek target through competing smooth-scroll updates.
- Lyrics Studio keeps the Build 76 local Blob transport but disables native video loop on Android.
- Canvas loops manually from the local Blob at the real `ended` boundary.
- Local Canvas decoder recovery is bounded to two attempts and then degrades safely to `CANVAS PAUSED`.
- Canvas remains paused through `audio.seeked` and resumes only after canonical audio emits real `playing`.
- Loaded local Canvas removes its poster so a stopped decoder does not silently present cover art as a valid Canvas.

## Preserved

- canonical audio is the only playback clock;
- Build 73 audio-clock heartbeat;
- Feature 11 remains limited to the separate Track Video surface;
- canonical `lyrics.txt` contract;
- Audio Lab sanctuary;
- Album/Era behavior.

## Deployment boundaries

Frontend-only candidate:

- no Worker source/deploy;
- no R2 mutation;
- no catalog rebuild;
- no Track Manager route/schema change;
- no canonical Album schema/migration;
- no SonicTrace change;
- no C2.5-B/C3/Phase 7 work.

Real-user Android smoke is mandatory before acceptance.