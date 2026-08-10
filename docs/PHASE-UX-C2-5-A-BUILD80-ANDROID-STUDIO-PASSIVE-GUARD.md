# PHASE UX C2.5-A — Build 80 Android Studio passive Canvas guard

**Status:** IMPLEMENTED CANDIDATE — CI / REAL-USER ANDROID SMOKE PENDING  
**LaunchPAD build:** `2026.08.10.80`  
**Release:** `phase-ux-c2-5-a-android-studio-passive-canvas-guard-20260810`  
**Cache:** `shinobi-launchpad-v80`  
**Safety checkpoint:** `safety/pre-build80-android-studio-source-disable-20260810-0748`  
**Feature branch:** `hotfix/build80-android-studio-source-disable`

## Why Build 80 exists

Real-user Android smoke proved that Build 79 still crashes when entering Lyrics Studio. Build 79 fixed the specific Build 78 self-cloning Canvas-control recursion, but the Android safe-mode remained an invasive second owner of the Lyrics Studio DOM: it replaced controls, inserted an alternate Canvas shell and observed the entire document tree while the real Studio renderer and compatibility layers were also mutating the same controls.

The important conclusion is therefore broader than the Build 78 clone bug: **Android Studio safety must not be implemented by post-render DOM ownership.**

## Build 80 strategy

Build 80 removes the active DOM-patching strategy entirely.

On Android screens up to 760 px:

- no Studio control is cloned;
- no Studio control is replaced;
- no alternate Canvas shell is injected;
- no global `MutationObserver` watches the application DOM;
- no secondary `<video>` is created by the guard;
- no canonical audio transport method is called by the guard;
- the real Lyrics Studio implementation remains the only owner of its controls and audio/lyrics behavior.

The guard only wraps `fetch()` before the application engine starts. While the real Lyrics Studio route is active, it rejects **only** the request whose URL exactly matches the current `.lyrics-studio-canvas-video[data-src]` value. This prevents the decorative MP4 body from becoming a Blob/video decoder source on the Android mobile Studio path.

The native Lyrics Studio Canvas code receives a normal rejected Promise from its existing `prepareCanvasSource()` path and falls back through its existing error handling. The current cover/poster may remain visible as a lightweight preview, but no MP4 body is supplied to the Canvas decoder.

The Canvas toggle is hidden through CSS on this device/mode path so the user cannot manually re-enable repeated decoder attempts.

## Preserved boundaries

Build 80 does **not** change:

- canonical audio playback or seek ownership;
- synchronized lyrics parsing/autoscroll;
- `lyrics.txt` canonical semantics;
- Track Manager v5.16 / Studio bridge v1.8;
- public Worker v2.6;
- Cloudflare Access;
- R2 data;
- Album schema / C2.5-B;
- SonicTrace / C3;
- Phase 7.

No Worker deployment and no R2 mutation are required.

## Regression guard

`scripts/test-master-spec.mjs` now requires the passive fetch guard and explicitly forbids the Build 78/79 runtime mechanisms inside `android-studio-safe-mode.js`:

- `MutationObserver`;
- `cloneNode()`;
- `replaceWith()`;
- `insertBefore()`;
- a secondary `document.createElement('video')`;
- `audio.pause()` / `audio.load()`.

## Required real-user smoke

On the Android device that reproduced the crash:

1. confirm `2026.08.10.80` is loaded;
2. open a track and enter Lyrics Studio;
3. the application must remain open and responsive;
4. exit and re-enter Lyrics Studio three times;
5. play/pause canonical audio;
6. perform a short seek and a large forward/back seek;
7. tap timestamped lyrics and confirm the canonical audio follows;
8. background the PWA for 10–15 seconds and return;
9. confirm audio, time display and lyrics remain usable;
10. confirm the decorative MP4 Canvas is not decoded on Android mobile Studio.

Until this smoke passes, Build 80 remains a candidate and the final PHASE UX checkpoint remains uncreated.

## Stop lines

- C2.5-B: not advanced by this hotfix.
- C3 SonicTrace engine work: unchanged/suspended.
- Final PHASE UX checkpoint: **NOT CREATED**.
- Phase 7: **NOT STARTED**.
