# PHASE UX C2.5-A — Build 84 Show Track isolation

**Status:** IMPLEMENTED CANDIDATE — CI / REAL-USER ANDROID SMOKE PENDING  
**LaunchPAD build:** `2026.08.10.84`  
**Release:** `phase-ux-c2-5-a-show-track-isolation-20260810`  
**Cache:** `shinobi-launchpad-v84`  
**Safety checkpoint:** `safety/pre-build84-show-track-isolation-20260810-1838`  
**Feature branch:** `fix/build84-show-track-isolation`

## Why Build 84 exists

Real-user Build 83 smoke split Lyrics Studio into two clearly different states:

- mobile **Collapsed**: native Canvas loop remained stable;
- mobile **Show Track**: the Canvas could fail to start or freeze, expose its poster/track cover, make canonical audio buffer for a long time, degrade later seeks and make navigation back to Track unclear while lyrics recentered.

The important conclusion is that the Build 83 native-loop engine itself is not globally broken. The failure is tied to the **Collapsed → Show Track transition**.

## Root causes found in Build 83

`setMobilePanelCollapsed()` performed media and scroll work while expanding the track panel:

- it explicitly called `playCanvas()` even when the native-loop Canvas was already playing;
- it could recenter the active lyric during the panel transition;
- the expanded mobile CSS resized the Canvas compositor surface from the stable collapsed `36 × 64` footprint to a much larger surface;
- when Canvas was active, the normal track cover was hidden, leaving no explicit Track-detail navigation action in the expanded panel.

Those behaviors mixed a pure layout toggle with media lifecycle and lyrics-scroll side effects.

## Build 84 contract

### Show Track is layout-only

The Collapsed / Show Track toggle no longer calls `playCanvas()`, does not pause/reload/seek the Canvas, and the toggle handler requests `recenter: false`.

The Canvas that was already playing before the transition remains under the exact same single native-loop owner introduced by Build 83.

### Stable Canvas compositor footprint

On Android/mobile Studio, the visible Canvas media surface remains `36 × 64` in both Collapsed and Show Track states.

Show Track therefore reveals metadata and controls **around** the already-playing Canvas instead of asking Android to reconfigure a much larger video surface during playback.

### Explicit Track navigation

Expanded Show Track now exposes:

`Open track →`

The action exits Studio without restoring/recentering the Lyrics scroll and routes directly to `#track=<trackId>`.

This avoids relying on the cover — which is intentionally hidden while Canvas is active — as an implicit route target.

## Preserved behavior

Build 84 does not change:

- the native Canvas loop contract from Build 83;
- canonical audio playback / Range backend;
- Build 77 single-commit audio seek;
- lyrics timestamp engine;
- mini-player Favorite / Queue routing boundary;
- Track-page video behavior;
- Track Manager / Studio bridge;
- public media Worker;
- R2;
- C2.5-B+;
- SonicTrace C3;
- Phase 7.

No Worker deployment and no R2 mutation are required.

## Regression guards

CI must fail if:

- `setMobilePanelCollapsed()` calls `playCanvas()` again;
- mobile Show Track restores the old enlarged `92–116px` Canvas column;
- the mobile Canvas does not keep the stable `36 × 64` media footprint;
- explicit `Open track →` navigation disappears;
- the Track action restores the old Lyrics scroll before routing away.

## Required real-user smoke

On Android, with a track containing synchronized lyrics and Canvas:

1. confirm Build `2026.08.10.84`;
2. enter Studio and leave the track panel Collapsed;
3. let the Canvas loop at least three times;
4. tap `Show track` while the Canvas is moving;
5. confirm the same Canvas continues moving immediately — no poster/cover takeover and no long audio buffering;
6. alternate `Collapse` / `Show track` several times;
7. perform large forward/back slider seeks after those transitions;
8. perform timestamp-line seeks and confirm lyrics remain settled;
9. tap `Open track →` and confirm the Track page opens directly without the previous lyrics up/down movement;
10. verify Track-page Video still works normally.

Until this smoke passes, Build 84 remains a candidate and the final PHASE UX checkpoint remains uncreated.

## Stop lines

- C2.5-B+: **NOT STARTED**.
- C3 SonicTrace engine work: **SUSPENDED**.
- Final PHASE UX checkpoint: **NOT CREATED**.
- Phase 7: **NOT STARTED**.
