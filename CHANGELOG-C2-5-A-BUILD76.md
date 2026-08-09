# LaunchPAD Build 76 — Canvas transport isolation

Date: 2026-08-10

Release: `phase-ux-c2-5-a-canvas-transport-isolation-20260810`

Cache: `shinobi-launchpad-v76`

## Fixed

- Real-user Android smoke of Build 75 still reproduced Canvas failure: moving Canvas -> loading spinner -> cover/poster in the Canvas frame -> later canonical-audio seek stuck waiting.
- Lyrics Studio no longer assigns the protected remote video URL directly to its `<video>` element for looping playback.
- Canvas media is fetched once through CORS, converted to a local Blob and looped from a `blob:` object URL.
- Removed Lyrics Studio's manual `ended` loop fallback and retry timer path so native local loop is the only Canvas loop mechanism.
- During canonical-audio `seeking`, only the decorative Canvas pauses; it may resume after the real audio `seeked` event.
- Object URLs are revoked when the Canvas transport is reset.

## Preserved

- Build 73 real-audio-clock heartbeat.
- Build 74 terminal-only recovery for the separate Track Video surface.
- Build 75 Feature 11 ownership boundary (`video.track-video-player` only).
- Canonical audio remains the only playback clock.
- Canonical `lyrics.txt` contract unchanged.
- Audio Lab sanctuary unchanged.

## Deployment boundaries

Frontend-only candidate:

- no Worker source/deploy;
- no R2 mutation;
- no catalog rebuild;
- no Album schema/migration;
- no SonicTrace change;
- no C2.5-B/C3/Phase 7 work.

Real-user Android smoke is required before acceptance.
