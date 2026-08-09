# PHASE UX C2.5-A — Build 74 Video Loop Isolation

## Release

- Public build: `2026.08.09.74`
- Release: `phase-ux-c2-5-a-video-loop-isolation-20260809`
- Cache namespace: `shinobi-launchpad-v74`
- Revision: `video-loop-isolation-1`
- Safety ref before modification: `safety/pre-build74-video-loop-20260809-2323`

## Trigger

Real-user Android smoke of Build 73 showed a deterministic failure pattern in Lyrics Studio / Canvas playback:

1. audio playback and seeking worked normally;
2. the looping video froze immediately before its natural end;
3. after the loop freeze, later audio seeks could remain loading indefinitely.

The observation narrowed the failure to the video recovery layer rather than the canonical audio clock.

## Root cause found in Build 73

Build 73 contained two unsafe recovery behaviors in `js/features/feature-11.js`:

- the video `timeupdate` handler called loop recovery when less than approximately `0.14s` remained, so the stability layer itself interrupted the video before the browser reached the real `ended` boundary;
- `waiting`, `stalled` and low-ready-state recovery could call `video.load()`.

On Android Chromium using protected media URLs, those automatic reloads could create repeated media-resource churn. The video and audio remain distinct DOM elements, but they share the browser/network protected-media path. Repeated video reload/reseek activity is therefore not allowed to compete with canonical audio range seeks.

## Build 74 correction

The video layer is deliberately made weaker and more isolated:

- no `video.load()` call exists in Feature 11 recovery;
- no pre-boundary `duration - currentTime` loop reset exists;
- `waiting`, `stalled` and `suspend` events are no longer active recovery triggers;
- ordinary `ended` owns the normal loop restart;
- video progress is tracked independently;
- a watchdog may recover only a confirmed terminal stall when:
  - audio is genuinely playing;
  - the visible video has stopped advancing for at least the bounded stall threshold;
  - the video is within the final `0.75s` of its duration;
- terminal fallback resets only `video.currentTime`, then requests `video.play()`;
- it never seeks, reloads, pauses or replaces the canonical audio element.

## Audio clock retained

The Build 73 audio-clock heartbeat is retained because real-user smoke confirmed that seeking before the video failure remained correct and the displayed time followed the actual audio clock.

The heartbeat still only dispatches the existing `timeupdate` render path from the real `audio.currentTime`; it does not synthesize time.

## Regression guards

`validate-media-regressions.mjs` now requires:

- terminal-only loop fallback;
- retained audio clock heartbeat;
- no `video.load()`;
- no direct `waiting` / `stalled` recovery listeners;
- no pre-boundary recovery call.

`test-master-spec.mjs` additionally protects the Build 74 release identity and the same isolation invariants.

## Frozen boundaries

Build 74 is frontend-only.

Unchanged:

- Track Manager `v5.16`;
- Studio bridge `v1.8`;
- public media Worker `v2.6`;
- Cloudflare Access contracts;
- protected byte-range support;
- R2 objects and catalog data;
- canonical lyrics contract;
- Album schema/authority;
- SonicTrace runtime;
- C2.5-B and later;
- Phase 7.

No Worker deployment and no production R2 mutation are part of this release.

## Required real-user acceptance smoke

On Android, use a track with video/Canvas and synchronized lyrics:

1. confirm Build 74 is active;
2. start playback and open Lyrics Studio / Canvas;
3. let the video complete at least 4–5 natural loops;
4. verify there is no freeze immediately before the end;
5. seek audio before and after several video loops;
6. verify seek completes and current-time / seek bar / lyrics continue advancing;
7. background the browser for 10–15 seconds and return;
8. verify audio state remains authoritative and visible video resumes without blocking seek.

The release is not considered real-user validated until this smoke passes.

## Phase status

- Phase 6: complete and checkpointed.
- PHASE UX C2 backend: real-user validated.
- C2.5-A: implemented; Build 74 is the current mobile follow-up candidate.
- C2.5-B: not started.
- C2.5-C: not started.
- C3 SonicTrace parity: suspended pending the C2.5 decision.
- Final PHASE UX checkpoint: not created until Build 74 real-user smoke passes and closeout is complete.
- Phase 7: not started.
