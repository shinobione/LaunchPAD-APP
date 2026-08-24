# Build 110 — AudioLAB Neon Ribbon V12 controlled dynamics

Current candidate build: **2026.08.25.110**

Release: `audiolab-neon-ribbon-v12-controlled-dynamics-20260825`

## Scope

This candidate keeps the cleaner Build 109 ribbon shape but restores the macro motion visible in the supplied Rainbow reference without reintroducing the previous jitter.

### Motion changes

- Faster-but-smoothed 64-band attack/release response.
- Reduced spatial blur so musical peaks remain readable while continuity is preserved.
- Moving perspective focus that smoothly expands one ribbon region while compressing distant regions.
- Smooth near-field depth lobe to recreate the source's changing near/far scale instead of vibrating individual bins.
- Stronger bass/mid-driven carrier breathing, camera drift, roll and scale travel.
- Audio-reactive carrier swell remains low-frequency and continuous.
- Punch is routed mainly to local bar expansion and light rays rather than shaking the carrier.
- Water-wave displacement remains deliberately restrained.
- Frame persistence is reduced versus Build 109 so the image stays fluid but less soft.

### Preserved contracts

- Shared AudioLAB FFT/analyser ownership only; no second `AudioContext`.
- No renderer-owned `requestAnimationFrame`, timers, or randomness.
- Neon Ribbon stays isolated from the protected Spectrum renderer and other presets.
- Existing source-derived palette, 64-band mapping, spacing and source bounds remain intact.

## PWA metadata

- Cache namespace: `shinobi-launchpad-v110`
- Build display: `2026.08.25.110`
- Release: `audiolab-neon-ribbon-v12-controlled-dynamics-20260825`

Real-user visual smoke remains the acceptance gate for the Rainbow parity tuning.