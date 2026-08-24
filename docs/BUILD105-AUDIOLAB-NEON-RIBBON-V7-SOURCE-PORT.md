# Audio Lab — Neon Ribbon V7 source-guided port — Build 105

Candidate: `2026.08.24.105`  
Release: `audiolab-neon-ribbon-v7-source-port-20260824`

## Why this rebuild exists

The previous Neon Ribbon iterations were inferred from the reference video alone and repeatedly misidentified the source motion language. The supplied `Rainbow.zip` contains the actual Wallpaper Engine scene used by the reference visualizer, which makes the intended construction explicit.

## Source-derived visual contract

The supplied scene uses:

- `Simple Audio Bars` in **Circle - Outer** mode;
- a **64-band** audio spectrum rendered as **200 bars**;
- **Bar Spacing = 0.4**;
- **Lower/Upper Bar Bounds = 0.10 / 0.41**;
- two copies of the circular mask spinning in opposite directions at **-0.25 / +0.25**;
- one faint layer at alpha `0.1` with the fixed lower band clipped;
- the supplied scrolling `Rainboww` texture as the bar color source;
- a full-composition **water-waves** horizontal displacement driven by audio;
- blur / edge detection / god-rays post processing, which is why the reference bars read as hollow neon capsules with long soft trails instead of solid spectrum sticks.

## Build 105 implementation

`js/features/visual/neon-ribbon.js` is rebuilt around those source mechanics rather than around a guessed sine ribbon or moving orb:

- 200 desktop bars mapped through a 64-band spectrum model;
- source-inspired projected circular geometry, deliberately oversized so sweeping arcs cross the viewport;
- opposite-spin primary and faint spectral-echo layers;
- source palette sampled from the supplied `Rainboww` texture and scrolled independently of the spectrum;
- `0.10 → 0.41` bar-length mapping;
- `0.4` spacing translated to 60% angular-slot width;
- audio-driven horizontal water-wave deformation;
- hollow rounded capsule rendering to reproduce the reference edge-detected bars;
- soft downward light-ray field inspired by the reference blur/god-rays chain;
- Canvas2D batching by width buckets, with no private scheduler, no second AudioContext and no per-bar shadow blur.

## Preserved boundaries

- Spectrum remains untouched and protected.
- The other nine Audio Lab presets are unchanged.
- Shared Audio Lab FFT / analyser ownership is unchanged.
- No Worker, R2, Track Manager, Studio, Lyrics, player or catalog mutation is introduced.

Build 105 remains a candidate until real-user visual smoke confirms the source-guided port inside the actual Audio Lab viewport.
