# SHINOBIWAN Studio — Metadata Write Contract

> Current application build: `2026.08.08.66` — release `studio-metadata-validation-20260808`.

Track Manager backend target: **v5.11**  
Studio bridge target: **v1.3**  
Phase: **4B.1B — first metadata-only production write**

## Purpose

Phase 4B.1B adds the first production write capability consumed by SHINOBIWAN Studio while keeping LaunchPAD, Track Manager's existing UI, SonicTrace, LRC Maker and media assets independently safe.

This is a Worker-only backend evolution. The public LaunchPAD application remains Build 66 and the public media Worker remains v2.6.

## Endpoint

```text
POST /api/studio/tracks/<trackId>/metadata/save
```

The route is protected by:

- Cloudflare Access JWT verification;
- exact browser origin `https://shinobione.github.io`;
- `Content-Type: text/plain` simple-request transport;
- exact body intent `metadata-save-v1`;
- canonical `expectedUpdatedAt` optimistic-concurrency guard;
- the same whitelist-only metadata patch normalizer used by validation.

The bridge health contract advances to:

```json
{
  "capabilities": {
    "read": ["tracks", "track"],
    "validate": ["metadata"],
    "write": ["metadata"]
  }
}
```

No other Studio write capability is advertised.

## Allowed fields

Only the existing metadata whitelist may be patched:

- title;
- status;
- type;
- year;
- releaseDate;
- album;
- genres;
- tags;
- moods;
- themes;
- era;
- energy;
- languages;
- bpm;
- key;
- keyConfidence;
- explicit;
- accent;
- accent2.

The route does **not** accept slug replacement, assets, duration, migration/provenance fields or server-owned timestamps.

## Save sequence

The backend performs the write in this order:

1. verify Access + exact Studio origin;
2. parse the simple-request JSON text body;
3. require `intent: metadata-save-v1`;
4. read the canonical R2 manifest;
5. compare `expectedUpdatedAt` with canonical `updatedAt`;
6. whitelist and normalize the metadata patch;
7. preserve slug, assets, migration and `createdAt`;
8. set fresh `updatedAt` + authenticated `updatedBy`;
9. inspect Track Manager quality against existing R2 objects;
10. block a published result if it is not publishable;
11. if no metadata field changed, return `saved: false` without writing anything;
12. write the new manifest;
13. rebuild `catalog/index.json`;
14. reread the canonical manifest and verify the saved revision;
15. return the persisted revision and rebuilt-catalog metadata.

## Stale protection

If the track changed since the Studio workspace loaded:

```text
HTTP 409
code: STALE_MANIFEST
```

The route does not merge stale edits and does not overwrite the newer manifest.

## Quality protection

A proposal that would remain `published` must pass Track Manager quality inspection before persistence.

If not:

```text
HTTP 409
code: QUALITY_BLOCKED
```

No manifest or catalog write occurs in that case.

## Rollback protection

The metadata save endpoint is the first Studio write route and therefore includes its own compensating rollback.

If the manifest was written but catalog rebuild or post-write verification fails, Track Manager attempts to:

1. restore the previous manifest;
2. rebuild the catalog from that restored manifest;
3. return `SAVE_ROLLBACK` with rollback status.

This does not make R2 transactional, but it prevents a routine catalog-rebuild failure from silently leaving the new manifest and old public catalog out of sync.

## Media isolation

`03e-studio-metadata-save.part` must not contain or invoke:

- direct R2 `.put()` for media;
- `.delete()`;
- `FormData`;
- `saveTrack()` multipart handling;
- `saveThumbnail()`;
- `deleteTrack()`;
- asset removal controls.

It may use the canonical manifest/catalog helpers only:

```text
readManifest
normalizeStudioMetadataPatch
normalizeManifest
inspectTrackQuality
writeManifest
writeCatalogIndex
```

The dedicated CI guard enforces this boundary.

## Existing Track Manager writes

All non-Studio metadata-validation/save writes keep the historical `enforceSameOrigin()` path.

The Studio exceptions are exactly:

```text
POST .../metadata/validate
POST .../metadata/save
```

No PUT, PATCH or DELETE Studio route is introduced in Phase 4B.1B.

## Deployment order

The rollout is deliberately split to avoid incompatible states:

1. Studio 0.4.3 Build 8 is deployed first and recognizes only the future `metadata` write capability without using it;
2. Track Manager v5.11 / bridge v1.3 is validated, merged and deployed **admin-only**;
3. PRIVATE READ is checked again in a real browser;
4. only then may the next Studio build expose the actual Save metadata client/UI.

## Deployment safety

Deploying the v5.11 Worker code does not itself invoke `/metadata/save` and therefore does not modify a manifest, `catalog/index.json` or media.

The production deployment must use:

```text
target: admin
confirm: DEPLOY
```

Do not choose `both` for this backend-only change.

## Rollback references

Fresh pre-write safety snapshots:

```text
LaunchPAD / Track Manager: safety/pre-4b1b-metadata-write-20260808-1612
Studio:                    safety/pre-4b1b-metadata-write-20260808-1612
```

If v5.11 regresses the existing Track Manager, stop the Studio write rollout and redeploy the known-good private/admin Worker from the pre-4B.1B snapshot or normal PR revert. Media rollback is not expected because this endpoint never changes media objects.
