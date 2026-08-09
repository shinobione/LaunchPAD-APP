# LaunchPAD Build 73 — Mobile Media Stability

Date: 2026-08-09

- Removed the experimental Ninja Home hero injection after real-user review showed it obscured the existing Home composition.
- Preserved the gold sidebar SHINOBIWAN identity and About Moon artwork.
- Added an audio-clock heartbeat that rereads the real `audio.currentTime` through the existing `timeupdate` renderer when Android Chromium throttles native media events.
- Replaced competing native-video-loop + manual recovery behavior with one explicit Feature 11 loop/recovery authority.
- Added a visible-video stalled-progress watchdog plus pageshow/visibility recovery.
- Extended regression guards for the mobile player clock, explicit video looping, and Ninja rollback.
- Advanced public release identity to `2026.08.09.73` / `phase-ux-c2-5-a-mobile-media-stability-20260809` / cache `shinobi-launchpad-v73`.

No Worker deployment, R2 mutation, Album schema, catalog projection, SonicTrace engine, LRC contract, C2.5-B, C3 or Phase 7 change is included.

Real-user Android smoke remains required before Build 73 is accepted.
