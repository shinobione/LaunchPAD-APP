# SHINOBIWAN Studio — Metadata Write Contract

> Current application build: `2026.08.08.66` — release `studio-metadata-validation-20260808`.

Track Manager backend: **v5.11**  
Studio bridge: **v1.3**  
Phase: **4B.1B — metadata-only production write, production-proven**

## Purpose

Phase 4B.1B is the first production write capability consumed by SHINOBIWAN Studio while keeping LaunchPAD, Track Manager's existing UI, SonicTrace, LRC Maker and media assets independently safe.

This is a private Worker-only backend evolution. The public LaunchPAD application remains Build 66 and the public media Worker remains v2.6.

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
- whitelist-only metadata normalization;
- Track Manager quality inspection.

Bridge health contract:

```json
{
  "capabilities": {
    "read": ["tracks", "track"],
    "validate": ["metadata"],
    "write": ["metadata"]
  }
}
```

No other Studio write capability is advertised in v1.3.

## Allowed fields

Only this metadata whitelist may be patched:

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
2. parse the simple-request JSON-text body;
3. require `intent: metadata-save-v1`;
4. read the canonical R2 manifest;
5. compare `expectedUpdatedAt` with canonical `updatedAt`;
6. whitelist and normalize the metadata patch;
7. preserve slug, assets, migration and `createdAt`;
8. set fresh `updatedAt` + authenticated `updatedBy`;
9. inspect Track Manager quality against existing R2 objects;
10. block a published result if it is not publishable;
11. if no metadata field changed, return `saved: false` without writing;
12. write the new manifest;
13. rebuild `catalog/index.json`;
14. reread the canonical manifest and verify the saved revision;
15. return persisted revision + rebuilt-catalog metadata.

Studio then performs its own authenticated canonical GET reread before reporting the save as fully verified.

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

No manifest or catalog write occurs.

## Rollback protection

If the manifest was written but catalog rebuild or post-write verification fails, Track Manager attempts to:

1. restore the previous manifest;
2. rebuild the catalog from the restored manifest;
3. return `SAVE_ROLLBACK` with rollback status.

R2 is not transactional, so the rollback is compensating recovery rather than a storage transaction.

## Media isolation

`03e-studio-metadata-save.part` must not contain or invoke media mutation plumbing such as:

- direct media R2 `.put()`;
- `.delete()`;
- `FormData`;
- `saveTrack()` multipart handling;
- `saveThumbnail()`;
- `deleteTrack()`;
- asset removal controls.

It may use the canonical manifest/catalog helpers required by the metadata transaction.

The dedicated CI guard enforces this boundary.

## Existing Track Manager writes

All non-Studio metadata-validation/save writes keep the historical `enforceSameOrigin()` path.

The Studio exceptions are exactly:

```text
POST .../metadata/validate
POST .../metadata/save
```

No PUT, PATCH or DELETE Studio route exists in Phase 4B.1B.

## Production deployment

Source merge introducing v5.11:

```text
49728e908fcfaff3f6edf9cf3f9b7d2bb23ce8a3
```

Protected deployment workflow run:

```text
31264114407
```

Deployment target:

```text
admin
```

Private Worker Version ID:

```text
8bd802ec-0c2b-47ce-aebb-83f6190d5b73
```

The public Worker deploy steps were skipped and public Worker v2.6 remained unchanged.

## Production proof

The first real Studio metadata write was tested in the real browser on `soft-addiction` and then fully restored.

### Smoke write

- field: `keyConfidence` only;
- temporary value: `0.01`;
- validation showed exactly one changed field;
- canonical revision after save: `2026-08-08T16:21:15.503Z`;
- catalog rebuilt: yes;
- Studio canonical reread: verified;
- media objects: untouched.

### Restoration write

- `keyConfidence` restored to original empty/null state;
- validation again showed exactly one changed field;
- canonical revision after restoration: `2026-08-08T16:22:10.890Z`;
- catalog rebuilt: yes;
- Studio canonical reread: verified;
- final quality: `ready`;
- final publishable: `Yes`;
- final errors/warnings: `0 / 0`;
- media objects: untouched.

This write + restoration cycle is the production gate that closes Phase 4B.1B.

## Rollback references

Preferred current known-good checkpoint:

```text
safety/post-metadata-write-proven-20260808-1822
```

Earlier checkpoints remain available:

```text
safety/post-v5.11-pre-build9-20260808-1732
safety/pre-4b1b-metadata-write-20260808-1612
```

## Handoff to Phase 4B.2

The next capability must remain separate from metadata.

Frozen lyrics rule:

```text
canonical source = tracks/<slug>/lyrics.txt
timestamped lyrics.txt = synchronized
.lrc sidecar = optional compatibility/export only
```

See [`STUDIO-LYRICS-WRITE-AUDIT.md`](STUDIO-LYRICS-WRITE-AUDIT.md) before implementing any lyrics write.
