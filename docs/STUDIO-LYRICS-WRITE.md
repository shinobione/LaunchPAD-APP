# SHINOBIWAN Studio — Lyrics Write Contract

> Current application build: `2026.08.08.66` — release `studio-metadata-validation-20260808`.

Track Manager backend target: **v5.12**  
Studio bridge target: **v1.4**  
Phase: **4B.2B — guarded canonical lyrics backend**

## Scope

This is a private Worker-only backend evolution. Public LaunchPAD stays Build 66, public media Worker stays v2.6, Studio stays 0.5.2 Build 11, SonicTrace is unchanged and LRC Maker is unchanged.

The canonical rule remains:

```text
tracks/<slug>/lyrics.txt = source of truth
timestamps inside lyrics.txt = synchronized lyrics
.lrc sidecar = optional compatibility/export only
```

## Bridge v1.4 capabilities

```json
{
  "read": ["tracks", "track", "lyrics"],
  "validate": ["metadata", "lyrics"],
  "write": ["metadata", "lyrics"]
}
```

Studio Build 11 is compatibility-ready for this truthful capability advertisement but still exposes no lyrics-save client.

## Endpoints

```text
GET  /api/studio/tracks/<trackId>/lyrics
POST /api/studio/tracks/<trackId>/lyrics/validate
POST /api/studio/tracks/<trackId>/lyrics/save
```

All three routes remain behind Cloudflare Access JWT verification and exact Studio origin `https://shinobione.github.io`.

### Canonical lyrics read

The GET projection returns:

- canonical filename;
- UTF-8 lyrics text;
- opaque R2 ETag as `lyricsEtag`;
- manifest `updatedAt`;
- byte size;
- timestamp availability/count;
- parsed segment count;
- lyrics-specific quality summary.

It only succeeds for an existing canonical `manifest.assets.lyrics === "lyrics.txt"` object.

## Validation request

```text
POST /api/studio/tracks/<trackId>/lyrics/validate
Content-Type: text/plain;charset=UTF-8
credentials: include
```

JSON-text body:

```json
{
  "intent": "lyrics-validate-v1",
  "expectedUpdatedAt": "<manifest revision>",
  "expectedLyricsEtag": "<opaque R2 ETag>",
  "lyrics": "[00:02.486] ..."
}
```

Validation is non-mutating.

It:

1. requires an existing canonical `lyrics.txt`;
2. requires both manifest and lyrics-object revisions;
3. normalizes only BOM + CRLF/CR to LF;
4. enforces the existing 1 MiB lyrics limit;
5. parses the same bracketed/naked timestamp forms used by Track Manager;
6. detects empty lyrics, out-of-order timestamps and timestamps beyond declared audio duration;
7. reports changed/no-change, bytes, timestamp count, segment count and quality;
8. performs no R2 put/delete, manifest write or catalog rebuild.

Stale responses:

```text
409 STALE_MANIFEST
409 STALE_LYRICS
```

## Save request

```text
POST /api/studio/tracks/<trackId>/lyrics/save
Content-Type: text/plain;charset=UTF-8
credentials: include
```

JSON-text body:

```json
{
  "intent": "lyrics-save-v1",
  "expectedUpdatedAt": "<validated manifest revision>",
  "expectedLyricsEtag": "<validated R2 ETag>",
  "lyrics": "[00:02.486] ..."
}
```

The save route repeats the same stale and quality checks server-side.

### No-change path

If normalized lyrics text is byte-for-byte identical to the canonical text:

- `saved: false`;
- `noChange: true`;
- no R2 write;
- no manifest write;
- no catalog rebuild.

### Changed path

A real update performs:

1. preserve previous lyrics bytes + HTTP/custom metadata for rollback;
2. replace exactly `tracks/<slug>/lyrics.txt`;
3. set text MIME metadata and short cache freshness for mutable lyrics;
4. update only server-owned manifest `updatedAt` + `updatedBy` while preserving all metadata and asset references;
5. write the manifest;
6. rebuild `catalog/index.json` so `timestampsAvailable` is current;
7. reread manifest + lyrics object;
8. verify manifest revision, stored text and a changed R2 ETag;
9. return the new manifest/lyrics revisions and catalog rebuild metadata.

## Quality gate

Lyrics save is blocked with `409 QUALITY_BLOCKED` if the proposed text is invalid according to the guarded lyrics checks.

Unsynchronized but non-empty lyrics remain valid: lack of timestamps is informational, matching the existing LaunchPAD/Track Manager semantics.

## Initial write restriction

Phase 4B.2B deliberately refuses:

- missing lyrics creation;
- noncanonical lyrics filenames;
- `.lrc` persistence;
- asset renaming;
- arbitrary metadata edits.

Dedicated responses include:

```text
LYRICS_MISSING
LYRICS_NON_CANONICAL
LYRICS_R2_MISSING
LYRICS_TOO_LARGE
```

## Rollback

If anything fails after the canonical lyrics object write, Track Manager attempts to restore:

1. previous `lyrics.txt` bytes + object metadata;
2. previous manifest when it had been written;
3. canonical catalog projection by rebuilding from the restored state.

Failure response:

```text
SAVE_ROLLBACK
```

with rollback flags:

```json
{
  "lyricsRestored": true,
  "manifestRestored": true,
  "catalogRestored": true
}
```

R2 is not transactional, so this is compensating rollback rather than a database transaction.

## Isolation guarantees

The dedicated lyrics module contains no:

- `.delete()`;
- audio write;
- cover write;
- thumbnail write;
- video write;
- multipart/FormData plumbing;
- track deletion;
- publish shortcut;
- arbitrary metadata patch API.

Its two R2 `put()` occurrences are intentionally limited to the same canonical lyrics key: the real lyrics update and its rollback restore.

Every unrelated Track Manager POST/PUT/PATCH/DELETE continues through the historical same-origin guard.

## Deployment order

1. Studio 0.5.2 Build 11 compatibility prep live and `PRIVATE READ` against v5.11/v1.3;
2. merge v5.12/v1.4 backend source after CI;
3. deploy **admin Worker only**;
4. verify Cloudflare Access protection remains active;
5. verify `/api/studio/health` reports v5.12/v1.4 and exactly metadata+lyrics capabilities;
6. verify existing Studio Build 11 remains private-read compatible;
7. stop. Do not open Studio lyrics-write UI in this phase.

## Rollback references

```text
safety/pre-4b2-lyrics-write-20260808-1837
safety/post-metadata-write-proven-20260808-1822
```

The first is the immediate pre-v5.12 checkpoint. The second is the last production-proven metadata write/restoration checkpoint.
