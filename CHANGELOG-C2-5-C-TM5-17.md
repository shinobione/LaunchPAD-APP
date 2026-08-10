# C2.5-C · Track Manager 5.17 / Studio bridge 1.9

Public LaunchPAD remains `2026.08.10.88` / `shinobi-launchpad-v88` because this slice is backend-only.

## Candidate scope

C2.5-C introduces the first **production-capable but currently undeployed** canonical Album mutation surface behind the private Track Manager / Studio bridge.

### Added

- Track Manager candidate `v5.17`.
- Studio bridge candidate `v1.9`.
- Protected canonical Album list/read routes for Studio.
- Guarded Album draft creation with immutable canonical Album ID.
- Strict Album metadata validation; invalid type/status/year/date/color values are rejected instead of silently coerced.
- Guarded Album metadata save with `expectedUpdatedAt` stale protection.
- Ordered `album.trackIds` membership save.
- Cross-Album move/reorder with source and target revision guards.
- Conflict protection preventing one track from belonging to two canonical Albums.
- Pure reordering does not churn track manifest revisions when the compatibility cache is already correct.
- Compatibility-cache updates for track manifests while canonical `album.trackIds` remains the intended authority.
- Album cover / thumbnail upload and delete with R2 backup, canonical reread and rollback.
- Published-Album quality guards for title, cover, non-empty tracklist, valid track refs and published member tracks.
- `catalog/index.json` rebuild after successful canonical Album mutations.
- Static regression guards plus an in-memory transaction smoke covering draft create, stale no-write, ownership conflict, reorder stability, cross-Album move and rollback after catalog failure.

## Deliberately not included

- No whole-Album delete route.
- No Studio Album-management UI yet (C2.5-D).
- No migration of Neon Heartbreaks, Coal to Diamond or Love Letters from Saigon (C2.5-E).
- No conversion of `Singles` to the future virtual collection.
- No public LaunchPAD canonical Album cutover (C2.5-F).
- No C3 SonicTrace / FFmpeg loudnorm work.
- No Phase 7 work.

## Production safety state

At this candidate checkpoint:

- **no Cloudflare Worker is deployed by this change;**
- **no production R2 Album object is created or mutated;**
- the deployed private backend remains Track Manager `v5.16` / bridge `v1.8` until a separate explicit admin-only deployment decision;
- public Worker `v2.6` remains unchanged;
- public LaunchPAD remains Build 88;
- final PHASE UX checkpoint remains **NOT CREATED**.
