# Build 2026.08.24.108 — AudioLAB Rainbow direct copy

Release: `audiolab-neon-ribbon-v10-rainbow-direct-copy-20260824`

## Goal

Replace the failed browser-side circle reconstruction with a direct screen-space port of the supplied Rainbow visual result.

## Source basis

The implementation is grounded in the supplied Wallpaper Engine project and reference capture:

- `Simple_Audio_Bars` with 64-band frequency resolution;
- source bar count / spacing semantics (`200`, `0.4`);
- Circle - Outer bounds `0.10 -> 0.41` and the supplied circle alpha mask;
- opposite `+0.25 / -0.25` spin behavior for primary / ghost layers;
- `Rainboww` palette and scroll behavior (`-0.25`, squared by the source scroll shader);
- horizontal water-wave displacement driven by the source audio response;
- hollow capsule appearance approximating the source blur + edge-detection composition;
- directional low-alpha light trails approximating the source god-rays pass.

The visible carrier is calibrated directly from the supplied reference video instead of attempting to expose a browser-rendered circle. This intentionally preserves the observed Rainbow ribbon silhouette: near sections spread out, the middle compresses, bars grow inward/upward, and the carrier exits the viewport like the reference capture rather than reading as a closed loop.

## Runtime constraints

- Shared AudioLAB FFT only.
- No second `AudioContext`.
- No renderer-owned `requestAnimationFrame` / timer.
- No randomness.
- Batched Canvas2D paths with adaptive density.
- Protected Spectrum renderer and all other AudioLAB presets remain unchanged.

## PWA metadata

- Build: `2026.08.24.108`
- Cache: `shinobi-launchpad-v108`
- Revision: `audiolab-neon-ribbon-v10-rainbow-direct-copy`
