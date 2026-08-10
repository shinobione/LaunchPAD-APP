# PHASE UX C2.5-A — Build 85 Studio loop parity

**Status:** IMPLEMENTED CANDIDATE — CI / REAL-USER ANDROID SMOKE PENDING  
**LaunchPAD build:** `2026.08.10.85`  
**Release:** `phase-ux-c2-5-a-studio-loop-parity-20260810`  
**Cache:** `shinobi-launchpad-v85`  
**Safety checkpoint:** `safety/pre-build85-studio-loop-parity-20260810-1917`  
**Feature branch:** `fix/build85-studio-loop-parity`

## Why Build 85 exists

Real-user Build 84 smoke substantially narrowed the remaining Android Studio issue:

- Collapsed Studio Canvas loops correctly.
- Show Track no longer breaks audio, seeks or navigation.
- Canvas still loops in Show Track.
- The remaining defect is a very short cover/poster flash at the native loop boundary, which makes the Studio loop visibly non-seamless.
- The same track's Track-page Video is genuinely seamless on the same Android device.

The two media surfaces differ in exactly the presentation properties relevant to that symptom:

- Track Video uses `preload='auto'` and no poster.
- Lyrics Studio creates the same native-loop video with `preload='none'` and assigns the track cover as `poster`.

Build 85 therefore does not invent another loop algorithm. It applies a passive parity guard so the Studio Canvas presentation matches the proven Track Video path.

## Passive parity contract

`js/features/studio-loop-parity-v85.js` is deliberately **not** a media owner.

It may:

- set the Studio Canvas `preload` property/attribute to `auto`;
- remove the Canvas `poster` attribute;
- keep the poster absent if the existing Studio renderer assigns it again;
- annotate the video with `data-loop-parity='track-video-v1'` for diagnostics;
- clarify the mobile exit action label as `Track page →`.

It must **not**:

- call `play()`;
- call `pause()`;
- call `load()`;
- set/remove/change `src`;
- set `currentTime`;
- own or emulate looping;
- add `ended`, `waiting` or `stalled` recovery;
- touch canonical audio.

Build 83/84 Lyrics Studio remains the sole Studio Canvas playback owner and native `video.loop` remains the sole loop mechanism.

## Track page action presentation

Build 84 added an explicit Track-page exit because Build 83 real-user smoke could become trapped in the Lyrics reader while trying to leave Studio.

Real-user Build 84 confirmed that explicit navigation works. Build 85 keeps the safety action but demotes it visually:

- label becomes `Track page →`;
- it is a compact secondary action aligned to the edge of the expanded track panel;
- it no longer presents as a full-width control directly underneath the Canvas.

## Preserved Build 84 behavior

Build 85 leaves untouched:

- Show Track as a layout-only transition;
- the stable 36 × 64 mobile Canvas compositor footprint;
- canonical audio playback;
- single-commit audio seek;
- timestamp-line seeking;
- Lyrics settled autoscroll;
- direct Track-page routing;
- Track Video implementation and its existing seamless native loop.

## Preserved boundaries

Build 85 does **not** modify:

- Track Manager / Studio bridge;
- public media Worker;
- Cloudflare Access;
- R2 data;
- canonical `lyrics.txt`;
- Album model / C2.5-B+;
- SonicTrace backend / C3;
- Phase 7.

No Worker deploy and no R2 mutation are required.

## Required real-user smoke

On the same Android device and same Canvas-capable track:

1. confirm Build `2026.08.10.85`;
2. enter Studio in Collapsed mode and watch at least five loop boundaries;
3. confirm there is no cover/poster flash at the loop boundary;
4. open Show Track while Canvas is already running;
5. watch at least five further loop boundaries;
6. confirm audio never buffers because of Show Track;
7. perform forward/back slider seeks and timestamp-line seeks;
8. confirm Lyrics settle normally;
9. confirm the compact `Track page →` action routes directly to the Track page;
10. open Track Video and confirm its existing seamless loop remains unchanged.

Build 85 is accepted only if Studio loop boundaries are visually seamless without regressing audio, seek, Lyrics or Track Video.

## Stop lines

- Final PHASE UX checkpoint: **NOT CREATED** pending real-user Build 85 smoke.
- C2.5-B+: **NOT STARTED**.
- C3 SonicTrace engine work: **SUSPENDED**.
- Phase 7: **NOT STARTED**.
