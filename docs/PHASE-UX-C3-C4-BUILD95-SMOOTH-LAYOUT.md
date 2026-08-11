# LaunchPAD Build 95 — C3-C.4 smooth motion + layout polish

Date: 2026-08-11
Build: `2026.08.11.95`
Release: `phase-ux-c3-c4-smooth-layout-20260811`
Safety checkpoint: `safety/pre-c3-c4-build95-layout-smooth-20260811-2142`

## Real-user Build 94 findings

The Build 94 video/screenshot smoke confirmed that route transitions finally became visible, but the presentation still missed the requested premium quality bar:

- route entry visibly trembled / restarted and felt too violent instead of smooth;
- Album `Show tracks` / `Hide tracks` control could sit awkwardly at the card edge and read like a detached text action;
- Lyrics required avoidable page-level scrolling on the desktop viewport used for the smoke;
- Audio Lab used too little of the available vertical canvas;
- Audio Lab preset pills could lose the top edge during hover/press motion;
- the Eras horizontal scroller could expose a browser scrollbar that looked like an accidental slider;
- the sidebar active item had an extra cyan/violet vertical rail that made the menu visually noisy;
- desktop navigation order should be `Home → Discography → Albums → Favorites → Lyrics → Audio Lab → Streaming → About`;
- the current four-project Album grid is acceptable, but must not keep stretching cards wider as future Album count grows.

Build 94 click-glow tuning itself was accepted and remains inherited.

## Build 95 changes

### Smooth route entry

The premium runtime keeps one presentation owner but removes the expensive/unstable ingredients from the page transition:

- no page blur;
- no page scale;
- no brightness/saturation animation;
- 280 ms opacity + 10 px → 0 px vertical settle only;
- duplicate route signals for the same URL are de-duplicated for 220 ms, preventing cancel/restart shake;
- rapid navigation can still cancel an in-flight presentation animation without delaying the actual route;
- normal route events, hash/popstate and direct Track Detail intents remain covered;
- `prefers-reduced-motion` remains authoritative.

### Navigation cleanup

- Albums is moved in the actual desktop nav DOM immediately before Favorites, preserving visual and keyboard order;
- the redundant active cyan/violet vertical rail is removed while the active pill remains.

### Eras

- the Era strip remains horizontally scrollable when required;
- browser scrollbars are hidden so no accidental slider-looking rail appears.

### Lyrics desktop fit

- desktop Lyrics intro spacing is tightened;
- the Lyrics workspace height is capped against the live viewport/player budget;
- cover/panel spacing is compacted slightly;
- the lyrics reader remains independently scrollable;
- the full Lyrics workspace should fit without requiring a page-level scroll on a normal 16:9 desktop viewport.

### Audio Lab desktop fit

- Audio Lab visual stage grows from the old shallow `39–43dvh` behavior to a viewport-aware `420px → 650px` budget;
- short desktop viewports keep a smaller guarded range;
- controls retain clearance above the persistent player;
- preset-control container gets explicit top/bottom breathing room and `overflow: visible`, preventing pill-top clipping during hover/press motion.

### Album library scalability + track reveal control

- current four-project 2×2 layout remains unchanged;
- when a fifth project appears on a wide desktop, the unfocused Album library automatically switches to three columns;
- dense future cards use slightly smaller artwork/type/tag budgets;
- Album Focus / Show Tracks still keeps its existing focused composition;
- Show/Hide Tracks is restyled as one stable pill with count + chevron and no `margin-left:auto` edge drift;
- expanded/collapsed state is still exposed through `aria-expanded` and keeps the original focus behavior.

## Preserved boundaries

Build 95 does not change:

- audio playback, seek, loop, queue, favorites or mini-player semantics;
- router ownership or route destinations;
- Audio Lab FFT/analyser/renderers or preset algorithms;
- canonical Album authority/order/membership;
- Worker deployment or code;
- R2 data;
- Track Manager;
- Studio;
- SonicTrace;
- LRC Maker;
- Phase 7 authorization.

## Acceptance

Candidate only until real-user smoke confirms:

1. route changes are visible, clean and smooth with no tremble;
2. Audio Lab uses the desktop viewport materially better and preset pills are intact;
3. Lyrics fits without avoidable page-level scrolling;
4. Eras has no slider-looking scrollbar;
5. Albums appears directly under Discography in the left nav;
6. Show/Hide Tracks feels integrated and remains functional;
7. player/favorites/queue/Album/Track navigation remain intact.
