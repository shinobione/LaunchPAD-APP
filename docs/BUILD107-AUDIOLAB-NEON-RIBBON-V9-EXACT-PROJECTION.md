# Audio Lab — Neon Ribbon V9 exact source projection — Build 107

Candidate: `2026.08.24.107`  
Release: `audiolab-neon-ribbon-v9-exact-projection-20260824`

## Why this corrective exists

Build 106 still misread the visible source as a hand-built shallow semicircle. Real-user smoke exposed the result immediately: a symmetric rainbow smile whose bars visibly converged on one fake 2D centre. The supplied Wallpaper Engine project does not work that way.

## Exact source mechanics now used

This build ports the geometry from `Rainbow.zip` rather than approximating it from the video silhouette:

- source scene: 3840×2160, FOV 50°;
- circle object origin: `1879.27637 645.61578`;
- source model: 720×720 at scale 5, giving a 3600px diameter carrier;
- primary object angles: X=-60°, Y=40°;
- ghost object angles: X=120°, Y=40°;
- perspective projection is applied after the actual X/Y rotations;
- 200 full-circle bars and 64-band audio spectrum are retained;
- spin remains +0.25 primary / -0.25 ghost;
- Circle - Outer bounds remain 0.10 / 0.41;
- the actual `circlerequest02` alpha mask is represented at r≈0.928, which is why the 0.10 lower bound becomes tiny idle ticks instead of a thick permanent band;
- CLIP_LOW behavior on the alpha .1 ghost removes that fixed idle baseline;
- Bar Spacing 0.4 is translated from projected neighbour spacing instead of a guessed constant width;
- screen-space Rainboww color scroll, subtle water-wave displacement, edge-style capsules and directional god-ray trails are retained.

## What changes visually

The visible ribbon is now the clipped result of a large 3D projected full circle. Near sections can become very large while far sections compress toward tiny bars; orientations follow the projected object plane and no longer fan toward a fake centre. This is the depth language visible in the supplied reference recording.

## Preserved boundaries

- Spectrum remains untouched and protected.
- The other nine Audio Lab presets are unchanged.
- Shared AudioLAB FFT ownership is unchanged.
- No second AudioContext, private requestAnimationFrame or interval is introduced.
- No Worker, R2, catalog, Track Manager, Studio, Lyrics or player behavior is changed.

Build 107 remains a candidate pending visual smoke in the actual Audio Lab viewport, especially the 3440×1440 setup.
