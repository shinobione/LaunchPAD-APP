# Build 2026.08.25.111 — AudioLAB Neon Ribbon V13 clean dynamic camera

Release: `audiolab-neon-ribbon-v13-clean-dynamic-camera-20260825`

## Goal

Keep the clean, readable carrier shape reached in Build 109/110 while recovering more of the source Rainbow motion without reintroducing jitter, travelling holes, or local carrier deformation.

## Changes

- Removes Build 110's moving local near-field/depth deformation that created travelling pinch/bulge regions.
- Keeps one continuous perspective curve and moves the whole carrier with smooth global scale, roll, drift and zoom.
- Makes bass/mids drive carrier breathing globally instead of warping isolated parts of the ribbon.
- Increases spectrum attack while retaining release smoothing and five-tap spatial continuity.
- Lowers the idle floor slightly so distant/quiet regions can shrink toward the tiny source-like ticks without opening a moving hole.
- Routes punch into global bar lift and god-ray intensity instead of carrier jitter.
- Keeps the water-wave as a restrained surface effect.
- Draws a very subtle audio-reactive carrier line so the underlying moving structure reads without becoming a visible full circle.
- Precomputes carrier geometry once per frame and reuses it for primary and ghost layers, reducing repeated geometry work and helping fluidity.

## Runtime constraints

- Shared AudioLAB FFT remains the only spectrum source.
- No extra `AudioContext`.
- No renderer-owned `requestAnimationFrame` or timer.
- No randomness.
- Protected Spectrum renderer remains unchanged.

## Build metadata

- Display: `2026.08.25.111`
- Cache: `shinobi-launchpad-v111`
- Release: `audiolab-neon-ribbon-v13-clean-dynamic-camera-20260825`
