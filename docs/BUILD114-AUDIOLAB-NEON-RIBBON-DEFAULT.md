# Build 114 — Neon Ribbon default visual

Build `2026.08.25.114`

Release `audiolab-neon-ribbon-default-20260825`

## Scope

Promote the validated Neon Ribbon / Rainbow-derived renderer to the default visualizer without changing the renderer itself.

- `neon-ribbon` is now the live AudioLAB default mode.
- `neon-ribbon` is now the sanctioned registry fallback/default mode.
- Home `Now Playing` starts on Neon Ribbon as well.
- Existing ten-preset controls and preset order remain unchanged.
- Spectrum remains sanctuary-protected and unchanged.
- Gravity Lens, Void Bloom and Creep Signal remain present for now; they are candidates for future replacement visualizations.
- Shared FFT ownership and the existing single render loop remain unchanged.

## Cache / PWA

The PWA cache namespace advances to `shinobi-launchpad-v114` so the new default-selection behavior is not hidden behind the prior Build 113 cache.

## Validation intent

This is a default-selection promotion only. It deliberately does not retune Neon Ribbon and does not alter the other AudioLAB renderers.
