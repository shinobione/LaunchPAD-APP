# SHINOBIWAN Studio — Phase 4B.2 Lyrics Write Audit

> Current application build: `2026.08.08.66` — release `studio-metadata-validation-20260808`.

Status: **read-only audit / no runtime change**  
Date: 2026-08-08

This document freezes the findings that must govern Phase 4B.2 before any lyrics-write route is implemented.

## Non-negotiable canonical rule

```text
canonical lyrics source = tracks/<slug>/lyrics.txt
timestamped lyrics.txt = synchronized
.lrc sidecar = optional compatibility/export only
```

Phase 4B.2 must not create a second mandatory lyrics source of truth.

## Existing Track Manager behavior

Track Manager already treats `lyrics` as a normal canonical asset kind, but its upload validator accepts **TXT only** for that kind.

Current `validateUploadFile()` contract:

```text
lyrics -> allowed extension: txt
```

A `.lrc` file is therefore not the canonical Track Manager asset format today.

The canonical catalog writer does not infer synchronization from the filename or extension. It:

1. reads `manifest.assets.lyrics`;
2. fetches that object from R2;
3. reads the lyrics text when it is within `MAX_LYRICS_BYTES`;
4. calls the existing timestamp parser;
5. sets `timestampsAvailable` from parsed timestamped segments.

Supported timestamp forms already include bracketed and naked timecodes such as:

```text
[00:02.486] lyric line
00:02.486 lyric line
```

Therefore synchronization is already content-derived in the canonical backend.

## Existing R2 layout

```text
tracks/<slug>/manifest.json
tracks/<slug>/lyrics.txt
```

`manifest.assets.lyrics` points to the canonical text asset.

## Existing LRC Maker behavior

The current SHINOBIWAN LRC Maker:

- accepts imported `.txt` and `.lrc` text files;
- parses the text into its internal LRC state;
- stringifies lyrics with timestamps back to text;
- deliberately strips/rejects parsed metadata tags from the exported editor text in the SHINOBIWAN fork;
- downloads a `text/plain;charset=UTF-8` text blob;
- preserves timestamp tags used by the lyrics engine.

This means LRC Maker can remain the advanced synchronization/editing engine without forcing the R2 canonical filename to become `.lrc`.

## Existing Studio behavior

Studio currently treats LRC Maker as an external lyrics engine only:

```text
lyricsService.mode = external-engine
```

The Lyrics workspace can already read canonical lyrics text and derive sync state from timestamp content, but it has no save client.

## Safe Phase 4B.2 rollout order

A compatibility-safe rollout should mirror the successful metadata rollout.

### 4B.2A — Studio capability awareness

Deploy a Studio build first that can tolerate a future bridge capability:

```json
{
  "write": ["metadata", "lyrics"]
}
```

but still exposes **no lyrics save client or CTA**.

This prevents a future truthful backend from forcing the existing Studio into `PUBLIC FALLBACK`.

### 4B.2B — Track Manager lyrics validation/update backend

Only after the compatibility build is live, add a dedicated backend contract.

Recommended bridge revision:

```text
Track Manager v5.12
Studio bridge v1.4
```

Recommended initial capability contract:

```json
{
  "read": ["tracks", "track"],
  "validate": ["metadata", "lyrics"],
  "write": ["metadata", "lyrics"]
}
```

The first backend scope should update **existing canonical `lyrics.txt` only**. Creating missing lyrics files can be a later subphase after update-in-place is production-proven.

### 4B.2C — Studio guarded lyrics editor/save

Only after the backend is deployed and Build 10/compatibility reads are confirmed should Studio expose the actual lyrics write UI.

## Proposed lyrics validation contract

Recommended endpoint:

```text
POST /api/studio/tracks/<trackId>/lyrics/validate
Content-Type: text/plain;charset=UTF-8
credentials: include
```

Recommended JSON-text body:

```json
{
  "intent": "lyrics-validate-v1",
  "expectedUpdatedAt": "<canonical manifest revision>",
  "expectedLyricsRevision": "<canonical lyrics object revision>",
  "text": "[00:02.486] ..."
}
```

Validation should be non-mutating and report at least:

- changed / no-change;
- byte size;
- line count;
- parsed timestamp segment count;
- `timestampsAvailable`;
- resulting Track Manager quality state;
- exact canonical revisions used for the preview.

## Proposed lyrics save contract

Recommended endpoint:

```text
POST /api/studio/tracks/<trackId>/lyrics/save
Content-Type: text/plain;charset=UTF-8
credentials: include
```

