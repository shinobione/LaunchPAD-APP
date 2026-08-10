# LaunchPAD — C2.5-A Build 85

## Studio loop parity

Real-user Build 84 proved that mobile Studio audio, seeks, timestamp navigation, Show Track transitions and Track-page routing are stable, while the Studio Canvas still exposes the track cover for a few milliseconds at the native loop boundary.

Build 85 aligns only the relevant Studio presentation properties with the already-seamless Track Video path:

- Studio Canvas is normalized to `preload='auto'`;
- its `poster` is removed and passively kept absent;
- native `video.loop` remains the only loop owner;
- no play/pause/load/src/currentTime/recovery logic is added;
- `Open track →` is clarified to `Track page →` and visually demoted from a full-width Canvas-adjacent control.

Build 84's layout-only Show Track transition, stable 36 × 64 mobile Canvas surface, canonical audio isolation, single-commit seek and explicit Track-page routing remain unchanged.

### Safety

- checkpoint: `safety/pre-build85-studio-loop-parity-20260810-1917`;
- no Worker deployment;
- no R2 mutation;
- no Track Manager change;
- no C2.5-B+ work;
- no SonicTrace C3 work;
- Phase 7 remains NOT STARTED;
- final PHASE UX checkpoint remains NOT CREATED pending real-user smoke.
