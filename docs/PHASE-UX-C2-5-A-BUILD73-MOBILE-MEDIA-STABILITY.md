# PHASE UX C2.5-A — Build 73 Mobile Media Stability

Status: **release candidate / real-user smoke pending**

Release identity:

- Build: `2026.08.09.73`
- Release: `phase-ux-c2-5-a-mobile-media-stability-20260809`
- Cache: `shinobi-launchpad-v73`
- Safety ref: `safety/pre-build73-mobile-media-20260809-2238`

## Why this patch exists

Real-user Android smoke after Build 72 exposed two regressions that were not visible in desktop CI:

1. the experimental `NinJa-ShinoBiWan.png` Home hero column obscured the established Home composition;
2. mobile media could intermittently show a frozen player time/progress and unreliable Canvas/video loop boundaries.

## Brand-art rollback

Build 73 removes only the Home Ninja injection from `css/about-enhancements.css`.

Preserved:

- enlarged gold SHINOBIWAN sidebar wordmark;
- `assets/Lune-ShinoBiWan.png` on About;
- the Ninja file itself remains in the repository as an unused asset for possible future artwork.

No Home content is replaced by another decorative asset in this patch.

## Audio clock authority

The HTML audio element remains the single playback clock. Build 73 does **not** synthesize time, seek the audio, or run a parallel timer model.

`feature-11.js` adds a lightweight `requestAnimationFrame` heartbeat while playback is active. At a bounded cadence it dispatches the existing `timeupdate` path, which rereads real `audio.currentTime` and lets the established `app-main.js` renderer continue updating:

- current time;
- seek bar;
- mini-player progress;
- Lyrics Studio progress;
- synchronized lyric activation;
- Media Session position.

This is a recovery layer for browsers that starve native `timeupdate` events during mobile media/UI transitions.

Lifecycle recovery covers `play`, `playing`, `seeked`, metadata/duration changes, `pageshow`, and return from `visibilitychange`.

## Video loop authority

Previously, stabilized videos could combine native `video.loop = true` with separate manual boundary/ended recovery. On Android this can race at the loop edge.

Build 73 makes the Feature 11 stability layer the only loop authority after hydration:

- native `loop` is disabled on stabilized videos;
- `ended` / near-boundary recovery resets the video explicitly;
- `waiting`, `stalled` and low-ready-state `suspend` reuse the same recovery path;
- a small watchdog observes whether visible video time has stopped progressing while real audio is still playing;
- `pageshow` and visible-tab restoration resynchronize eligible videos.

The video layer never pauses, seeks, restarts or otherwise owns the real music audio element.

## Regression guards

`validate-media-regressions.mjs` now requires:

- explicit manual video-loop ownership;
- mobile stalled-video watchdog;
- audio-clock heartbeat and lifecycle recovery;
- preservation of Lyrics Studio / track-video routing;
- absence of the Ninja Home CSS injection;
- preservation of gold sidebar + About Moon branding.

The master release specification advances to Build 73 without weakening existing Audio Lab, Track Manager, Studio, Worker or PWA guards.

## Frozen boundaries

This release changes **no**:

- Cloudflare Worker source or deployment;
- R2 object;
- catalog projection;
- track manifest schema;
- Album schema/migration;
- Track Manager route;
- SonicTrace engine;
- LRC Maker contract;
- canonical `lyrics.txt` rule;
- C2.5-B/C3 implementation;
- Phase 7 scope.

## Acceptance smoke

Before declaring Build 73 successful, perform Android/mobile real-user smoke:

1. update/reload the PWA to Build 73;
2. open Home and confirm the Ninja no longer occupies/obscures the hero;
3. start a track and keep it playing through Lyrics Studio transitions;
4. confirm current time/progress continues to advance for several minutes;
5. enable Canvas/video and observe several video loop boundaries;
6. background/foreground the browser once and confirm time/progress + video recover;
7. seek to several points and verify displayed time catches up immediately;
8. confirm audio itself never restarts merely because the Canvas loops.

Final PHASE UX checkpoint remains **NOT CREATED**. C2.5-B remains **NOT STARTED**. C3 remains suspended. Phase 7 remains **NOT STARTED**.
