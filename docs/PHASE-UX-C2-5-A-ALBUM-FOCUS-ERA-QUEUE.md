# PHASE UX C2.5-A refinement — Album Focus + Era Queue

Status: **IMPLEMENTED CANDIDATE — CI / REAL USER SMOKE PENDING**  
Public candidate: **LaunchPAD Build 69**  
Scope: **LaunchPAD frontend only**

## Why this refinement exists

Build 68 solved the immediate Albums scalability problem by collapsing every project tracklist by default. Real-user visual review confirmed the page is substantially cleaner, then identified two follow-up UX opportunities:

1. opening a project tracklist should feel more like entering that Album rather than merely revealing rows in place;
2. selecting an Era in Discography should create a coherent sequential playback context so its tracks behave like a temporary playlist.

This refinement implements only those two UX behaviors. It does not advance the canonical Album architecture work planned for C2.5-B and later.

## A.1 — Album Focus

On desktop widths above 1180 px:

- `Show N tracks` promotes the selected Album/project to the dominant left-hand panel;
- the focused Album receives a larger cover, title and visual treatment;
- the other Albums move into a compact vertical dock on the right;
- docked Albums remain keyboard- and pointer-accessible;
- hovering/focusing a docked Album restores contrast so it never becomes visually disabled;
- selecting `Show N tracks` on a docked Album transfers focus to that Album;
- `Hide tracks` restores the normal two-column Album grid.

At narrower widths:

- the focused Album moves to the top of the one-column grid;
- sibling Albums stay visible underneath with only light de-emphasis;
- mobile keeps the Build 68 full-width action layout.

Animation uses the browser View Transitions API when available. The feature falls back to an immediate safe layout mutation when unsupported and explicitly respects `prefers-reduced-motion: reduce`.

The existing `Open project →` route and clickable Album heading continue to open the full individual Album detail page. Album Focus does not replace or modify that page.

## A.2 — Era Queue

Discography Era selection remains a filter first. Selecting an Era does **not** autoplay music.

When exactly one Era is active:

- matching Discography play controls receive a virtual playback context using the reserved `era:` prefix;
- playing any matching track resolves all catalog tracks belonging to that Era in catalog order;
- the existing shared queue controller consumes that list;
- the context is normalized to queue type `era`;
- Next / Previous therefore remain inside the selected Era exactly as they remain inside an Album queue;
- the queue panel identifies the context as `Era queue`.

Returning to `All eras` removes the virtual context from Discography play controls. An already-running queue is not forcefully interrupted; the next newly selected catalog track can establish a normal catalog context again.

The virtual Era queue is frontend-only and reconstructible. It creates no Album object, writes no R2 object and does not alter `catalog/index.json`.

## Files intentionally changed

Runtime/UI:

- `js/features/content/content-controller.js`
- `css/content-v4.css`
- `js/features/discography-experience.js`
- `js/core/catalog-store.js`
- `js/core/player-queue.js`
- `js/features/queue-ui.js`
- `js/build-config.js`

Regression/release support:

- `scripts/test-albums-collapse.mjs`
- `scripts/test-master-spec.mjs`
- `README.md`
- `CHANGELOG.md`
- this document

## Safety boundary

Pre-change rollback reference:

`safe​ty/pre-c2-5-a-refinements-20260809-2007`

created from LaunchPAD production head:

`a0b3814d60f7f15b346f150cc7c909bf10255ddc`

Build 69 must not:

- change Track Manager;
- change either Cloudflare Worker source or deployment;
- mutate R2;
- change `catalog/index.json`;
- create canonical Album manifests;
- migrate existing albums or Singles;
- change track manifests;
- start C2.5-B;
- touch SonicTrace C3;
- start Phase 7;
- create the final PHASE UX checkpoint.

## Automated acceptance

The dedicated C2.5-A guard must continue proving the Build 68 collapse/ARIA/mobile contracts and additionally prove:

- focused collection/card state is explicit;
- one Album remains expanded at a time;
- desktop focus reserves the majority of the layout for the active Album;
- sibling Albums remain interactive and visually de-emphasized rather than hidden;
- View Transitions are progressive and reduced-motion aware;
- a single selected Era attaches a virtual playback context;
- the catalog resolver can reconstruct Era track indexes without a canonical Album object;
- the shared queue normalizes virtual `era:` IDs to context type `era`;
- sequential Next stays inside the Era and stops normally with repeat off;
- the queue UI labels the context `Era queue`;
- existing Album Play and Open routes remain unchanged.

Full repository CI remains authoritative before merge.

## Real-user smoke required

After Pages deploy, Build 69 must be checked in a real browser for:

1. Albums initially remain collapsed;
2. `Show N tracks` creates the dominant Album Focus layout;
3. sibling Albums remain visible and clickable in the dock;
4. switching focus between Albums animates cleanly without horizontal overflow;
5. `Hide tracks` restores the normal grid;
6. `Play album` and `Open project →` still work;
7. mobile/narrow layout remains usable;
8. selecting one Discography Era still filters correctly;
9. playing a track from that Era opens an `Era queue` containing only Era tracks;
10. natural end / Next advances to the next Era track;
11. Previous works inside the same Era;
12. returning to `All eras` does not unexpectedly interrupt current audio.

Until this smoke passes:

- C2.5-A refinement = **CANDIDATE**;
- final PHASE UX checkpoint = **NOT CREATED**;
- C2.5-B = **NOT STARTED**;
- C3 SonicTrace parity = **SUSPENDED**;
- Phase 7 = **NOT STARTED**.
