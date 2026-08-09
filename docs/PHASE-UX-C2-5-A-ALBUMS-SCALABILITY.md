# PHASE UX C2.5-A — LaunchPAD Albums scalability

Status: **IMPLEMENTED CANDIDATE — REAL USER SMOKE PENDING**  
Public candidate: **LaunchPAD Build 68**  
Scope: **LaunchPAD frontend only**

## Purpose

C2.5-A is the independent UI scalability slice identified by the C2.5 Album / Project architecture audit.

The public Albums view previously rendered every track row for every project immediately. With four current projects this already produced unnecessary page height and interaction density; it would scale linearly as the catalog grows.

This slice changes only the Albums list presentation. It does **not** implement the future canonical Album data model.

## User behavior

On the main Albums view:

- Album/project cards remain compact.
- Tracklists are collapsed by default.
- Each populated Album exposes `Show N tracks`.
- An expanded Album exposes `Hide tracks`.
- Expanding one Album collapses any previously expanded Album.
- The toggle is a native button with `aria-expanded` and `aria-controls`.
- Keyboard activation remains native through Enter/Space and focus is visibly styled.
- `Play album` remains directly available while collapsed.
- `Open project →` remains directly available while collapsed.
- Individual Album detail pages are unchanged and continue to render the complete tracklist.
- Mobile layout gives the tracklist toggle its own full-width action row and prevents horizontal overflow.

## Files intentionally changed

Runtime/UI:

- `js/features/content/content-controller.js`
- `css/content-v4.css`
- `js/build-config.js`

Regression/release support:

- `scripts/test-albums-collapse.mjs`
- `scripts/test-master-spec.mjs`
- `package.json`
- `README.md`
- this document

## Safety boundary

C2.5-A must remain frontend-only.

It does **not**:

- change Track Manager;
- change either Cloudflare Worker;
- change R2;
- change `catalog/index.json`;
- introduce `albums/<id>/manifest.json`;
- migrate any existing Album or cover;
- change track manifests;
- change Album ordering authority;
- change the individual Album detail view;
- touch SonicTrace C3;
- start Phase 7;
- create the final PHASE UX checkpoint.

The pre-change rollback reference is:

`safety/pre-c2-5-a-albums-scalability-20260809-1948`

created from LaunchPAD production head `6257d76cd519a413d2968e198e96d96809ff2b75` after the C2 documentation closeout merge.

## Validation contract

Automated coverage must prove:

- collapsed-by-default markup;
- `aria-expanded` and `aria-controls` wiring;
- native button click behavior;
- Show/Hide copy change;
- one-expanded-card policy;
- hidden-state CSS;
- visible keyboard focus;
- explicit mobile layout rule;
- existing Play album routing remains present;
- existing Open project routing remains present;
- the master release guard advances coherently to Build 68 instead of pinning the prior Build 67 marker.

Full repository CI remains authoritative before merge.

## Release and acceptance

Build 68 is a public frontend release because the Albums page behavior changes for users. It must advance the PWA build/cache namespace and living README release marker.

C2.5-A is **not complete** merely because CI is green or Pages deploys. Final acceptance requires a real-user browser smoke confirming:

1. Albums load collapsed by default;
2. `Show N tracks` expands the intended Album;
3. opening another Album collapses the first;
4. `Hide tracks` collapses the open list;
5. Play album still works from a collapsed card;
6. Open project still opens the unchanged full Album page;
7. keyboard activation/focus is usable;
8. mobile/desktop layout has no action overlap or horizontal overflow.

Until that smoke passes:

- final PHASE UX checkpoint = **NOT CREATED**;
- C2.5-B = **NOT STARTED**;
- C3 SonicTrace parity = **SUSPENDED**;
- Phase 7 = **NOT STARTED**.
