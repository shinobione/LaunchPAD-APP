# LaunchPAD — C2.5-A Build 84

## Show Track isolation

Build 84 targets the real-user Build 83 failure that appeared only when mobile Lyrics Studio changed from **Collapsed** to **Show Track**.

### Canvas transition

- `Show Track` no longer calls `playCanvas()`.
- Collapsed / expanded panel changes are layout-only.
- The native-loop Canvas remains under the Build 83 single-owner contract.
- Mobile Canvas compositor geometry remains `36 × 64` across the transition instead of resizing to the old 92–116 px expanded surface.
- No Canvas reload, seek, retry, fallback or lifecycle recovery is added.

### Lyrics scroll

- The mobile panel toggle now uses `recenter: false`.
- Opening or closing Track details does not deliberately recenter the active lyric.
- Existing seek settlement/autoscroll behavior remains unchanged.

### Track navigation

- Expanded Track details expose an explicit `Open track →` action.
- It exits Studio with scroll restoration disabled and routes directly to `#track=<trackId>`.
- Navigation no longer depends on the hidden cover while Canvas is active.

### Safety

- No Worker change.
- No R2 mutation.
- No Track Manager change.
- No Album C2.5-B+ work.
- No SonicTrace C3 work.
- Phase 7 remains NOT STARTED.
- Final PHASE UX checkpoint remains NOT CREATED pending real-user Android smoke.
