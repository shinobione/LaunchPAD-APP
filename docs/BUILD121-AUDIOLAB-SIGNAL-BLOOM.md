# Build 121 — AudioLAB Signal Bloom

**Build:** `2026.08.27.121`  
**Release:** `audiolab-signal-bloom-20260827`

## Goal

Replace the rejected Kinetic Glass presentation with a reversible **Signal Bloom** candidate while keeping the internal `gravity-lens` id for saved-state compatibility.

## Visual direction

Signal Bloom is a full-frame magnetic-field visual, not a centered object:

- 16 field lines on mobile / 28 on desktop;
- four visually coherent bundles with long Bézier trajectories;
- strong track accent colors instead of grey glass;
- bass opens and compresses the field;
- mids bend the trajectories;
- highs move fine glints along selected lines;
- punch/kick creates a localized travelling deformation through the field;
- no strobe, no random jitter, no `shadowBlur`, no renderer-owned animation loop.

## Integration

- user-facing `gravity-lens` label becomes **Signal Bloom**;
- the former Gravity Lens renderer remains in the repository for instant rollback;
- Neon Ribbon stays the default;
- Spectrum stays sanctuary-protected and unchanged;
- shared AudioLAB FFT and motion-spring infrastructure are reused.

## Acceptance target

The scene should read immediately as a large moving field of trajectories across the whole canvas. It should be visually understandable at a glance and remain active even when the track is not hitting hard.