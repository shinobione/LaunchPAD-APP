# Build 117 / 118 / 119 — AudioLAB Kinetic Glass

Current build: `2026.08.26.119`

Original implementation: `2026.08.26.117`

Release: `audiolab-kinetic-glass-20260826`

## Scope

Build 117 replaced the historical `gravity-lens` slot with **Kinetic Glass** after Halo Vector was rejected.

Build 118 increased visual impact, but the real-user smoke still showed a composition that was too busy, hard to read and too desaturated on the actual AudioLAB canvas.

Build 119 is therefore a readability reset rather than another density increase:

- the scene is hard-limited to 3 mobile / 4 desktop glass ribbons instead of 6 / 9 overlapping slabs;
- the ribbons are widely spaced and use a simple visual hierarchy instead of converging into a dense central knot;
- one ribbon acts as the dominant foreground plane while the others remain supporting layers;
- track accent colors stay much closer to their source values instead of being mixed heavily toward grey/white;
- body opacity and edge contrast remain strong enough to read immediately on the dark canvas;
- every ribbon has one restrained inner luminous spine and one moving specular slice, avoiding forests of seams and connectors;
- bass and punch change scale/depth, mids change curvature and lane separation, highs move the specular highlight;
- the composition moves continuously but does not flash, strobe or jitter;
- no renderer-owned `requestAnimationFrame`, no second `AudioContext`, no `Math.random`;
- the existing shared FFT/features and spring-motion helper remain authoritative;
- Neon Ribbon remains the default visual and Spectrum remains untouched.

## Compatibility

The internal id `gravity-lens` is retained so older saved state continues to resolve. The registry still exposes the user-facing label **Kinetic Glass**. The compatibility bridge removes the obsolete Gravity Lens outer squash transform before Kinetic Glass renders its own audio-driven motion.
