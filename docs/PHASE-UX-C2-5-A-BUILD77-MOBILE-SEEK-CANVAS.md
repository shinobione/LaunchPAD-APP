# PHASE UX C2.5-A — Build 77 Mobile Seek + Canvas Recovery

Date: 2026-08-10

Status: **IMPLEMENTED CANDIDATE — CI / REAL-USER ANDROID SMOKE REQUIRED**

Release: `2026.08.10.77`

Cache: `shinobi-launchpad-v77`

Safety ref: `safety/pre-build77-mobile-seek-canvas-20260810-0024`

## Evidence from Build 76 real-user smoke

Build 76 improved the failure mode but did not close it on Android:

- the Lyrics Studio Canvas could still stop and expose the track cover/poster inside the video frame;
- seeking eventually recovered more often than before, but could still take roughly 15 seconds;
- synchronized lyrics could jump to the requested region while auto-scroll remained unsettled and only gradually returned to the correct reading position.

The Build 76 local Blob transport therefore remains useful, but three additional runtime mechanisms were identified.

## Root cause 1 — continuous media seeks while dragging

The main range control historically handled every `input` event by writing directly to `audio.currentTime`.

On a touch drag, many `input` events can be emitted before the finger is released. Each event could therefore create another real media reposition request and another protected-media Range transition.

### Build 77 contract

The seek control is intercepted in capture phase before the legacy bubbling handler:

- `input` = UI/lyrics preview only;
- `pointerup` / `change` = one deduplicated canonical `audio.currentTime` commit;
- a preview never mutates the real media position.

Custom events keep Lyrics synchronization explicit:

- `shinobi:seek-preview`
- `shinobi:seek-commit`

## Root cause 2 — Lyrics scroll race around seek settlement

The previous Lyrics controller reacted to both `seeking` and `seeked` with normal synchronization updates while its requestAnimationFrame clock could also continue updating.

That allowed several competing smooth-scroll decisions around an unsettled audio position.

### Build 77 contract

- entering seek sets an explicit `seekInProgress` state;
- the Lyrics sync clock stops during the seek;
- preview/commit updates highlight the expected lyric without scrolling the reader;
- `seeked` ends the seek state;
- the runtime waits two animation frames for layout/media state to settle;
- then it performs one bounded `behavior: 'auto'` recenter on the active lyric;
- normal Lyrics sync resumes only afterwards.

## Root cause 3 — Android native loop still failing on a local Blob

Build 76 proved that eliminating repeated remote Canvas Range traffic was not sufficient: Android could still fail the native `video.loop` transition and expose the poster.

### Build 77 contract

The Canvas remains network-isolated through the Build 76 Blob transport, but native loop is disabled.

Normal loop:

1. local Blob video reaches `ended`;
2. Canvas-only `currentTime` resets to zero;
3. Canvas-only `play()` restarts the local Blob.

No remote Canvas URL is assigned to the video element after Blob preparation.

### Bounded decoder recovery

`waiting`, `stalled` or `error` on the local Blob may schedule a recovery after a grace period. Recovery is deliberately bounded:

- maximum two recovery attempts per current Canvas transport;
- recovery only touches the local Canvas video;
- the canonical audio element is never loaded, paused, sought or restarted by Canvas code;
- after the recovery budget is exhausted, Canvas degrades to `CANVAS PAUSED` instead of entering an infinite recovery loop.

The poster is removed once the Blob video has loaded/played so a decoder failure should not visually masquerade as a valid moving Canvas.

## Audio-first seek priority

Build 76 resumed Canvas on `audio.seeked`. Real Android smoke showed that the audio could still spend significant time buffering after that event.

Build 77 therefore keeps Canvas paused through the entire audio seek/buffer transition:

- `audio.seeking` → pause Canvas;
- `audio.seeked` → Canvas remains paused;
- real `audio.playing` → Canvas may resume.

Canonical audio always wins decoder/network priority.

## Preserved contracts

Build 77 preserves:

- Build 76 local Blob Canvas transport;
- Build 75 single Canvas ownership boundary;
- Build 74 separate Track Video recovery;
- Build 73 real-audio-clock heartbeat;
- Album Focus / Era Queue UX;
- nine protected Audio Lab presets and Spectrum sanctuary;
- canonical `lyrics.txt` synchronization contract;
- Track Manager / Studio production bridge state.

## Explicit non-scope

Build 77 is frontend-only.

It does **not**:

- modify or deploy either Cloudflare Worker;
- mutate R2 or `catalog/index.json`;
- change Track Manager routes or schemas;
- create canonical Album objects;
- begin C2.5-B or later;
- change SonicTrace;
- begin C3;
- create the final PHASE UX checkpoint;
- begin Phase 7.

## Required real-user Android smoke

Acceptance requires a real installed/mobile PWA test after GitHub Pages publication:

1. confirm visible Build 77 runtime/update;
2. open a track with Canvas in Lyrics Studio;
3. let the Canvas cross at least five natural loop boundaries;
4. verify that the cover does not replace the moving Canvas during normal loops;
5. drag the main seek bar across a large distance and release once;
6. verify that playback resumes materially faster than the Build 76 ~15-second failure;
7. repeat forward/backward seeks several times;
8. verify that Lyrics highlight may preview during drag but the reader recenters once after settlement rather than slowly chasing the new position;
9. verify Canvas stays paused while audio is buffering and only resumes after audio really plays;
10. background the app briefly and return;
11. verify audio remains authoritative even if Canvas degrades to `CANVAS PAUSED`.

Until those checks pass, Build 77 remains a candidate and PHASE UX remains open.