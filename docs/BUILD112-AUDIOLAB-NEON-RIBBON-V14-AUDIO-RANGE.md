# Build 112 — AudioLAB Neon Ribbon V14 Audio Range

Build: `2026.08.25.112`

Release: `audiolab-neon-ribbon-v14-audio-range-20260825`

## Why

Build 111 fixed the carrier shape and global motion, but the real-user capture still showed the ribbon as almost permanently filled. The individual bars barely changed length compared with the supplied Rainbow reference, where large parts of the ring collapse to tiny ticks while isolated spectral peaks grow dramatically.

The root mismatch is the audio scale: WebAudio byte FFT data is materially fuller than Wallpaper Engine's 64-band spectrum. Feeding it almost directly into Rainbow's original `0.10 -> 0.41` bar mapping keeps nearly every bar above mid-height.

## Changes

- Add adaptive 64-band WebAudio normalization using a smoothed low percentile floor and high percentile ceiling.
- Gate the quiet majority toward zero while preserving real spectral peaks.
- Switch the final bar transfer from a low-value-boosting exponent to a contrast-preserving exponent greater than 1.
- Reduce spatial smoothing so deep valleys and isolated peaks remain visible.
- Increase attack/release responsiveness without restoring frame chatter.
- Reproduce the original source shader concept explicitly: `barHeight = mix(0.10, 0.41, audio)` with the primary layer intersected against the `334/360` circle mask.
- Reduce only the projected idle annulus in the screen-space port so quiet bars become tiny capsules instead of a permanently filled ribbon.
- Keep dynamic extension at full strength, so peaks can still become very tall.
- Keep Build 111 carrier geometry, global motion, restrained water-wave, shared FFT ownership, and batched Canvas rendering unchanged.

## Guardrails

- No additional `AudioContext`.
- No renderer-owned animation loop.
- No randomness.
- Protected Spectrum renderer unchanged.
- Existing Neon Ribbon compatibility markers retained.
