# PHASE UX C2.5-A — Build 78 Android Studio Safe Mode

Date: 2026-08-10

Status: **IMPLEMENTED CANDIDATE — CI / PAGES / REAL-USER ANDROID SMOKE REQUIRED**

Safety ref: `safety/pre-build78-studio-media-isolation-20260810-0110`

## Why Build 78 exists

Real-user Android smoke of Build 77 proved that the remaining failure is specifically tied to **mobile Lyrics Studio with the Canvas/track panel open**.

Observed sequence on the user's Android/MIUI device:

1. canonical audio starts normally;
2. the Studio Canvas renders moving video frames;
3. after a video loop boundary the Canvas can turn black;
4. the Canvas poster/cover can then replace the moving video;
5. the canonical audio transport may enter a degraded state where Android Media Session controls can no longer pause reliably;
6. slider seek is improved compared with Builds 75/76, but Studio lyric auto-scroll can remain offset after a seek;
7. tapping a timestamped lyric line can fail to produce a deterministic jump while this Studio media state is unhealthy.

Builds 73-77 progressively removed pre-boundary recovery, remote video transport, continuous drag-seeking and overlapping Canvas ownership. The remaining real-device evidence shows that the **secondary Android video decoder itself is not reliable enough inside Studio to remain on the critical playback path**.

## Build 78 decision

On Android screens up to 760 px, and **only while Lyrics Studio mode is active**, LaunchPAD no longer runs a second `<video>` decoder for the decorative Studio Canvas.

Instead it uses a decoder-safe visual surface built from the current canonical artwork:

- current track artwork remains visible in the Canvas frame;
- a slow transform provides visual motion without media decoding;
- the surface is labelled `MOBILE SAFE VISUAL`;
- `prefers-reduced-motion` disables the transform;
- the user-facing `Canvas on/off` control remains available, but it controls the safe visual in this device/mode combination.

The original Lyrics Studio Canvas engine remains intact for desktop/non-Android behavior and is not deleted from the codebase. Build 78 is a targeted reliability fallback, not a global removal of Canvas video support.

## Audio authority

Build 78 does not create, load, seek, play or pause any secondary media element in the Android Studio fallback.

The canonical `#audio` element remains the only media transport authority. The safe-mode module never calls `audio.pause()` or `audio.load()` and never reads `track.video`.

This deliberately removes the failure path where a decorative video decoder could poison or monopolize the same Android media pipeline used by the canonical audio and Media Session controls.

## Timestamp line selection

Android Studio adds a capture-phase line-selection contract for synchronized lyrics:

1. one tap on `.lyric-line[data-time]` is intercepted before the older line handler;
2. one `shinobi:seek-commit` event is emitted;
3. one canonical `audio.currentTime` change is performed;
4. playback is requested only when the canonical audio is genuinely paused;
5. after `seeked`/`playing`, the active lyric is recentered deterministically using immediate bounded reader scroll.

The existing Build 77 single-commit main slider behavior remains in place.

## Preserved behavior

Build 78 preserves:

- Build 77 slider single-commit seek;
- Build 77 Lyrics seek settlement ancestry;
- Build 73 audio-clock heartbeat;
- normal Track Video ownership/recovery outside Lyrics Studio;
- desktop Lyrics Studio real Canvas video;
- non-Android mobile behavior;
- Media Session metadata/actions;
- Era queues, Album Focus, Audio Lab and all existing catalog behavior;
- canonical `lyrics.txt` authority.

## Explicit non-scope

Build 78 changes no:

- Cloudflare Worker source or deployment;
- R2 object or catalog index;
- Track Manager contract;
- canonical Album schema;
- Studio backend contract;
- SonicTrace runtime;
- C2.5-B architecture;
- C3 backend/analysis work;
- Phase 7 implementation.

## Required real-user Android smoke

After CI and GitHub Pages publication, verify on the same Android/MIUI device:

1. confirm LaunchPAD reports Build 78;
2. play `Lab-Grown Gold` or another track with Canvas;
3. enter Lyrics Studio and expose the track panel;
4. confirm the Canvas area is labelled `MOBILE SAFE VISUAL` and does not instantiate moving MP4 video;
5. leave playback running for several minutes — canonical audio and Android Media Session pause/play must stay responsive;
6. perform several main-slider seeks;
7. tap several timestamped lyric lines;
8. confirm each line tap performs one jump and the active line recenters cleanly;
9. leave/re-enter the PWA and verify system Media Session pause/play remains functional;
10. verify desktop/non-Android Canvas video remains unchanged.

Build 78 must not be marked complete until this real-device smoke passes.
