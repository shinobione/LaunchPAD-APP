# LaunchPAD — C2.5-A Build 83

## Surgical rollback

Build 83 is a targeted rollback of two historical ownership decisions, not a rollback of the modern LaunchPAD UI.

### Mini-player

- `.current-track` is no longer itself a Lyrics route target.
- Cover/title are wrapped in a dedicated `.current-track-identity` route surface.
- Favorite and Queue are siblings and therefore own their clicks naturally.
- The Build 82 nested-control propagation workaround is removed.

### Lyrics Studio Canvas

- Restores native `video.loop` as the sole loop owner.
- Restores direct `track.video` source and `preload='none'`.
- Removes Blob transport and local recovery loops.
- Removes `ended`, `waiting`, `stalled`, lifecycle and audio-seek Canvas replay paths.
- Removes Android-specific Canvas source disable.
- Preserves the current responsive Studio UI and Build 77 single-commit audio seek.

### Smart Canvas

- `smart-canvas.js` is now Track-Video-only.
- It no longer registers, pauses, reloads or releases Lyrics Studio Canvas.

### Safety

- No Worker change.
- No R2 mutation.
- No Track Manager change.
- No C2.5-B+ work.
- No SonicTrace C3 work.
- Phase 7 remains NOT STARTED.
- Final PHASE UX checkpoint remains NOT CREATED pending real-user smoke.