Recommended JSON-text body:

```json
{
  "intent": "lyrics-save-v1",
  "expectedUpdatedAt": "<validated manifest revision>",
  "expectedLyricsRevision": "<validated lyrics object revision>",
  "text": "[00:02.486] ..."
}
```

No multipart upload is needed for this dedicated Studio route.

## Concurrency guard

Lyrics should have a stronger guard than manifest `updatedAt` alone.

The private track projection should expose a lyrics object revision such as the R2 ETag (or another server-generated opaque revision).

A lyrics validate/save request should require both:

```text
expectedUpdatedAt
expectedLyricsRevision
```

This protects against:

- another metadata/Track Manager save changing the manifest;
- another lyrics operation changing `lyrics.txt`;
- stale Studio tabs attempting to overwrite newer synchronized lyrics.

A mismatch should return a dedicated `STALE_LYRICS` or `STALE_MANIFEST` response and require reload + revalidation.

## Text normalization

The backend should normalize only what is required for deterministic text storage:

- remove an initial UTF-8 BOM;
- normalize CRLF/CR line endings to LF;
- enforce the existing lyrics byte limit;
- reject invalid/empty payloads according to the chosen update policy.

It should **not** rewrite lyric wording, reorder lines, synthesize timestamps or inject LRC metadata tags.

## Initial write restriction

The safest first implementation should only save when:

```text
manifest.assets.lyrics === "lyrics.txt"
```

If a legacy/noncanonical filename is encountered, the Studio route should block and tell the user to use the existing Track Manager migration/fallback path rather than silently renaming/deleting assets.

Creation of a missing `lyrics.txt` should be a separate later subphase.

## Save transaction / rollback

A successful lyrics update needs more than an R2 `.put()`.

Recommended sequence:

1. verify Access + exact Studio origin;
2. verify intent and text size;
3. read canonical manifest;
4. verify `expectedUpdatedAt`;
5. read current `lyrics.txt` and object revision;
6. verify `expectedLyricsRevision`;
7. normalize proposed text;
8. preview timestamps/quality;
9. no-change returns without writes;
10. preserve the previous lyrics bytes + metadata for rollback;
11. write the new `lyrics.txt`;
12. update manifest `updatedAt` / `updatedBy` without changing unrelated metadata/assets;
13. write the manifest;
14. rebuild `catalog/index.json` so `timestampsAvailable` is current;
15. reread lyrics + manifest and verify revisions/content state;
16. return saved revisions;
17. Studio performs its own authenticated canonical reread.

If any step after the lyrics object write fails, backend should attempt to restore:

- previous `lyrics.txt` bytes/metadata;
- previous manifest;
- previous catalog projection via rebuild.

## Media / metadata isolation

A Phase 4B.2 lyrics module must not expose:

- audio writes;
- cover writes;
- thumbnail writes;
- video writes;
- track deletion;
- arbitrary metadata patching;
- standalone publish;
- standalone catalog rebuild.

It may update only the lyrics object and the minimum server-owned manifest revision fields required to make the change auditable.

## LRC Maker boundary

Do **not** modify LRC Maker just to make the first Studio lyrics save possible.

The initial safe architecture is:

```text
LRC Maker = advanced timestamp editor / text producer
Studio = canonical workspace + guarded save
Track Manager = protected canonical writer
R2 = source of truth
```

A later integration may pass track context or extract shared editing logic, but iframe embedding or a mandatory duplicate `.lrc` object is not part of Phase 4B.2.

## Production smoke-test recommendation

The first lyrics write should use an existing canonical `lyrics.txt` and a byte-level reversible change that does not alter lyric wording.

Preferred test candidate:

- add one harmless blank line between two existing timestamped lines;
- validate that timestamp segment count and sync state remain unchanged;
- save and verify canonical reread/catalog state;
- restore the original text through the same guarded flow;
- verify final lyrics bytes/state are clean.

Do not use deletion, filename migration, missing-lyrics creation or lyric wording changes for the first smoke test.

## Required rollback checkpoint

Current known-good checkpoint before Phase 4B.2 runtime work:

```text
safety/post-metadata-write-proven-20260808-1822
```

Create a new `pre-4b2` safety checkpoint immediately before the first Phase 4B.2 runtime branch if additional work occurs after this audit.

## Decision

The audit supports proceeding with Phase 4B.2.

The implementation must build on the existing canonical semantics rather than introducing `.lrc` persistence:

```text
lyrics.txt wins.
Timestamps define sync.
LRC Maker remains compatible.
Writes stay independently gated.
```
