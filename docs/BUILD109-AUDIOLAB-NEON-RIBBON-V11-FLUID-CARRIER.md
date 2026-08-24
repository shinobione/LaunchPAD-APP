# Build 109 — AudioLAB Neon Ribbon V11 Fluid Carrier

Current build: `2026.08.24.109`

Release: `audiolab-neon-ribbon-v11-fluid-carrier-20260824`

## Purpose

Build 109 keeps the Build 108 Rainbow-derived screen-space carrier, but corrects the motion behavior against the supplied original Rainbow video and the latest AudioLAB capture.

## Changes

- Adds persistent 64-band temporal smoothing with faster attack and slower release so bar motion glides instead of chattering frame-to-frame.
- Adds circular spatial smoothing across neighboring bands to remove travelling holes / abrupt envelope cuts while retaining musical peaks.
- Gives the carrier itself a slow audio-reactive breath driven primarily by bass, mids and overall energy.
- Separates macro geometry from micro detail: highs and punch affect glow/detail rather than shaking the carrier.
- Reduces the source water-wave displacement and slows its phase so it reads as fluid surface motion instead of vibration.
- Adds slow carrier drift, roll and perspective-focus motion to recover the large-scale dynamics visible in the Rainbow reference without returning to an explicit browser-side circle.
- Aligns bars to the local carrier normal so the implicit circular path stays readable while it moves.
- Raises the primary idle floor so the ribbon remains continuous instead of developing a moving visual gap.
- Reduces local-peak exaggeration, ghost intensity and ray-field strength for a cleaner, more legible silhouette.
- Adds slight frame persistence to soften visual cadence without adding any renderer-owned scheduler or second audio context.

## Constraints preserved

- Shared AudioLAB FFT/analyser ownership remains unchanged.
- No new `AudioContext`.
- No renderer-owned `requestAnimationFrame` or interval.
- No randomness.
- Protected Spectrum renderer and the other AudioLAB presets remain untouched.
- Legacy Neon Ribbon source-contract markers remain present for existing validation.
