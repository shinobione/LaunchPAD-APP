# Build 124 — AudioLAB reference-led visual rebuild

Build: `2026.08.29.124`
Release: `audiolab-reference-led-20260829`
Cache: `shinobi-launchpad-v124`

This build follows the three user-provided video references directly instead of iterating the rejected abstract directions.

## Pulse Line
- inspired by reference video 1
- single cyan/white luminous waveform across the frame
- broad restrained beam bloom around the center line
- strong transient peaks, thin white core and subtle mirrored trace
- no magenta-heavy decoration or particle clutter

## Chroma Spectrum
- inspired by reference video 2
- dense fine spectrum with cyan-to-white-to-magenta gradient
- central presentation with subtle reflection and peak memory
- branded title treatment and spectral field caption to separate it from the protected baseline Spectrum renderer

## Cyber Scene
- replaces the rejected Neon Horizon presentation while preserving the legacy `gravity-lens` internal id
- inspired by reference video 3
- poster-like cyberpunk scene with cyan/orange contrast, synthetic figure, reactive orange HUD spectrum, diagonal title treatment, telemetry box and scanline detail
- bass/punch drive the core and figure scale; highs drive streak detail

## Guardrails
- Neon Ribbon remains the default
- protected Spectrum renderer remains untouched
- shared AudioLAB FFT only
- no second AudioContext
- no renderer-owned requestAnimationFrame
- no Math.random or setInterval
- legacy ids remain stable for saved preferences
