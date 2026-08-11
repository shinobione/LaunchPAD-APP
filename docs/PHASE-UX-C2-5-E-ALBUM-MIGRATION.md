# PHASE UX · C2.5-E — Controlled historical Album migration

## Status

**E1 tooling candidate. Production migration has NOT started.**

Current production before this candidate:
- LaunchPAD public: Build 88;
- public Worker: v2.6;
- Track Manager: v5.17;
- Studio bridge: v1.9;
- canonical Albums in production: none at the beginning of C2.5-E;
- Studio: v0.11.2 / Build 34;
- Phase 7: NOT STARTED.

Candidate backend after merge/deploy, if separately authorized:
- Track Manager v5.18;
- Studio bridge v1.10;
- new management capability: `album-migration`.

## Migration scope

Only these historical release Albums belong to the C2.5-E canonical migration:

1. `neon-heartbreaks`
2. `coal-to-diamond`
3. `love-letters-from-saigon`

`Singles` is intentionally excluded. It remains a compatibility cache during C2.5-E and becomes a virtual collection only during the controlled C2.5-F public cutover.

## Authority model

The migration does not trust a stale hardcoded track list. Candidate membership is rebuilt from the current live R2 track manifests whose compatibility cache still points at the historical Album id.

The resulting canonical Album manifest becomes authoritative for ordered membership:

```text
albums/<album-id>/manifest.json
albums/<album-id>/cover/<filename>
```

Track manifests are not rewritten during a normal migration when their existing `album.id/title` compatibility cache is already correct.

## Dry-run contract

`GET /api/studio/albums` remains the Album read route and adds a `migration` section containing a read-only plan.

The dry-run records for each Album:
- current candidate tracks;
- current track status;
- current compatibility Album id/title;
- current sequence/order/position when present;
- existing canonical ownership conflicts;
- whether a canonical Album already exists;
- proposed order;
- whether artistic order needs explicit confirmation;
- blockers and warnings;
- an SHA-256 state token representing the relevant current canonical state.

The response explicitly states `writesPerformed: false`.

## Apply contract

Apply intentionally reuses the already protected Album collection write boundary:

`POST /api/studio/albums`

with intent:

`album-migration-apply-v1`

A migration requires all of the following:
- exact Album id from the immutable plan;
- exact typed confirmation `MIGRATE <album-id>`;
- exact current dry-run state token;
- explicit track list containing exactly the current candidates, no additions or omissions;
- explicit order confirmation if the live manifests do not prove a unique artistic order.

There is no batch migration endpoint and no `Migrate all` behavior.

## Cover migration

Historical cover sources are pinned to the immutable pre-E GitHub source SHA:

`35cfbff8cd9e06ef3548f8e909eb033a1c0a60bb`

The Worker accepts only the expected `raw.githubusercontent.com` URL prefix, HTTPS, supported image types, and a bounded payload. No mutable `main` URL is used for migration.

## Per-Album transaction

A successful apply performs, for one Album only:

1. reread current dry-run state;
2. verify state token and current track manifests;
3. snapshot the exact current `catalog/index.json` body;
4. fetch and store the pinned Album cover;
5. create the canonical published Album manifest with confirmed ordered `trackIds`;
6. rebuild the catalog projection;
7. reread the canonical Album;
8. run publish quality checks.

## Rollback

If publication, catalog rebuild, reread, or quality verification fails after mutation begins, the migration attempts to:
- remove the newly-created canonical Album manifest;
- remove the imported Album cover;
- restore the exact pre-migration catalog body.

The migration never exposes a general whole-Album delete route; deletion is only an internal rollback mechanism for an Album created by the same failed transaction.

## Regression coverage

The in-memory C2.5-E transaction test executes:
- immutable plan validation;
- read-only dry-run with zero R2 writes;
- stale-token rejection with zero write;
- successful one-Album migration;
- zero track-manifest churn;
- forced catalog failure;
- full manifest/cover/catalog rollback;
- `Singles` exclusion.

The final deployable bundle is separately wrapped and syntax-checked as Track Manager v5.18 / Studio bridge v1.10. The historical v5.17 assembler remains untouched to avoid reopening the source-part packaging regression fixed after C2.5-C.

## Deployment boundary

Merging E1 source is not migration.
Deploying Track Manager v5.18 is not migration.
Opening the Studio migration cockpit is not migration.

Production R2 mutation starts only when a user explicitly applies one reviewed Album dry-run.

## Remaining C2.5-E sequence

1. merge and deploy v5.18 / bridge v1.10 admin-only;
2. publish the Studio migration cockpit;
3. run and review a real production **dry-run only**;
4. explicitly authorize and migrate one Album;
5. verify canonical reread and LaunchPAD legacy fallback remains unchanged;
6. repeat one Album at a time;
7. leave Singles untouched;
8. close C2.5-E only after all three release Albums are canonically verified.

C2.5-F, C3 and Phase 7 remain locked throughout this process.
