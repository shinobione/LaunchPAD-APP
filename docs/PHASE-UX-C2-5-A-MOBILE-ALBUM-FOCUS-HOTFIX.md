# PHASE UX C2.5-A — Mobile Album Focus hotfix

Status: **IMPLEMENTED CANDIDATE — CI / REAL USER SMOKE PENDING**  
Public candidate: **LaunchPAD Build 70**  
Scope: **LaunchPAD frontend only**

## Problem observed in real-user smoke

Build 69 correctly reorders the expanded Album to the first position on layouts up to 1180 px. On mobile, when the user was already near the bottom of the Album collection and pressed `Show N tracks`, the selected card moved to the top of the collection while the browser viewport stayed at the old scroll position. The Album opened correctly but disappeared above the viewport, making the interaction feel broken.

## Fix

Build 70 keeps the existing Build 69 Album Focus layout and adds narrow-screen viewport follow-up only when an Album is being expanded:

- desktop widths above 1180 px keep the existing behavior with no automatic scrolling;
- on widths up to 1180 px, the runtime waits for the Album layout/View Transition to complete;
- it then resolves the selected Album's new document position;
- the sticky topbar height is subtracted so the Album header is not hidden;
- the viewport scrolls to the newly focused Album;
- normal motion preference uses smooth scrolling;
- `prefers-reduced-motion: reduce` uses immediate scrolling;
- closing an Album does not force a scroll;
- Play Album, Open Project, Album detail, Era Queue and all queue semantics remain unchanged.

The fix deliberately avoids DOM focus theft: the clicked native toggle retains its keyboard focus; only the viewport follows the card's new layout position.

## Safety checkpoint

Pre-hotfix rollback reference:

`safety/pre-c2-5-a-mobile-album-focus-20260809-2026`

created from production head:

`37d9836153b9e4d57744ab1430e5c21d3f90bc6d`

## Files intentionally changed

- `js/features/content/content-controller.js`
- `scripts/test-albums-collapse.mjs`
- `js/build-config.js`
- `scripts/test-master-spec.mjs`
- `README.md`
- this document

## Safety boundary

Build 70 must not:

- change Track Manager;
- change or deploy a Cloudflare Worker;
- mutate R2;
- change `catalog/index.json`;
- introduce or migrate canonical Albums;
- change track manifests;
- start C2.5-B;
- touch SonicTrace C3;
- start Phase 7;
- create the final PHASE UX checkpoint.

## Automated acceptance

The Albums/Era regression guard now additionally requires:

- the narrow-screen breakpoint to be explicit;
- automatic viewport follow-up only after the Album layout transition completes;
- selected-card geometry to be reread after reorder;
- topbar offset handling;
- actual `window.scrollTo` viewport movement;
- reduced-motion preservation.

## Real-user smoke

After Pages deployment:

1. on mobile, scroll to the final Album card;
2. press `Show N tracks`;
3. the selected Album must move to the top of the Album collection **and the viewport must follow it immediately**;
4. its header/actions should remain visible below the topbar;
5. repeat with another Album lower in the list;
6. `Hide tracks` must not unexpectedly jump the page;
7. desktop Album Focus must remain unchanged.

Until this smoke passes, Build 70 remains a candidate and the final PHASE UX checkpoint remains uncreated.
