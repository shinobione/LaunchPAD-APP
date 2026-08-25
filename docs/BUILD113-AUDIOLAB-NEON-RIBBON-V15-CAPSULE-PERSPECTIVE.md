# Build 113 — AudioLAB Neon Ribbon V15 capsule perspective

Build: `2026.08.25.113`

Release: `audiolab-neon-ribbon-v15-capsule-perspective-20260825`

## Goal

Match the supplied Rainbow reference more literally without disturbing the clean Build 111/112 carrier shape.

The overlay comparison showed that Build 112 still read like a permanently filled comb: even quiet bands remained long stems, while the Rainbow reference collapses quiet regions to tiny capsules/dots and lets isolated peaks grow dramatically.

## Changes

- Keep the Build 111/112 carrier geometry, drift, roll, breathing and restrained water-wave.
- Keep the shared AudioLAB analyser; no additional `AudioContext`, timers or renderer-owned animation loop.
- Preserve the adaptive 64-band normalization from Build 112, with slightly stronger gating and faster bar attack/release.
- Reduce spatial averaging to immediate neighbours only so real valleys survive.
- Stop projecting `SOURCE_BAR_LOWER = 0.10` as a large minimum screen-space stem.
- Quiet bars now use a pixel-space capsule base derived from their own rendered width.
- Audio controls only the extension beyond that capsule base, producing a much larger quiet-to-peak ratio.
- Increase depth projection range aggressively: distant bars can collapse toward dot-size while near-field bars become several times larger.
- Scale capsule width with perspective as well as length.
- Keep the hollow neon capsule core, but reduce the visible carrier line so the bars dominate the composition.
- Gate god-rays to meaningful audio events rather than drawing a near-continuous luminous band.

## Protected behavior

- Spectrum sanctuary is unchanged.
- Other AudioLAB presets are unchanged.
- Shared FFT ownership remains unchanged.
- Existing Neon Ribbon source-contract markers remain present for current regression guards.

## Smoke focus

Compare against the supplied Rainbow visual with the app overlaid on top. Check specifically that:

1. quiet regions collapse to tiny pills/ticks instead of long permanent stems;
2. isolated peaks can become dramatically taller than neighbouring bars;
3. distant portions compress to dots while near portions gain both width and length;
4. the carrier remains clean and subtle rather than becoming the main visible shape;
5. the ribbon reads as independent neon capsules, not a filled fence.
