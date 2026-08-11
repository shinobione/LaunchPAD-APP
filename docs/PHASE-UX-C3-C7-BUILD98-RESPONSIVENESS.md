# PHASE UX — C3-C.7 — Build 98 Responsiveness + state reconciliation

Candidate: `2026.08.12.98`

Release: `phase-ux-c3-c7-responsiveness-20260812`

## Real-user findings after Build 97

Build 97 improved the mobile layout, but real-device smoke exposed three remaining problems:

1. the first mobile menu interaction could be ignored for roughly 3–4 seconds while LaunchPAD awaited remote catalog hydration and had not yet installed the normal app listener;
2. the global play/pause controls could remain visually stuck in the loading spinner state although media time was already advancing and audio was audibly playing;
3. Track Detail Moods / Themes could remain in the lower Release profile until a later interaction such as `Play track`, instead of appearing in the hero immediately.

The same mobile session also reported a general heavy feeling during warm-up.

## Root causes

- `app-engine-recovery.js` awaited the remote Cloudflare catalog before importing `app-main.js`; the normal mobile menu listener therefore did not exist during that network wait.
- A large group of secondary modules was imported and initialized before `shinobi:ready`, concentrating parse/evaluation work on slower phones.
- Lyrics search hydration launches multiple lyrics fetches; on mobile those concurrent requests can compete with artwork/audio/navigation warm-up.
- `audio-readiness.js` can legitimately receive `waiting` and set `playbackRequestState=starting`; the UI spinner followed that synthetic request state even when native media time resumed advancing.
- Track signals were initially rendered in Release profile and then repositioned by a later Phase 12 synchronization pass, leaving a race between Track Detail rendering and signal integration.

## Build 98 corrective

### Immediate boot interaction

A temporary boot-only menu bridge is installed before remote catalog hydration begins. It is removed immediately after `app-main.js` finishes importing, leaving the canonical app listener as the sole long-term owner.

### Staged boot

Critical navigation/player/catalog modules remain in the first interactive layer. About enhancements, listening-history summary, Visual Card, Smart Canvas and Canvas identity are deferred to an idle callback after `shinobi:ready`.

### Mobile lyrics request budget

On screens up to 760px, lyrics asset requests are limited to two concurrent fetches. Requests created while the Lyrics view is active are prioritized ahead of background search-index hydration. Audio, cover, video and catalog requests are not intercepted.

### Playback spinner self-heal

Build 98 watches genuine media-time progression. If `currentTime` advances while the media is neither paused nor ended, a stale `starting` request state is reconciled to `playing`. No play, pause, seek or retry ownership is changed.

### Track Detail first-paint signals

A small reconciliation observer moves Moods / Themes beside the Track Detail tags as soon as the Track Detail DOM appears. The existing Phase 12 integration remains compatible and idempotent.

## Safety boundary

Unchanged:

- canonical audio source selection and native playback ownership;
- queue, favorites, loop/repeat/shuffle and seek semantics;
- Lyrics timestamp parsing, Studio mode and Build 96 auto-scroll behavior;
- Build 97 mobile Home / Albums / Lyrics picker behavior;
- Audio Lab FFT/renderers;
- public/admin Workers, R2 and Track Manager;
- Studio, SonicTrace and LRC Maker.

Safety checkpoint:

`safety/pre-c3-c7-build98-responsiveness-20260812-0038`

## Acceptance target

- Mobile menu should react immediately during cold start instead of ignoring the first tap for several seconds.
- Warm-up should feel lighter, with secondary enhancements arriving after the core interface is already interactive.
- Global play/pause buttons must show Pause while audio time is advancing, never a persistent spinner.
- Track Detail Moods / Themes must be present in the hero on first render, before pressing Play track.
- Existing player, Lyrics, Albums, Audio Lab, Track Video and admin-tool behavior must remain intact.

Build 98 remains a candidate until exact-head CI and real-device smoke pass.
