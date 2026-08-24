# AudioLAB Neon Ribbon — Build 103

Candidate: `2026.08.24.103`  
Release: `audiolab-neon-ribbon-v5-20260824`

## Purpose

Build 103 advances the public LaunchPAD runtime metadata after the AudioLAB Neon Ribbon work so the About page, PWA cache namespace and release identity no longer remain on Build 102.

## AudioLAB changes carried by this candidate

- Neon Ribbon is the tenth sanctioned AudioLAB preset;
- the renderer uses the shared FFT feed and does not create a second AudioContext;
- the visual now includes the moving luminous orb / nucleus requested from the original reference feel;
- bars around the moving active zone grow, bend and pulse locally as the orb passes;
- the long ribbon keeps restrained perspective and controlled camera motion rather than chaotic full-scene movement;
- bass/kick shape structural motion, mids thicken the active zone and highs add surface shimmer;
- Canvas2D rendering remains batched with an ultrawide geometry cap of 148 bars.

## Build metadata

- id: `20260824-audiolab-neon-ribbon-v5-build103`
- cache: `shinobi-launchpad-v103`
- revision: `audiolab-neon-ribbon-v5`
- display: `2026.08.24.103`
- release: `audiolab-neon-ribbon-v5-20260824`

The About page reads `globalThis.SHINOBIWAN_BUILD`, so this build bump is the canonical fix for the stale Build 102 label rather than a hard-coded About-only override.

## Acceptance gate

Do not promote Build 103 to the README accepted baseline until real-user smoke confirms:

1. About reports `Build 2026.08.24.103` and release `audiolab-neon-ribbon-v5-20260824`;
2. Neon Ribbon is visibly closer to the supplied reference while remaining controlled;
3. the moving orb creates a readable local evolution in nearby bars;
4. ultrawide playback remains acceptably smooth;
5. the other nine AudioLAB visualizers and playback remain unchanged;
6. Validate Launchpad, Validate Cloudflare Workers and Validate Horizontal Overflow are green.
