# Audio Lab — Neon Ribbon V8 source-arc correction — Build 106

Candidate: `2026.08.24.106`  
Release: `audiolab-neon-ribbon-v8-source-arc-20260824`

## Why this corrective exists

Real-user smoke of Build 105 exposed a major visual mismatch: the Canvas port rendered a complete flattened oval / racetrack, while the supplied reference capture only shows the shallow upper portion of the projected circular audio carrier.

The Build 105 implementation also over-emphasized the edge-detection idea and made neighbouring bars read as a continuous outlined loop. That is not the reference feel.

## Source-guided correction

Build 106 keeps the useful mechanics recovered from `Rainbow.zip`:

- 64-band spectrum model;
- source Rainboww palette and scrolling color field;
- counter-moving `-0.25 / +0.25` spectral layers;
- `Circle - Outer` lineage;
- audio-driven water-wave deformation;
- low-alpha spectral echo and light-ray field;
- shared AudioLAB FFT ownership only.

But it calibrates the projection against the supplied source video instead of drawing the whole circle:

- render only the visible upper half / shallow arc of the projected carrier;
- use about half of the original 200 full-circle slots because only one semicircle is on-screen;
- move the spectrum through the fixed visible arc rather than sweeping a closed ellipse around the viewport;
- bars grow inward from the arc toward the hidden circle centre;
- reduce horizontal water-wave displacement to the subtle source-video range;
- remove the dark center carve that made bars look like welded hollow loops;
- keep bars discrete with source-inspired spacing and rounded neon strokes;
- keep the ghost layer faint and opposite-moving;
- retain cheap batched Canvas2D paths and no per-bar shadow blur.

## Preserved boundaries

- Spectrum remains untouched and protected.
- The other nine Audio Lab presets are unchanged.
- No second AudioContext or private scheduler is introduced.
- No Worker, R2, catalog, Track Manager, Studio, Lyrics or player behavior is changed.

Build 106 remains a candidate pending visual smoke in the real Audio Lab viewport, especially 3440×1440 ultrawide.