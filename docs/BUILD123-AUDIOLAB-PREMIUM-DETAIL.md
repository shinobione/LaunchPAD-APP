# Build 123 — AudioLAB Premium Detail Pass

Build: `2026.08.29.123`
Release: `audiolab-premium-detail-20260829`
Cache: `shinobi-launchpad-v123`

This build refines the three Build 122 scene visualizers after real-user review.

## Neon Horizon

- increases world motion and visible travel speed
- adds deterministic starfield detail and mountain silhouettes
- adds stronger camera sway and horizon movement
- increases bass-shaped terrain deformation
- adds punch waves that travel toward the camera
- adds moving luminous lane streaks and more reactive sun scanlines

## Pulse Line

- increases waveform sample density and detail
- adds two secondary waveform echoes
- adds a bright white core over the chromatic body
- adds deterministic particle ticks and calibrated center-line ticks
- strengthens transient bloom and moving flare response
- keeps the visual centered and immediately readable

## Chroma Spectrum

- reduces the number of plain analyzer bars
- introduces wider sculpted columns with peak caps
- adds a connective crest line and animated secondary contour
- adds deterministic spectral sparks and deeper reflection
- preserves the chromatic identity while differentiating the mode from the protected Spectrum visualizer

## Guardrails

- Neon Ribbon remains the default visualizer
- protected Spectrum renderer remains untouched
- the shared AudioLAB FFT/analyser is reused
- no second AudioContext
- no renderer-owned requestAnimationFrame
- no Math.random
- no setInterval
- saved internal visualizer IDs remain compatible
