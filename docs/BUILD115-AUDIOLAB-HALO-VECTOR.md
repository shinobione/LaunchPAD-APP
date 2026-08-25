# Build 115 — AudioLAB Halo Vector

Build: `2026.08.26.115`

Release: `audiolab-halo-vector-20260826`

## Scope

Build 115 replaces the user-facing **Gravity Lens** visual with **Halo Vector**, the first renderer from the new AudioLAB visual pack.

Halo Vector is intentionally restrained and graphic rather than flashy:

- nested segmented elliptical halos with slow orbital choreography;
- bass/kick drive global pressure and breathing instead of screen flashes;
- mids open and close the segmented architecture;
- highs create fine vector ticks and moving relay pulses;
- all motion is spring-smoothed and uses the existing shared Audio Lab FFT/features;
- no renderer-owned `requestAnimationFrame`, no second `AudioContext`, no random jitter;
- mobile geometry budgets stay lower than desktop;
- Neon Ribbon remains the default visual;
- Spectrum sanctuary remains untouched;
- Void Bloom and Creep Signal remain available for the next replacement passes.

## Compatibility

The historical internal preset id `gravity-lens` is preserved temporarily so saved state and older regression guards do not break. Its renderer now bridges to `drawHaloVectorMode`, while the registry exposes the user-facing label **Halo Vector**.

The PWA shell includes `js/features/visual/halo-vector.js` and Build 115 uses cache namespace `shinobi-launchpad-v115`.
