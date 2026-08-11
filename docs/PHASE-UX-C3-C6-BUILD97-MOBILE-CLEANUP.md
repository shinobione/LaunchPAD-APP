# PHASE UX — C3-C.6 — Build 97 Mobile cleanup

Candidate: `2026.08.11.97`

Release: `phase-ux-c3-c6-mobile-cleanup-20260811`

## Real-user findings after Build 96

Build 96 restored normal desktop Lyrics auto-scroll and removed the page-level Lyrics scroll requirement. The follow-up real-user smoke accepted that corrective and exposed three remaining presentation problems outside that fix:

1. mobile Home still duplicated catalog discovery with a full **Recently added** block, making the landing page unnecessarily long;
2. mobile Albums behaved like compressed desktop cards: opening a tracklist closed another card, invoked document View Transitions, then auto-scrolled the viewport, producing visible jumps and unstable positioning;
3. the normal Lyrics track selector opened the operating-system native select popup as a very large white list, visually disconnected from LaunchPAD.

## Build 97 corrective

### Mobile Home

At `max-width: 760px`, `#recently-added-section` is hidden. The catalog remains available through Discography and Albums; desktop Home keeps Recently added unchanged.

### Mobile Albums

Mobile Albums now use a dedicated compact composition:

- 82 px artwork with title/copy alongside it;
- descriptions are clamped instead of stretching the card;
- genre/tag metadata becomes a horizontal, scrollbar-free rail;
- actions use a compact two-column row with Show/Hide Tracks occupying one stable full-width row;
- expanded tracklists get a short local reveal animation;
- album tracklists expand independently on mobile;
- mobile expansion bypasses document View Transitions;
- opening a mobile tracklist no longer closes another card above it;
- mobile expansion no longer calls `window.scrollTo()` to move the page after the tap;
- desktop Album focus behavior remains unchanged.

### Lyrics track picker

Normal Lyrics replaces the platform-native popup with a LaunchPAD-owned dark listbox:

- bounded height and internal scrolling;
- current track centered when opened;
- keyboard Arrow / Escape support;
- selection is still committed through the canonical native `#lyrics-track-select` by dispatching its existing `change` event;
- the native select remains intact and is restored in Lyrics Studio mode;
- no player or routing ownership moves into the picker.

## Safety boundary

Unchanged:

- Build 96 Lyrics synchronization, timestamp parsing and auto-scroll engine;
- player, queue, favorites, loop/repeat/shuffle and seek semantics;
- Lyrics Studio Canvas/native-loop behavior;
- Audio Lab DSP/renderers;
- desktop Albums behavior;
- Workers/R2;
- Track Manager, SHINOBIWAN Studio, SonicTrace and LRC Maker.

Safety checkpoint before this candidate:

`safety/pre-c3-c6-build97-mobile-cleanup-20260811-2330`

## Acceptance target

Real-user smoke should confirm:

- mobile Home no longer shows Recently added;
- mobile Albums stay visually stable while several Show/Hide Tracks controls are used;
- track metadata is compact enough to avoid giant mobile cards;
- normal Lyrics opens a bounded dark track picker instead of a large white OS popup;
- Studio mode still uses its prior selector/behavior;
- desktop Build 96 Lyrics remains unchanged.

Build 97 remains a candidate until real-user smoke passes.
