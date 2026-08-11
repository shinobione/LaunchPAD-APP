# PHASE UX / C3-C.9 — Build 100

Candidate: `2026.08.12.100`  
Release: `phase-ux-c3-c9-mobile-menu-focus-20260812`

## Real-user findings after Build 99

- Mobile drawer is faster, but can behave erratically and close itself.
- Mobile application should not allow pinch zoom in/out.
- Desktop previous/next transport controls show an unintended cyan/green rectangular halo.
- Desktop player range controls, notably volume, show an unintended cyan/green rectangular focus halo.

## Root causes

### Mobile drawer
Build 99 introduced touch/pen `pointerdown` ownership while retaining `click` ownership. This created two input event families for the same drawer action. In addition, the early boot menu bridge can set `.sidebar.open` before the full mobile-navigation module hydrates; the module then previously forced `sync(false)`, which could close a drawer that the user had just opened.

### Desktop player chrome
Premium Feel applies generic hover/focus box shadows to transport buttons and generic form focus shadows to range inputs. Bare previous/next buttons have no pill surface, so the shadow reads as a cyan square. Range inputs similarly expose the generic form halo around the complete slider box.

## Build 100 corrective

- removes touch/pen `pointerdown` ownership from the drawer;
- keeps one canonical `click` event path for touch, mouse and keyboard;
- retains `touch-action: manipulation` and the lightweight 145 ms drawer transform from Build 99;
- preserves an already-open boot drawer during full navigation hydration instead of force-closing it;
- keeps keyboard focus behavior and Escape-to-close semantics;
- locks the mobile viewport to a non-zooming app shell and adds `touch-action: pan-x pan-y` at mobile document level while preserving one-finger scrolling and horizontal rails;
- loads a Build 100 corrective stylesheet from the existing critical mobile-navigation module on both mobile and desktop;
- removes rectangular premium box shadows from desktop previous/next transport controls;
- removes rectangular generic form focus halos from player range controls while retaining their native track/thumb state and a subtle brightness cue for keyboard focus;
- preserves the Build 99 stall-aware audio-state correction unchanged.

## Safety

Checkpoint: `safety/pre-c3-c9-build100-mobile-menu-focus-20260812-0134`

Preserved boundaries:

- canonical audio source ownership;
- play/pause implementation and Build 99 stall-aware state;
- seek, queue, favorites, shuffle/repeat/loop;
- Lyrics synchronization;
- Track Video / Studio Canvas;
- Audio Lab;
- canonical catalog and Album read model;
- Workers/R2, Track Manager, SonicTrace and LRC Maker.

## Acceptance gate

Do not treat Build 100 as real-device accepted until all of the following are confirmed:

1. mobile drawer opens and remains open until an explicit close/navigation action;
2. repeated open/close taps do not double-toggle or self-close;
3. pinch zoom cannot resize the mobile application shell;
4. normal vertical scrolling and horizontal content rails still work;
5. desktop previous/next buttons no longer show cyan/green rectangles;
6. desktop volume/timeline sliders no longer show a cyan/green rectangular halo;
7. Play Track still transitions to Pause correctly while media time advances;
8. exact-head CI, Chrome smoke, horizontal overflow and Worker dry-runs pass.
