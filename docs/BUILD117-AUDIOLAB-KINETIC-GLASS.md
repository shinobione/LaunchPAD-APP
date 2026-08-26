# Build 117 / 118 — AudioLAB Kinetic Glass

Current build: `2026.08.26.118`

Original implementation: `2026.08.26.117`

Release: `audiolab-kinetic-glass-20260826`

## Scope

Build 117 dropped the rejected Halo Vector direction and replaced the historical `gravity-lens` slot with **Kinetic Glass**.

The first real-user smoke showed that Build 117 was too faint and too line-like: the plates read as barely visible translucent bars instead of a premium full-frame glass scene.

Build 118 is a visual-impact correction, not a return to neon/flash effects:

- 6 mobile / 9 desktop faceted glass slabs remain the scene budget;
- slabs are now broad chamfered panes instead of thin translucent rectangles;
- body opacity, edge contrast and internal facets are materially stronger so the scene reads immediately on a dark canvas;
- near panes become substantially larger and thicker, creating real foreground/background depth;
- the composition morphs between spread fan and crossing architectural stacks instead of staying visually static;
- bass and punch drive depth pressure and push the stack toward camera;
- mids change fold angles, fan spacing and plate separation;
- highs move narrow specular bands across the glass rather than flashing the screen;
- kick/punch still propagates through the stack as a depth wave;
- track accent colors remain present but restrained; there is no full-screen strobe or random color cycling;
- no renderer-owned `requestAnimationFrame`, no second `AudioContext`, no random jitter;
- the existing shared FFT/features and spring-motion helper remain authoritative;
- Neon Ribbon remains the default visual and Spectrum remains untouched.

## Compatibility

The internal id `gravity-lens` is retained so older saved state continues to resolve. The registry exposes the user-facing label **Kinetic Glass**. The compatibility bridge removes the obsolete Gravity Lens outer squash transform before Kinetic Glass renders its own audio-driven depth motion.

Halo Vector is no longer the active renderer.