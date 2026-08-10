# PHASE UX · C2.5-B · Build 88 — Canonical Album Read Model

Build: `2026.08.10.88`
Release: `phase-ux-c2-5-b-canonical-album-read-model-20260810`
Cache: `shinobi-launchpad-v88`
Safety: `safety/pre-c2-5-b-build88-20260810-2143`
Feature branch: `feature/c2-5-b-canonical-album-read-model-build88`

## Status

**CANDIDATE — implementation branch.**

Build 87 / C2.5-A is REAL-USER VALIDATED and is the accepted production baseline for this slice.

The earlier Draft PR #184 is intentionally superseded as an implementation vehicle because it diverged heavily from current `main` after the Build 79→87 mobile/player work. Its Album design is reused selectively, not merged wholesale.

## Goal

Establish the first-class Album **read/projection contract** without opening any Album write surface.

Canonical direction:

```text
albums/<album-id>/manifest.json
albums/<album-id>/cover/<filename>
albums/<album-id>/thumbnail/thumbnail.webp
```

Album id is stable storage identity. A later title rename must not imply an Album id/storage rename.

## Album manifest v1

```json
{
  "schemaVersion": 1,
  "id": "ghost-signal",
  "title": "Ghost Signal",
  "type": "album | ep | collection",
  "status": "draft | published | archived",
  "year": 2026,
  "releaseDate": "2026-08-10T00:00:00.000Z",
  "description": "...",
  "heading": "...",
  "trackIds": ["track-a", "track-b", "track-c"],
  "accent": "#112233",
  "accent2": "#445566",
  "assets": {
    "cover": "cover/cover.webp",
    "thumbnail": "thumbnail/thumbnail.webp"
  },
  "createdAt": "...",
  "updatedAt": "...",
  "updatedBy": "..."
}
```

## Authority rules

When a canonical Album exists:

- `album.trackIds` is the authoritative ordered membership;
- track manifest `album.id/title` remains only a compatibility cache during migration;
- canonical Album data overrides the same-id legacy `catalog.js` presentation in the effective read model;
- unmigrated legacy Albums remain available as fallback.

This allows gradual migration instead of a flag-day cutover.

## Private Track Manager read model

C2.5-B adds R2 Album manifest/asset readers and extends the private track-list response additively with Album data when canonical Album objects exist.

No Album POST / PUT / PATCH / DELETE route is introduced.

## `catalog/index.json` projection

The catalog index remains `schemaVersion: 1`.

Existing rebuilds can add:

```json
{
  "albumCount": 3,
  "albums": []
}
```

This is a rebuildable projection only. `albums/<id>/manifest.json` remains the planned Album authority.

Only published canonical Albums are projected, and their `trackIds` are filtered to track ids already present in the published track projection.

## Browser fallback behavior

LaunchPAD can hydrate an optional `albums[]` projection if one appears in the existing catalog payload. If absent, behavior remains based on the current hardcoded Albums.

This means Build 88 remains compatible with today's production payload, where canonical Albums do not yet exist.

## Singles

`Singles` is not converted in C2.5-B. It remains the current compatibility Album. The future virtual Singles collection belongs to the controlled migration/cutover phases.

## Explicit non-scope

Build 88 does NOT:

- create/edit/delete/reorder a production Album;
- create any Album object in R2;
- associate/dissociate a production track through a new write route;
- upload/copy/move Album cover assets;
- migrate Neon Heartbreaks, Coal to Diamond or Love Letters from Saigon;
- convert Singles to a virtual collection;
- expose a new public `/albums` Worker route;
- retire `catalog.js`;
- deploy either Cloudflare Worker;
- mutate production R2;
- start C2.5-C/D/E/F;
- resume C3 SonicTrace Deep Audio work;
- create the final PHASE UX checkpoint;
- start Phase 7.

## Regression guard

`npm run check:canonical-album-read-model` verifies:

- accepted Album types/statuses;
- ordered `trackIds` de-duplication;
- canonical-over-legacy precedence;
- legacy fallback;
- canonical membership/order;
- Album R2 read-model markers;
- additive `catalog/index.json` schema v1 projection;
- absence of Album write/delete routes;
- absence of public canonical Album cutover.

## Promotion policy

Build 88 must pass full CI before Ready/merge.

A merge does **not** authorize an admin Worker deployment. Worker deployment remains a distinct explicit step because the code contains new private read/projection capability.

C2.5-C guarded Album writes requires separate implementation, documentation, CI and authorization.
