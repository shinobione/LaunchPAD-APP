# PHASE UX — C2.5-B Canonical Album Read Model

**Status:** IMPLEMENTED ON FEATURE BRANCH — DRAFT PR / CI / REVIEW PENDING  
**Production LaunchPAD remains:** Build 79  
**Production Track Manager remains:** v5.16 / Studio bridge v1.8  
**Safety checkpoint:** `safety/pre-c2-5-b-canonical-album-read-model-20260810-0238`  
**Feature branch:** `feature/c2-5-b-canonical-album-read-model`

## Why C2.5-B exists

C2.5-A solved the immediate LaunchPAD Albums scalability problem, but it did not create a canonical Album entity.

Before this slice:

- LaunchPAD Albums are defined in `js/catalog.js`;
- R2 track manifests only cache `album.id` / `album.title`;
- `catalog/index.json` is track-only;
- Track Manager / Studio can therefore reference an `albumId` without materializing that Album;
- LaunchPAD validates album membership against the hardcoded Album list.

C2.5-B establishes the **read contract only** for first-class Albums. It deliberately stops before any Album mutation.

## Canonical R2 direction

Reserved canonical paths:

```text
albums/<album-id>/manifest.json
albums/<album-id>/cover/<filename>
albums/<album-id>/thumbnail/thumbnail.webp
```

Album id is the stable storage identity. A later title rename must not imply a storage-id rename.

## Album manifest v1 read contract

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

### Membership rule

`album.trackIds` is the authoritative ordered membership **when a canonical Album exists**.

Track-manifest `album.id/title` remains a compatibility cache during migration. It does not override canonical order.

## Read/projection behavior

### Track Manager / Studio private read

The existing track-list read model is extended additively with:

```json
{
  "tracks": [],
  "albums": [],
  "albumTotals": {}
}
```

No new Album POST / PUT / PATCH / DELETE route is introduced in C2.5-B.

### catalog/index.json

The index remains **schemaVersion 1** for backwards compatibility.

When its existing rebuild function is called by an already-authorized Track Manager operation, the projection can additionally contain:

```json
{
  "schemaVersion": 1,
  "count": 29,
  "tracks": [],
  "albumCount": 3,
  "albums": []
}
```

This is an additive extension, not a new source of truth. Album manifests in `albums/<id>/manifest.json` remain authoritative.

Only `published` Albums are projected publicly. Their projected `trackIds` are filtered to published tracks already present in the track projection so a public Album cannot reference a private/draft track.

## Legacy fallback

C2.5-B does **not** retire `js/catalog.js`.

The browser read model now supports two layers:

1. canonical Album by id, when an optional canonical projection exists;
2. legacy hardcoded Album fallback otherwise.

A canonical Album with the same id overrides its legacy presentation in the effective read model. Unmigrated legacy Albums remain available.

This permits controlled migration later instead of a flag day.

## Singles

`Singles` is **not converted in C2.5-B**.

It remains the current compatibility Album. The future virtual Singles collection belongs to the controlled migration / canonical-consumption phases after the Album write model is proven.

## Explicit non-scope

C2.5-B does **not**:

- create an Album in R2;
- edit an Album;
- delete an Album;
- reorder a real Album;
- associate or dissociate a production track;
- upload/copy/move an Album cover;
- migrate Neon Heartbreaks, Coal to Diamond or Love Letters from Saigon;
- convert Singles to a virtual collection;
- expose canonical Albums in the public LaunchPAD Worker;
- retire `catalog.js`;
- deploy either Cloudflare Worker;
- modify production R2;
- start C2.5-C/D/E/F;
- resume SonicTrace C3 engine work;
- create the final PHASE UX checkpoint;
- start Phase 7.

## Why the public Worker is untouched

Public LaunchPAD canonical Album consumption is C2.5-F. C2.5-B prepares the schema and private/projection model without changing the live public API surface.

The current LaunchPAD Build 79 must also remain independently smoke-testable on Android before another public Build is published.

## Regression guards

`check:canonical-album-read-model` verifies:

- accepted Album types/statuses;
- stable id handling;
- ordered `trackIds` de-duplication;
- canonical Album precedence over a same-id legacy Album;
- legacy fallback when no canonical projection exists;
- canonical `trackIds` controls effective Album order;
- R2 path/read-model markers exist;
- catalog projection stays additive schemaVersion 1;
- no Album write/delete route is introduced;
- public Worker canonical Album consumption is still absent.

## Merge/deploy policy

This feature should remain a **Draft PR until LaunchPAD Build 79 passes real-device Android smoke**.

Even after merge, an admin Worker deployment must remain a distinct, explicit operation. The code itself performs no automatic production mutation or migration.

C2.5-C — guarded Album writes — requires separate authorization and safety review.
