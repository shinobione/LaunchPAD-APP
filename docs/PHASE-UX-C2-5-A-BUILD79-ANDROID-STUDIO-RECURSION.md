# PHASE UX C2.5-A — Build 79 Android Studio recursion hotfix

Date: 2026-08-10

Status: **IMPLEMENTED CANDIDATE — CI / PAGES / REAL-USER ANDROID SMOKE REQUIRED**

Safety ref: `safety/pre-build79-android-studio-recursion-20260810-0158`

## Real-user blocker

Build 78 introduced a fail-closed Android mobile Lyrics Studio path that replaces the decorative Canvas video with a lightweight animated artwork surface. The first real-user smoke exposed a critical regression: entering Lyrics Studio on Android could crash the application immediately.

## Root cause

The Build 78 safe-mode guard cloned the existing Canvas control and marked the clone with `data-android-safe-control="true"`. However, the lookup used on subsequent DOM mutations still selected any element with `data-lyrics-studio="canvas"`.

Because the clone retained `data-lyrics-studio="canvas"` and did not carry the detached marker at clone time, the global `MutationObserver` could treat the safe replacement as a fresh original control, clone it again, replace it again and schedule another activation. This created a self-sustaining DOM replacement loop consistent with the observed immediate mobile crash.

## Build 79 correction

Build 79 keeps the Build 78 decoder-safe strategy but makes the control replacement idempotent:

- the original-control selector explicitly excludes `[data-android-safe-control="true"]`;
- the safe replacement is marked both `data-android-safe-control="true"` and `data-android-safe-detached="true"` before insertion;
- existing safe controls are reused instead of cloned again;
- DOM-triggered activation is deduplicated through `scheduleActivate()`;
- `activate()` has an explicit re-entry guard;
- the safe visual still creates no secondary `<video>` and never reads `track.video`;
- canonical audio remains untouched by the visual fallback.

## Regression guard

`test-master-spec.mjs` now requires the exclusion selector, replacement markers, activation deduplication and re-entry guard, and explicitly rejects the old selector that could match the safe clone.

## Scope

Frontend runtime only.

No change to:

- Cloudflare Workers;
- R2 objects or catalog state;
- Track Manager v5.16 / Studio bridge v1.8;
- canonical `lyrics.txt` semantics;
- canonical Album schema;
- SonicTrace / C3;
- C2.5-B or later Album phases;
- Phase 7.

## Required real-user smoke

On Android mobile after Pages deployment:

1. confirm Build 79 is loaded;
2. enter Lyrics Studio — the application must remain responsive;
3. confirm `MOBILE SAFE VISUAL` is rendered instead of the real Canvas video;
4. leave/re-enter Lyrics Studio several times;
5. toggle Canvas on/off several times;
6. play/pause audio and seek through multiple lyric timestamps;
7. background/foreground the app once;
8. confirm there is no crash, freeze or runaway DOM activity.

The final PHASE UX checkpoint remains intentionally not created until real-user smoke passes.
