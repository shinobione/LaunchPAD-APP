# PHASE UX · C2.5-A — Build 86 Mobile Player / Studio UI Polish

Release candidate: **2026.08.10.86**  
Release id: **phase-ux-c2-5-a-mobile-player-ui-polish-20260810**  
Cache: **shinobi-launchpad-v86**

## Real-user input from Build 85

Build 85 is media-stable on the target Android device: native Studio Canvas loops, seek/navigation work, the app no longer crashes and Track Video remains genuinely seamless. The remaining defects are presentation/state issues:

1. the track cover can flash for a few milliseconds at the native Studio Canvas loop boundary in both Collapsed and Show Track;
2. the Build 84 `Track page →` escape hatch remains visually present in Show Track and is no longer wanted;
3. the mobile Favorite action mutates local state correctly but can remain visually highlighted after removal;
4. Favorite/Queue taps can paint a large Android selection/focus rectangle across the mini-player.

## Root causes

### Cover flash

Build 85 correctly removes the `<video poster>`. However the historical mobile Studio CSS still places `.lyrics-cover-wrap` directly behind `.lyrics-studio-canvas` as a loading fallback. A transient native-video paint gap can therefore reveal the physical cover underlay even when the video has no poster.

Build 86 keeps the cover element in layout but makes it invisible only while Studio Canvas is active. Canvas-off still shows the normal cover.

### Favorite visual refresh

`library-memory.js` already rerenders/redecorates and calls `updateButtons()` after a favorite mutation. The mobile stylesheet, however, gave `:hover` and `.active` the same highlighted appearance. Touch Chromium can retain `:hover` after a tap, making a correctly removed favorite still look active.

Build 86 makes `.active` the only saved-state visual authority on coarse/no-hover pointers.

### Mobile selection rectangle

Build 86 suppresses Chromium tap-highlight painting inside the mobile mini-player and confines keyboard focus treatment to the actual Favorite/Queue controls. This is intentionally scoped to the mobile player rather than globally removing focus affordances from LaunchPAD.

## Scope

Presentation-only frontend changes:

- `css/mobile-player-polish-v86.css`
- Build marker/cache loader
- regression test wiring
- docs

No changes to:

- audio lifecycle;
- Canvas native loop ownership;
- `src`, `currentTime`, `play()`, `pause()`, `load()`;
- Track Manager;
- Cloudflare Workers;
- R2;
- C2.5-B+;
- SonicTrace C3;
- Phase 7.

## Real-user acceptance required

Do **not** create the final PHASE UX checkpoint from CI alone. Android smoke must verify:

- Collapsed Canvas: no cover flash across repeated loops;
- Show Track Canvas: no cover flash across repeated loops;
- no visible `Track page →` control;
- Favorite adds/removes and changes visual state immediately;
- Queue still opens normally;
- no large tap/selection rectangle across the mini-player;
- seek, lyrics navigation, audio and Track Video remain unchanged.
