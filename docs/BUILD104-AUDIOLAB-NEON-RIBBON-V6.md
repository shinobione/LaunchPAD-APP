# Audio Lab — Build 104 — Neon Ribbon V6 radial orbit corrective

Candidate: `2026.08.24.104`  
Release: `audiolab-neon-ribbon-v6-radial-orbit-20260824`

## Real-user finding after Build 103

Direct comparison of the original reference video with the current AudioLAB capture showed that the implementation was still using the wrong motion language.

The reference is **not** a full-width sine ribbon with a moving luminous orb. Its defining structure is a large moving circular / elliptical spectrum carrier: the equalizer bars sit on that curved carrier, rotate with the local normal of the circle and evolve outward from it. Dim light spills inward toward the hidden centre. The whole carrier drifts/tilts slowly while the audio changes bar length quickly.

Build 103/V5 instead kept a horizontally anchored wave and added a bright travelling orb. That looked animated, but it did not reproduce the source composition.

## Build 104 corrective

- removes the V5 luminous orb entirely;
- replaces the full-width sine-wave baseline with a large moving circular / elliptical carrier;
- lays spectrum bars **radially** on the carrier so their angle follows the local circle normal;
- uses one-sided outward bars rather than symmetric bars centred on a wave;
- restores source-like local spectral peaks instead of heavily smoothing all bins into a uniform band;
- adds restrained depth scaling so some parts of the arc read nearer/farther without becoming a fake 3D tunnel;
- keeps slow carrier drift / tilt separate from fast audio-reactive bar evolution;
- keeps dim inward light trails toward the hidden circle centre, matching the source's soft beam/reflection feel;
- caps desktop/ultrawide geometry at 148 bars and keeps batched Canvas2D strokes;
- preserves the shared Audio Lab FFT path and adds no second AudioContext or private scheduler.

## Visual target

The visual should now read as **a moving circular spectrum arc passing through the viewport**, with bar lengths changing on top of that moving carrier. It should no longer read as a rainbow sine wave with a dot travelling along it.

## Acceptance gate

1. On desktop ultrawide, the carrier must visibly read as a curved circular/elliptical arc rather than an S-wave.
2. Bar orientation must rotate along the arc instead of remaining vertically parallel.
3. Local spectral peaks must visibly rise/fall independently across the carrier.
4. The carrier itself must move slowly through space while bar evolution remains faster and music-driven.
5. There must be no luminous travelling orb.
6. Existing nine Audio Lab visualizers remain unchanged.
7. Launchpad, Horizontal Overflow and Cloudflare Workers CI gates must pass before merge.

Build 104 remains a candidate until real-user visual smoke confirms the source feel.
