# PHASE UX / C3-C.8 — Build 99 Mobile Reactivity + Player State

Candidate build: `2026.08.12.99`

Release: `phase-ux-c3-c8-mobile-reactivity-20260812`

Safety checkpoint: `safety/pre-c3-c8-build99-mobile-reactivity-20260812-0116`

## Real-user findings after Build 98

Build 98 fixed Track Detail first-paint Moods / Themes, but two real-device findings remained:

1. Mobile interaction still felt heavy and delayed, especially opening and closing the navigation drawer.
2. Pressing `Play track` could start real audio playback while the global play/pause controls stayed on the loading spinner even though media time was already advancing.

The affected mobile device is a modern Android handset, so the target is not to accommodate weak hardware; the target is to remove unnecessary rendering and animation work from basic interactions.

## Root causes confirmed

### Mobile drawer / navigation

The mobile drawer inherited several expensive or perceptually slow layers at once:

- legacy `.sidebar` `transition: .3s` shorthand, therefore transition-all behavior;
- desktop glass `backdrop-filter: blur(22px)` still applied to the moving mobile drawer;
- an additional backdrop blur behind the drawer;
- premium press/bloom DOM effects on taps;
- 280 ms Web Animations route transitions on touch-mobile navigation;
- first-focus work scheduled immediately after opening the drawer.

None of those effects is required for mobile navigation correctness.

### Player spinner

`audio-readiness.js` treated every native `waiting` event as proof that playback had stalled and immediately forced `playbackRequestState=starting`.

`player-experience.js` correctly maps `starting` to the loading spinner, so the presentation layer was faithfully displaying a bad source state.

Build 98 added a progress-based self-heal, but that was downstream of the owner that kept re-entering `starting`.

## Build 99 corrective

### Touch-first mobile drawer

- touch / pen opens and closes the menu on `pointerdown` rather than waiting for the synthesized click;
- the following synthetic click is suppressed so ownership stays single-toggle;
- keyboard and mouse retain normal click semantics and keyboard focus behavior;
- touch activation avoids unnecessary focus jumps.

### Lightweight mobile rendering

On mobile only:

- moving sidebar blur is disabled;
- backdrop blur is disabled;
- drawer animation is limited to `transform` at 145 ms;
- backdrop opacity transition is reduced to 95 ms;
- `touch-action: manipulation` is applied to drawer interactions;
- desktop glass / premium presentation remains unchanged.

### Mobile premium-motion bypass

On phone / coarse-pointer surfaces:

- click bloom creation is skipped;
- press/release classes are skipped;
- WAAPI route-entry animation is skipped;
- route work is not scheduled only to be discarded later.

Desktop C3-C premium motion remains intact.

### Stall-aware playback state

A native `waiting` event no longer immediately means `starting`.

Build 99 now:

- tracks real media-time progress;
- clears transient waiting when progress resumes;
- keeps `playing` while media time is advancing;
- waits 360 ms before considering a spinner;
- only enters `starting` after that delay if there has been no recent progress **and** the media element still lacks future data;
- preserves the existing real startup / retry / blocked-playback path.

## Preserved contracts

No ownership changes to:

- audio source selection;
- queue / next / previous;
- favorites;
- shuffle / repeat / loop;
- seek;
- Lyrics synchronization;
- Track Video / Studio Canvas;
- Audio Lab signal engine;
- Cloudflare Workers;
- R2;
- Track Manager;
- SonicTrace;
- LRC Maker.

Build 98 Moods / Themes first-paint reconciliation remains inherited.

## Validation gate

Candidate remains unaccepted until:

- syntax and existing regression suites pass;
- Build 99 guard passes;
- Chrome navigation smoke passes;
- installed-PWA horizontal-overflow smoke passes;
- Worker dry-runs pass;
- GitHub Pages deploy succeeds;
- real mobile smoke confirms the drawer feels immediate;
- real playback smoke confirms no persistent spinner while media time advances.
