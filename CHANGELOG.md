# Changelog

> Current application build: `2026.08.07.50` — release `audiolab-signal-first-20260807`.

This file intentionally tracks the recent stabilized release line. Older milestone-by-milestone history remains available in Git history and merged pull requests.

## Build 50 — Audio Lab signal-first

- Make Neon Shatter consume raw FFT bins/local spectral deltas as its primary geometry input instead of time-driven rotation.
- Make Aurora Glass deform from raw spectral lift/deltas; remove the dominant autonomous phase loop.
- Move Liquid Chrome and Singularity onto the same live decoded-FFT renderer path and increase their footprint/reactivity moderately rather than aggressively.
- Zero custom visual input while playback is paused so reactive effects settle instead of behaving like looping video.
- Add a documentation/build contract: every Markdown file must carry the current build display/release markers and CI rejects stale docs.

## Build 49 — Mobile Studio/reactivity polish

- Route mobile Track Detail Lyrics actions directly into the selected track's Studio.
- Keep the mobile bottom navigation visible in Studio and place the mini-player above it.
- Harden silent Canvas autoplay/loop recovery for mobile lifecycle events.
- Increase direct FFT influence in Neon Shatter/Aurora Glass as an intermediate step before Build 50's signal-first rewrite.

## Build 48 — Decoded Audio Lab analysis copy

- Replace hidden/mirrored media capture approaches with `fetch` + `decodeAudioData` + `AudioBufferSourceNode` metering.
- Keep the audible HTML5 audio element outside the Web Audio analysis graph.
- Synchronize the decoded analysis source with track identity, seek position and playback rate.

## Builds 45–47 — Audio isolation investigation

- Separate Audio Lab from the audible playback path to address artefacts under heavy visualization/background playback.
- Retire fragile `captureStream()` and hidden-audio mirror experiments after real-device testing exposed track-switch and silent-meter failures.

## Build 44 — Card status alignment

- Align `NOW PLAYING` with cover-relative badges on track cards across desktop/mobile.

## Build 43 — Admin tool persistence

- Style LRC Maker as a LaunchPAD admin control.
- Persist admin mode for installed desktop PWA launches after a deliberate `?admin=1` opt-in; `?admin=0` clears it.

## Build 42 — Audio/Admin integration

- Restore Spectrum as a first-class Audio Lab preset.
- Add LRC Maker admin access beside Track Manager.
- Begin audio-path isolation and mobile visual performance work.

## Build 41 — Visual Card/mobile Home

- Repair CORS-safe Visual Card PNG export.
- Restore LAUNCHPAD-first mobile Home layout and action button consistency.

## Build 40 — Repository reconciliation

- Reconcile the previously divergent Cloudflare/GitHub runtime lines.
- Restore canonical GitHub Pages deployment from `main`.
- Remove the old split-brain deployment model and establish `main` as the single application source of truth.
