# Build 126 — AudioLAB premium polish + Prism Tunnel

Build: `2026.08.29.126`  
Cache: `shinobi-launchpad-v126`  
Revision: `audiolab-premium-polish-prism`  
Release: `audiolab-premium-polish-prism-20260829`

## Purpose

Build 126 keeps the two directions that are now working — Pulse Line and Chroma Spectrum — and gives them a dedicated premium polish pass, while discarding the rejected Cyber Scene concept entirely.

## Pulse Line

- preserves the single dominant cyan/white waveform language;
- increases visible transient response and quiet/impact contrast;
- adds layered controlled bloom without a travelling flare;
- adds a faint chromatic echo and restrained mirrored ghost;
- highlights only the strongest deterministic spectral peaks;
- keeps the center axis clean and avoids visualizer typography.

## Chroma Spectrum

- increases density to 184 desktop bars / 96 mobile bars;
- keeps the cyan → white → violet → magenta field;
- adds a restrained rear spectral field for depth instead of a moving sweep;
- adds fine highlight edges, cleaner peak memory, subtle reflection and edge atmosphere;
- no central text, no travelling luminous bar;
- the sanctuary-protected Spectrum renderer remains unchanged.

## Prism Tunnel

The historical `gravity-lens` internal id now presents **Prism Tunnel**.

Cyber Scene is no longer the active renderer for that slot. Prism Tunnel is a full-canvas perspective light architecture made from nested polygonal frames, connector ribs and spectral sparks.

Audio mapping:

- bass: tunnel breathing / scale;
- punch: stronger near-frame expansion and pulse frame;
- mids: vanishing-point drift, twist and aspect modulation;
- highs: edge detail and spectral sparks;
- energy: forward travel speed and frame intensity.

The renderer is deterministic and does not own an animation loop.

## Guardrails

- Neon Ribbon remains the default preset.
- Spectrum remains untouched and hash-protected.
- Shared AudioLAB FFT/analyser only.
- No second AudioContext.
- No renderer-owned `requestAnimationFrame`.
- No `Math.random`, `setInterval`, `shapeMotionTarget`, or visualizer `fillText` in the three premium renderers.
- Historical ids remain stable for saved preferences and compatibility.
