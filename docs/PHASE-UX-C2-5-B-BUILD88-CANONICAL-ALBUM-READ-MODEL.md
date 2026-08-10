# PHASE UX · C2.5-B · Build 88 — Canonical Album Read Model

Build: `2026.08.10.88`
Release: `phase-ux-c2-5-b-canonical-album-read-model-20260810`
Cache: `shinobi-launchpad-v88`
Safety: `safety/pre-c2-5-b-build88-20260810-2143`
Feature branch: `feature/c2-5-b-canonical-album-read-model-build88`
PR: `#193`
Merge: `dd0a7e8c218ccba1d4693779d5c5ef16605292c6`
Pages run: `31427116914` — SUCCESS

## Status

**IMPLEMENTED + MERGED + GITHUB PAGES SUCCESS.**

Build 87 / C2.5-A remains the real-user-validated behavioral baseline inherited by this release. Build 88 adds the C2.5-B Album read/projection foundation without reopening the validated player/mobile/media surfaces.

The final PR head `f20991bcf5ae38c3b2a771280d882004c7341ba5` passed:

- Validate Launchpad — `31427015869` — SUCCESS;
- Validate Cloudflare Workers — `31427015881` — SUCCESS;
- Validate Horizontal Overflow — `31427015882` — SUCCESS.

Post-merge `main` validation also passed:

- Validate Launchpad — `31427116242` — SUCCESS;
- Validate Cloudflare Workers — `31427116737` — SUCCESS;
- Validate Horizontal Overflow — `31427116820` — SUCCESS;
- Deploy LaunchPAD to GitHub Pages — `31427116914` — SUCCESS.

**No Cloudflare Worker was deployed and no production R2 object was mutated by C2.5-B.** The production private Worker therefore remains the previously validated Track Manager v5.16 / Studio bridge v1.8 deployment until a separate explicit backend deployment decision is made.

The earlier Draft PR #184 is closed as **SUPERSEDED** because it was based on Build 79 and had diverged substantially from the Build 87 line. Its useful Album design was selectively rebuilt on the fresh Build 88 branch rather than rebased/merged wholesale.

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

The Worker source change is merged but remains **undeployed** at this checkpoint. This is intentional: source merge, Worker deployment and R2 mutation are separate states.

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

Because the C2.5-B Worker source is not deployed and no canonical Album exists in production, no production `catalog/index.json` mutation occurred during this slice.

## Browser fallback behavior

LaunchPAD can hydrate an optional `albums[]` projection if one appears in the existing catalog payload. If absent, behavior remains based on the current hardcoded Albums.

This keeps Build 88 compatible with today's production payload, where canonical Albums do not yet exist.

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

Historical Build 87 and master-spec guards were also made ancestry-safe so later builds preserve those protections without freezing the current release number forever.

## Next roadmap boundary

C2.5-B implementation is complete at the code/read-model layer.

**Next: C2.5-C — guarded Album writes / membership / order / assets.**

C2.5-C is the first slice that intentionally introduces a production-capable Album write surface. It requires a separate safety checkpoint, versioning, tests, PR/CI and explicit deployment/mutation discipline.

C3 SonicTrace remains suspended during C2.5. Final PHASE UX checkpoint remains NOT CREATED. Phase 7 remains NOT STARTED.
