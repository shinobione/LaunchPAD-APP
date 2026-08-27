# Build 120 — AudioLAB Silk Flow

Build: `2026.08.27.120`

Release: `audiolab-silk-flow-20260827`

## Scope

Build 120 replaces the user-facing **Void Bloom** direction with **Silk Flow** while retaining the historical internal id `void-bloom` for saved-state compatibility.

Silk Flow is intentionally simple and readable:

- one dominant full-frame satin ribbon is the visual identity;
- two restrained depth companions provide scale without creating clutter;
- bass lifts broad folds and increases material depth;
- mids change curvature and bend rather than spawning extra geometry;
- highs drive one narrow moving satin reflection;
- kick/punch produces a traveling deformation through the ribbon instead of scaling or flashing the whole canvas;
- track accent colors remain close to their source values, with dark and pale satin facets for contrast;
- no renderer-owned `requestAnimationFrame`, no second `AudioContext`, no `Math.random`, no strobe and no `shadowBlur`;
- the shared AudioLAB FFT/features and spring-motion system remain authoritative;
- Neon Ribbon remains the default visual and Spectrum remains untouched.

## Compatibility

The renderer continues to export `drawVoidBloomMode` and the preset keeps the internal id `void-bloom`, so older persisted settings continue to resolve. The user-facing registry and AudioLAB controls now display **Silk Flow**.
