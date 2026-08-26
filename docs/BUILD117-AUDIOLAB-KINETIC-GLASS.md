# Build 117 — AudioLAB Kinetic Glass

Build: `2026.08.26.117`

Release: `audiolab-kinetic-glass-20260826`

## Scope

Build 117 drops the rejected Halo Vector direction and replaces the historical `gravity-lens` slot with **Kinetic Glass**.

Kinetic Glass is a full-frame asymmetric motion scene rather than a centered reactive icon:

- 6 mobile / 9 desktop translucent architectural plates span and cross the canvas;
- depth ordering changes continuously, so near plates grow, distant plates recede and the composition evolves over several seconds;
- bass and punch drive depth pressure and camera-scale response;
- mids change fold angles, fan spacing and plate separation;
- highs move restrained specular sweeps and sparse connecting strokes;
- kick/punch travels across the plate stack as a phase wave instead of flashing the entire screen;
- track accent colors remain present but are mixed toward pale glass highlights instead of saturated neon;
- no renderer-owned `requestAnimationFrame`, no second `AudioContext`, no random jitter;
- the existing shared FFT/features and spring-motion helper remain authoritative;
- Neon Ribbon remains the default visual and Spectrum remains untouched.

## Compatibility

The internal id `gravity-lens` is retained so older saved state continues to resolve. The registry exposes the user-facing label **Kinetic Glass**. The compatibility bridge also removes the obsolete Gravity Lens outer squash transform before Kinetic Glass renders its own audio-driven depth motion.

Halo Vector is no longer the active renderer.