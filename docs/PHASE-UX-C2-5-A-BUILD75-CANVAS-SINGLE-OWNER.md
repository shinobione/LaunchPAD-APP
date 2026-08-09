# PHASE UX C2.5-A — Build 75 Canvas single-owner correction

Date: 2026-08-09
Status: IMPLEMENTED CANDIDATE — REAL USER ANDROID SMOKE PENDING

## Symptom observed after Build 74

Real-user Android smoke clarified that the Canvas video itself no longer froze before its end. Instead, at the loop boundary the track cover appeared inside the video frame and subsequent audio seeks could remain loading indefinitely.

The visible cover is not a separate replacement component: Lyrics Studio intentionally assigns the track cover as the video `poster`. Seeing that poster after the first pass means the Canvas media element stopped/restarted unsuccessfully at the loop boundary.

## Root cause

Builds 73/74 made Feature 11 a generic video-stability layer with this selector:

`video.track-video-player, video.lyrics-studio-canvas-video`

That accidentally gave Feature 11 ownership of the Lyrics Studio Canvas lifecycle even though `lyrics-studio.js` already owns that Canvas, including its native loop and fallback behavior.

As a result, the same Lyrics Studio video could be controlled by two independent loop systems:

- Lyrics Studio Canvas lifecycle;
- Feature 11 manual end/stall recovery.

On Android protected media, competing loop/reset/play operations at the boundary can leave the Canvas on its poster and can create media-pipeline contention severe enough that later canonical-audio seeks remain waiting.

## Build 75 correction

Feature 11 now stabilizes only:

`video.track-video-player`

It no longer selects or mutates:

`video.lyrics-studio-canvas-video`

Therefore:

- Lyrics Studio is the sole owner of its Canvas lifecycle again;
- Feature 11 cannot disable/re-enable or manually restart the Lyrics Studio loop;
- Feature 11 keeps its Build 74 terminal-only recovery for the separate Track Video surface;
- the Build 73 real-audio-clock heartbeat remains unchanged;
- no third watchdog or new Canvas recovery layer is introduced.

## Regression guards

Build 75 guards require the exact Feature 11 selector:

`const VIDEO_SELECTOR = 'video.track-video-player'`

and reject the previous combined Track Video + Lyrics Studio Canvas selector.

Existing guards continue to reject:

- automatic Feature 11 `video.load()` recovery;
- pre-boundary recovery;
- Feature 11 `waiting` / `stalled` recovery listeners;
- Worker deployment coupling;
- Audio Lab sanctuary regressions;
- canonical Lyrics contract regressions.

## Release identity

- Build: `2026.08.09.75`
- cache: `shinobi-launchpad-v75`
- release: `phase-ux-c2-5-a-canvas-single-owner-20260809`
- revision: `canvas-single-owner-1`

Safety snapshot before implementation:

`safety/pre-build75-canvas-loop-20260809-2348`

## Frozen boundaries

Build 75 is LaunchPAD frontend-only.

It changes no:

- Cloudflare Worker source or deployment;
- R2 object/catalog data;
- Track Manager route/schema;
- canonical Album model or migration;
- SonicTrace engine/persistence;
- canonical `lyrics.txt` contract;
- LRC Maker runtime;
- C2.5-B+ implementation;
- Phase 7 runtime.

## Required real-user smoke

Before Build 75 can be accepted:

1. open a track with Canvas in Lyrics Studio on the affected Android device;
2. let the Canvas complete at least 4–5 uninterrupted loops;
3. confirm the cover/poster does not replace the Canvas at the boundary;
4. seek the canonical audio several times after multiple Canvas loops;
5. confirm seeks complete immediately and playback resumes normally;
6. optionally background/restore the PWA once and repeat a seek.

Until that smoke passes, PHASE UX final closeout and the final completion checkpoint remain blocked.

PHASE 7 STATUS: NOT STARTED
