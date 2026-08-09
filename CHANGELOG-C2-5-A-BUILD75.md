# LaunchPAD Build 75 — Lyrics Studio Canvas single-owner isolation

Date: 2026-08-09
Release: `phase-ux-c2-5-a-canvas-single-owner-20260809`
Build: `2026.08.09.75`
Cache: `shinobi-launchpad-v75`

## Fixed

- removed `video.lyrics-studio-canvas-video` from Feature 11 video recovery scope;
- restored Lyrics Studio as the sole owner of its Canvas/native-loop lifecycle;
- prevents Feature 11 from disabling/restarting the Canvas at the same loop boundary as Lyrics Studio;
- preserves Build 74 terminal-only recovery for the separate Track Video surface;
- preserves Build 73 real-audio-clock heartbeat unchanged.

## Why

Real-user Android smoke of Build 74 showed that the Canvas no longer froze early, but at the loop boundary its poster/track cover appeared and later audio seeks could remain loading indefinitely. The poster is owned by Lyrics Studio's video element; inspection confirmed that Feature 11 was still attaching a second loop/recovery system to the same Canvas element.

## Safety

- frontend-only LaunchPAD correction;
- no Worker source/deployment;
- no R2/catalog mutation;
- no Track Manager route/schema change;
- no SonicTrace change;
- no canonical Lyrics/LRC change;
- no canonical Album schema/migration;
- no C2.5-B+ work;
- no Phase 7 work.

Safety ref: `safety/pre-build75-canvas-loop-20260809-2348`.

Real-user Android loop + post-loop audio-seek smoke remains mandatory before PHASE UX closeout.
