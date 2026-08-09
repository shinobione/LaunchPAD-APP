# PHASE UX C2.5-A — Build 76 Canvas Transport Isolation

Status: IMPLEMENTED CANDIDATE — CI / GITHUB PAGES / REAL-USER ANDROID SMOKE REQUIRED

Date: 2026-08-10

## Trigger

Real-user Android smoke of Build 75 failed.

The screenshot sequence on `Lab-Grown Gold` established the failure order:

1. Lyrics Studio Canvas initially renders moving video frames.
2. The media/player UI enters a loading spinner state.
3. The track cover appears inside the Canvas frame. This is the Canvas `<video>` poster, proving the video element has stopped or lost playable media state.
4. A later canonical-audio seek advances the requested position/lyrics context but the audio playback remains waiting/loading.

Therefore Build 75 ownership isolation was insufficient. Feature 11 no longer owned the Lyrics Studio Canvas, but the Canvas still consumed the same remote protected-media transport as canonical audio and retained multiple internal restart/retry mechanisms.

## Root architecture addressed by Build 76

Production catalog media URLs for both audio and video are served by the same public `launchpad-media` Worker and R2 Range-capable media route.

The canonical audio must keep that remote Range transport for efficient seek.

The short decorative Canvas does not need to keep reopening the remote media route at every loop boundary.

Build 76 therefore separates the transports:

```text
Canonical audio
  -> public media Worker / R2
  -> HTTP Range transport
  -> remains authoritative for playback + seek

Lyrics Studio Canvas
  -> one CORS GET of the Canvas video
  -> browser Blob
  -> blob: object URL
  -> native local video loop
  -> no remote Range request at loop boundaries
```

## Runtime changes

`js/features/lyrics-studio.js` now:

- disables implicit video autoplay and starts playback explicitly;
- fetches the active track Canvas once with CORS;
- materializes the response as a local `Blob`;
- attaches a `blob:` object URL to the Canvas `<video>`;
- revokes object URLs when the track/transport is reset;
- keeps exactly one loop mechanism for Lyrics Studio: native loop on the local Blob;
- removes the old `ended -> currentTime=0 -> playCanvas()` fallback;
- removes stalled/autoplay retry timers that could repeatedly re-enter remote playback;
- does not assign the protected remote video URL directly to the `<video>` element;
- pauses only the decorative Canvas while the canonical audio element is actively seeking;
- resumes the Canvas after the real audio `seeked` event;
- never seeks, reloads or pauses the canonical audio element.

A failed Canvas fetch is non-fatal to music playback. Automatic retries are suppressed; an explicit Canvas/user/page resume action may retry.

## Preserved boundaries

Build 76 is LaunchPAD frontend-only.

It does NOT:

- change or deploy the public media Worker;
- change or deploy the private Track Manager Worker;
- mutate R2;
- modify `catalog/index.json`;
- change track manifests;
- change the canonical Lyrics contract;
- create a canonical Album schema;
- start C2.5-B;
- modify SonicTrace;
- start C3;
- create the final PHASE UX checkpoint;
- start Phase 7.

The public media Worker remains v2.6 unless a separate explicitly authorized backend change occurs.

## Safety

Pre-change rollback reference:

`safety/pre-build76-canvas-transport-isolation-20260810-0008`

Feature branch:

`fix/build76-canvas-transport-isolation`

## Regression guards

The media regression suite and master specification must prove:

- Feature 11 still selects only `video.track-video-player`;
- Lyrics Studio fetches `track.video` and uses `response.blob()`;
- Lyrics Studio creates and revokes object URLs;
- the Canvas `<video>` identifies its transport as `blob`;
- canonical audio `seeking` pauses only the Canvas;
- canonical audio `seeked` may resume the Canvas;
- no Lyrics Studio `scheduleCanvasRetry` remains;
- no Lyrics Studio `ended` manual loop handler remains;
- the protected remote video URL is not assigned directly to the Canvas `<video>` source;
- Build 73 audio-clock heartbeat remains present;
- Audio Lab sanctuary contracts remain unchanged.

## Required real-user Android smoke

Use a published track with Canvas, preferably the exact track that reproduced the failure.

1. Confirm LaunchPAD reports Build 76.
2. Start canonical audio playback.
3. Open Lyrics Studio with Canvas enabled.
4. Allow at least 5 complete Canvas loops.
5. Confirm the cover/poster does not replace the moving Canvas at loop boundaries.
6. Seek canonical audio forward and backward several times.
7. Confirm seeks complete and playback resumes immediately.
8. Confirm lyrics/current-time UI follows the real canonical audio position.
9. Background Chrome/PWA for 10–15 seconds and return.
10. Confirm audio remains authoritative and Canvas resumes independently.

Acceptance requires both:

- Canvas loop stability;
- canonical-audio seek stability after multiple Canvas loops.

Until that real-user smoke passes, Build 76 remains a candidate and PHASE UX is not closed.
