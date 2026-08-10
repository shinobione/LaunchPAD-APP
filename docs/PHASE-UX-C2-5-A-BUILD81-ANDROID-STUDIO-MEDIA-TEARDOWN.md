# PHASE UX C2.5-A — Build 81 Android Studio media teardown

**Status:** IMPLEMENTED CANDIDATE — CI / REAL-USER ANDROID SMOKE PENDING  
**LaunchPAD build:** `2026.08.10.81`  
**Release:** `phase-ux-c2-5-a-android-studio-media-teardown-20260810`  
**Cache:** `shinobi-launchpad-v81`  
**Safety checkpoint:** `safety/pre-build81-track-video-route-teardown-20260810-0814`  
**Feature branch:** `hotfix/build81-track-video-route-teardown`

## Real-user findings behind Build 81

Build 80 fixed the catastrophic Studio-entry crash, but Android real-user smoke still showed four regressions:

1. the decorative loop video could still fail after entering Studio;
2. seeks remained expensive/buffer-heavy;
3. the mobile Queue button appeared to do nothing while the lyrics viewport jumped;
4. Lab-Grown Gold could not be toggled as a favorite from the compact player.

The investigation found multiple independent causes rather than one generic "Studio bug".

## 1. Track-route video decoder teardown

`track-videos.js` previously paused the mobile Track video when its panel was closed, but did not release its media source when the route changed from `#track=<id>` to `#studio=<id>`.

Build 81 introduces explicit route teardown:

- pause the Track video;
- remove its `src`;
- call `load()` after source removal to release the browser decoder/network state;
- hide the Track video panel and reset its UI;
- run the teardown immediately when leaving a Track route and before opening Studio.

This prevents a hidden Track MP4 decoder from surviving behind Lyrics Studio while canonical audio seeks are performed.

## 2. Lyrics Studio Canvas disabled at source on Android mobile

Build 80 wrapped global `fetch()` to reject the Canvas media request. Build 81 removes that global interception entirely.

On Android screens up to 760 px, `lyrics-studio.js` itself now marks the Studio Canvas unavailable before its load pipeline starts:

- `canvasEnabled` starts false;
- `loadCanvas()` returns false;
- `prepareCanvasSource()` returns false before `fetch(track.video)`;
- Canvas button remains hidden;
- loop/recovery/audio-seek Canvas listeners exit immediately.

Desktop and non-Android Canvas behavior remain unchanged.

## 3. Queue above Studio + no focus-scroll jump

The Queue panel used `z-index:120`, while mobile Lyrics Studio is a full-screen overlay with higher stacking. The Queue therefore opened behind Studio, and its automatic focus transfer could move the viewport even though the panel was not visible.

Build 81:

- raises Queue to `z-index:620` while Studio is open;
- raises the queue backdrop to `619`;
- focuses Queue controls with `{ preventScroll: true }`;
- restores prior focus with `{ preventScroll: true }`.

## 4. Favorites support dynamically merged R2 tracks

`library-memory.js` previously froze `trackIds` once at module evaluation time. Tracks merged into the catalog later could therefore be playable but rejected by Favorites/History.

Build 81 replaces that static Set with `getTrackIndex(trackId) >= 0` lookups at the moment of use. This keeps Favorites/History compatible with dynamically merged remote catalog tracks such as Lab-Grown Gold.

## Preserved boundaries

Build 81 does **not** change:

- canonical audio source or Worker Range transport;
- `lyrics.txt` canonical semantics;
- Track Manager / Studio bridge;
- public Worker version;
- R2 data;
- C2.5-B canonical Album candidate;
- SonicTrace Build 05;
- C3 engine work;
- Phase 7.

No Worker deployment and no R2 mutation are required.

## Regression guards

The master specification now requires:

- Android Canvas disabled inside `lyrics-studio.js` itself;
- no global fetch interception in `android-studio-safe-mode.js`;
- Track video decoder teardown on route exit;
- Queue stacking above Studio and scroll-safe focus;
- dynamic Favorites catalog membership;
- exact Build 81 release markers.

## Required Android smoke

1. Confirm `2026.08.10.81` is loaded.
2. Start a track with a Track-page video and open that video once.
3. Enter Lyrics Studio.
4. Confirm no moving Canvas video is active in Android Studio.
5. Leave Studio and re-enter it three times.
6. Test Play/Pause.
7. Test Queue from the mobile compact player; Queue must appear above Studio without viewport jump.
8. Toggle the current track Favorite from the compact player; verify the heart state and Favorites view.
9. Perform multiple slider seeks and timestamp-line seeks.
10. Confirm lyrics settle on the selected timestamp and autoscroll resumes.
11. Background the PWA for 10–15 seconds and return.
12. Confirm Android system media controls still Pause/Play the canonical audio.

Build 81 remains a candidate until this real-user smoke passes.

## Stop lines

- C2.5-B remains separate from this hotfix.
- C2.5-C writes are not started by this hotfix.
- C3 SonicTrace engine work remains separate.
- Final PHASE UX checkpoint: **NOT CREATED**.
- Phase 7: **NOT STARTED**.
