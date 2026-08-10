# PHASE UX · C2.5-C — Guarded Canonical Album Writes

Public LaunchPAD: `2026.08.10.88` / `shinobi-launchpad-v88` (unchanged)  
Track Manager candidate: `v5.17`  
Studio bridge candidate: `v1.9`  
Safety ref: `safety/pre-c2-5-c-tm5-17-20260810-2306`  
Feature branch: `feature/c2-5-c-guarded-album-writes-tm5-17`

## Status

**CANDIDATE — source implementation only.**

C2.5-B / Build 88 established the canonical Album read/projection contract. C2.5-C adds the first guarded write layer without advancing the public PWA build, authorizing a Worker deployment or performing production Album migration.

## Canonical authority

```text
albums/<album-id>/manifest.json
albums/<album-id>/cover/<filename>
albums/<album-id>/thumbnail/thumbnail.webp
```

Rules:

- Album ID is immutable storage identity after creation.
- Ordered `album.trackIds` is the canonical membership/order authority.
- Track manifest `album.id/title` remains a compatibility cache during migration only.
- `catalog/index.json` remains a rebuildable projection, not Album authority.
- R2 remains canonical data storage.
- Track Manager remains the sole protected write authority.

## Candidate backend versions

If C2.5-C is later explicitly deployed admin-only:

- Track Manager: `v5.17`
- Studio bridge: `v1.9`
- Public media Worker: unchanged `v2.6`

Until that explicit deployment, production remains Track Manager `v5.16` / bridge `v1.8` from run `31324447727`.

## Protected Studio routes

### Reads

```text
GET /api/studio/albums
GET /api/studio/albums/<album-id>
```

### Create / metadata

```text
POST /api/studio/albums
POST /api/studio/albums/<album-id>/metadata/save
```

Creation always starts as `draft`; client-supplied status/trackIds/assets/audit fields cannot bypass the creation boundary.

Metadata input is strict. Invalid Album type/status/year/release-date/color values are rejected instead of silently falling back to schema defaults.

### Membership / order

```text
POST /api/studio/albums/<album-id>/tracks/save
POST /api/studio/albums/<target-album-id>/tracks/move
```

The membership route accepts one ordered `trackIds[]` array. The move route supports reordering within a target Album or guarded source→target movement.

A pure reorder does not rewrite the track manifest when its compatibility `album.id/title` cache is already correct, avoiding unrelated track-revision churn.

### Album assets

```text
POST /api/studio/albums/<album-id>/assets/cover/upload
POST /api/studio/albums/<album-id>/assets/cover/delete
POST /api/studio/albums/<album-id>/assets/thumbnail/upload
POST /api/studio/albums/<album-id>/assets/thumbnail/delete
```

Thumbnail is constrained to `thumbnail/thumbnail.webp` and <= 2 MiB. Cover lives under `cover/cover.<ext>`.

## Concurrency / stale protection

Every mutation requires the canonical Album `updatedAt` observed by the caller.

A mismatch returns a 409 stale response rather than silently overwriting newer state.

Cross-Album move requires separate expected revisions for source and target so an artistic reorder cannot overwrite a concurrent edit.

## Membership integrity

C2.5-C rejects a requested membership when a track is already owned by another canonical Album.

This prevents the transitional track-manifest compatibility cache from becoming a second authority and prevents ambiguous release membership.

Compatibility cache writes occur only when membership/title cache actually needs to change.

When a track is removed from a canonical Album during this transitional phase, its legacy track-manifest cache returns to `Singles`; the future virtual Singles model remains reserved for C2.5-E/F.

## Published Album quality guard

A canonical Album cannot be promoted/kept published by a mutation when the proposed state fails required checks:

- title present;
- non-empty tracklist;
- cover present;
- all referenced track manifests exist;
- all referenced tracks are published.

This does not introduce a new publication authority; it protects the current canonical Album state from becoming internally invalid.

## Atomicity strategy

Album writes use the same conservative pattern already proven by Track Manager track/assets operations:

```text
read canonical state
  -> stale guard
  -> validate proposed state
  -> backup affected object where necessary
  -> write scoped Album/track cache changes
  -> rebuild catalog projection
  -> canonical reread verification
  -> cleanup backup
```

On failure after mutation begins, the implementation attempts to restore:

- previous Album manifest(s);
- affected track compatibility manifests;
- previous Album asset object when applicable;
- rebuilt catalog projection.

The response exposes rollback state rather than pretending a failed write succeeded.

## Transaction regression smoke

CI executes the write logic against an in-memory R2/catalog model and verifies:

- create always produces a draft;
- stale metadata returns 409 with no write;
- duplicate canonical ownership is rejected;
- pure reorder changes Album order without rewriting the track manifest;
- guarded cross-Album movement updates source, target and compatibility cache;
- a simulated catalog-publication failure restores the previous Album manifest and catalog projection.

## Deliberate hard stop: no whole-Album deletion

C2.5-C does **not** provide a route that deletes an entire canonical Album object/tree.

Archiving/drafting is sufficient for the upcoming management UI. Destructive release deletion deserves a separate explicit design because it interacts with membership, assets, migration history and public fallback.

## Deployment topology

The production Cloudflare workflow remains manual `workflow_dispatch`, restricted to `main`, with explicit `DEPLOY` confirmation.

The future admin deployment expectation is Track Manager `v5.17`; public Worker expectation remains `v2.6`.

Public LaunchPAD remains Build 88 because C2.5-C changes no public runtime surface.

**A source merge is not a Worker deployment. A Worker deployment is not an R2 migration.** These states remain intentionally separate.

## Explicit non-scope

C2.5-C does NOT:

- advance the public LaunchPAD build beyond 88;
- deploy Track Manager v5.17;
- create or mutate a production Album in R2;
- create Studio Album Management UI;
- migrate existing release covers to R2;
- migrate Neon Heartbreaks / Coal to Diamond / Love Letters from Saigon;
- convert Singles;
- make LaunchPAD rely exclusively on canonical Albums;
- remove the legacy `catalog.js` fallback;
- resume SonicTrace C3 / loudnorm investigation;
- create final PHASE UX checkpoint;
- start Phase 7.

## Next boundary

After source/CI/deployment validation of C2.5-C, the next roadmap slice is:

**C2.5-D — Studio Album Management + New Track integration.**

That UI will consume these guarded routes; it must not bypass Track Manager with direct R2 writes.
