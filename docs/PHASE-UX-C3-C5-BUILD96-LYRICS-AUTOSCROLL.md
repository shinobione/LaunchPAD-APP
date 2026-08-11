# PHASE UX — C3-C.5 — Build 96 Lyrics auto-scroll + viewport corrective

Candidate: `2026.08.11.96`

Release: `phase-ux-c3-c5-lyrics-autoscroll-20260811`

## Real-user finding after Build 95

Build 95 passed the requested global desktop polish except for the normal Lyrics page.

The real-user video and screenshots showed two coupled regressions:

1. entering normal `#lyrics=<track-id>` while playback was already in progress could leave the reader on stale lines with no visible active line / no automatic centering;
2. the normal desktop Lyrics route still allowed page-level vertical scrolling even though the reader itself is the intended scroll surface.

The same video showed that entering Studio mode immediately restored the active lyric and internal scrolling, which narrowed the fault to normal Lyrics route/layout reconciliation rather than timestamp parsing, audio playback or the synchronized-lyrics data.

## Build 96 corrective

### Auto-scroll state repair

`js/features/lyrics/lyrics-engine.js` now:

- self-heals the active-line presentation when `activeIndex` is already correct but the freshly visible Lyrics DOM has not yet received `.active` / `.past` classes;
- reconciles Lyrics state after route/layout settle using two animation frames instead of assuming the visible surface is fully ready in the route event stack;
- force-centers the current line when the normal Lyrics route becomes visible;
- restarts the existing sync clock only when playback is active and no seek transaction is in progress;
- repeats the same settled reconciliation after a lyrics file finishes loading while Lyrics is visible.

No `scrollIntoView()` or page-relative lyric scrolling is introduced. The existing reader-relative `centeredScrollTop()` authority remains intact.

### Single-screen desktop Lyrics workspace

`css/c3-c5-lyrics-v96.css` is scoped to desktop normal Lyrics only (`:not(.lyrics-studio-mode)`). It:

- constrains `.main-content` to the viewport area above the persistent 88px player;
- prevents the normal Lyrics view from growing the document vertically;
- makes the active Lyrics view a finite flex workspace below the 82px topbar;
- lets `.lyrics-stage` consume the remaining height;
- makes `.lyrics-reader-shell` an explicit `auto / minmax(0,1fr)` grid;
- makes `#lyrics-reader` the dedicated vertical scroll host with `overflow-y:auto`;
- leaves Studio mode, fullscreen behavior and mobile layout untouched.

## Safety boundary

Unchanged:

- global player, queue, favorites, loop/repeat/shuffle and seek ownership;
- timestamp parsing and lyrics storage;
- Lyrics Studio Canvas / native loop behavior;
- Audio Lab DSP/renderers;
- Albums / Discography / Eras;
- public/admin Workers and R2;
- Track Manager, Studio, SonicTrace and LRC Maker.

Safety checkpoint before this candidate:

`safety/pre-c3-c5-build96-lyrics-autoscroll-viewport-20260811-2300`

## Acceptance target

On desktop normal Lyrics:

- no page-level scroll should be required to use the page;
- the current synchronized line should become visible and centered automatically when entering Lyrics during ongoing playback;
- subsequent timestamp changes should keep auto-scrolling inside the reader;
- `Auto-scroll` / `Manual scroll` remains user-controlled;
- Studio mode behavior remains unchanged.

Build 96 remains a candidate until real-user smoke confirms those points.