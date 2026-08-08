# SHINOBIWAN Studio — integration contract

> Phase 0 architecture freeze — 2026-08-08
>
> Status: **frozen for the Studio MVP foundation**. This document defines the shared identity, data ownership and integration boundaries for LaunchPAD, Track Manager, SonicTrace and LRC Maker before the `shinobiwan-studio` repository is created.

## 1. Product boundary

SHINOBIWAN Studio is the private, track-centric orchestration UI.

- **LaunchPAD** remains the public listening product.
- **LaunchPAD / Cloudflare R2** remains the canonical production catalog and media store.
- **Track Manager Worker** remains the write/admin backend during migration.
- **SonicTrace** remains the audio-intelligence engine. It computes results but must not create a second authoritative music catalog.
- **LRC Maker** remains the lyrics synchronization engine during the first integration stages.
- **SHINOBIWAN Studio** becomes the cockpit that selects one track once and reuses that context across metadata, assets, audio intelligence, lyrics and publishing.

The Studio is not a fourth catalog. It is a projection and orchestration layer over the existing sources of truth.

## 2. Canonical track identity

### Decision

The canonical `trackId` is the existing R2/manifest **slug**.

```text
trackId === manifest.slug === R2 track directory name === public API slug
```

Example:

```text
trackId = ghost-signal
manifest = tracks/ghost-signal/manifest.json
public API = /tracks/ghost-signal
```

LaunchPAD already maps remote tracks with `id: item.slug`, so introducing a second identifier would create avoidable reconciliation work.

### Identity rules

1. `trackId` is lower-case ASCII kebab-case and follows the existing Track Manager slug rule.
2. `trackId` is **stable and immutable after creation** for normal edits.
3. `title` is mutable and must never be used as identity.
4. Changing a slug is a migration operation, not a normal metadata edit.
5. SonicTrace, LRC and Studio must receive or derive the existing `trackId`; they must not mint independent IDs for the same track.
6. Version/master identifiers are subordinate to the canonical trackId.

## 3. Current canonical manifest contract

The current Track Manager normalizes manifests to schema version 1 with these fields:

```text
schemaVersion
slug
title
status
type
year
releaseDate
album.id
album.title
genres[]
tags[]
moods[]
themes[]
era
energy
languages[]
bpm
key
keyConfidence
explicit
duration
accent
accent2
assets.audio
assets.cover
assets.thumbnail
assets.lyrics
assets.video
migration
createdAt
updatedAt
updatedBy
```

Current canonical R2 layout:

```text
catalog/index.json
tracks/<trackId>/manifest.json
tracks/<trackId>/audio.<ext>
tracks/<trackId>/cover.<ext>
tracks/<trackId>/thumbnail.<ext>
tracks/<trackId>/lyrics.txt
tracks/<trackId>/video.<ext>
```

### Important compatibility rule

Do **not** add Studio/SonicTrace fields directly to manifest schema v1 yet. The current `normalizeManifest()` rebuilds a fixed object and therefore unknown fields would be discarded on the next Track Manager save.

Phase 0 therefore freezes new integration data as **R2 sidecars** until a deliberate manifest schema migration is implemented.

## 4. StudioTrack contract

`StudioTrack` is a normalized view model, not a new stored record.

Minimum logical shape:

```json
{
  "id": "ghost-signal",
  "title": "Ghost Signal",
  "status": "published",
  "type": "single",
  "year": 2026,
  "releaseDate": null,
  "album": { "id": "singles", "title": "Singles" },
  "genres": [],
  "tags": [],
  "moods": [],
  "themes": [],
  "era": null,
  "energy": null,
  "languages": [],
  "bpm": null,
  "key": null,
  "keyConfidence": null,
  "explicit": null,
  "duration": null,
  "accent": null,
  "accent2": null,
  "assets": {
    "audio": null,
    "cover": null,
    "thumbnail": null,
    "video": null,
    "lyricsTxt": null,
    "lyricsLrc": null
  },
  "audioIntelligence": {
    "available": false,
    "outdated": false,
    "latestAnalysisId": null
  },
  "publishing": {
    "catalogVisible": false,
    "publishable": null
  },
  "createdAt": null,
  "updatedAt": null
}
```

### Projection rules

- `StudioTrack.id` = `manifest.slug`.
- Current `manifest.assets.lyrics` maps to `StudioTrack.assets.lyricsTxt`.
- `lyricsLrc` is derived from the future LRC sidecar.
- SonicTrace availability is derived from SonicTrace sidecars, not guessed from DSP fields in the public manifest.
- Public Catalog data may populate the initial list, but the private manifest remains the richer admin source when available.

## 5. Lyrics storage contract

### Decision

Keep the existing plain-text lyrics path intact and add LRC as a distinct sidecar.

```text
tracks/<trackId>/lyrics.txt
tracks/<trackId>/lyrics.lrc
```

Reasons:

- plain TXT and synchronized LRC are different authoring states;
- LaunchPAD currently understands `assets.lyrics` as the existing text asset;
- replacing TXT with LRC would blur backward compatibility;
- separate files let Content Health report `Lyrics TXT` and `Lyrics LRC` independently.

### LRC format

- UTF-8 text.
- Standard bracketed timestamps such as `[01:23.45]Line`.
- Multiple timestamp tags on one line remain legal.
- Metadata tags may be parsed but SHINOBIWAN Studio/LRC Maker should continue to prefer lyrics-only output unless a future contract explicitly requires metadata.
- Maximum target size: 1 MiB, matching the current lyrics safety budget.

### Manifest compatibility

For the MVP, `lyrics.lrc` is discovered as a sidecar. It is **not** inserted into `manifest.assets` until a schema migration is deliberately versioned.

## 6. SonicTrace persistence contract

### Ownership rule

SonicTrace computes analysis. R2 stores the catalog-linked analysis. The SonicTrace backend must not become an independent authoritative track database.

### R2 sidecars

Freeze the following structure:

```text
tracks/<trackId>/analysis/sonictrace/latest.json
tracks/<trackId>/analysis/sonictrace/history/<analysisId>.json
```

`latest.json` is the fast Studio read path.

History is append-only from the Studio/Track Manager point of view, except for explicit maintenance cleanup.

The analyzed audio file itself is **not** copied into the analysis directory.

## 7. SonicTraceAnalysis contract

Minimum envelope:

```json
{
  "schemaVersion": 1,
  "analysisId": "unique-analysis-id",
  "trackId": "ghost-signal",
  "sourceFingerprint": {
    "kind": "r2-revision",
    "value": "stable-source-revision",
    "sizeBytes": null
  },
  "analyzedAt": "2026-08-08T00:00:00.000Z",
  "engine": {
    "apiSchema": "2.2",
    "appVersion": null,
    "nodeName": null,
    "nodeRole": null
  },
  "browserDsp": null,
  "mastering": null,
  "neural": null,
  "anatomy": null,
  "fusion": null,
  "stemsSummary": null,
  "semanticSummary": null,
  "provenance": {},
  "warnings": []
}
```

### Neural payload to retain

The current SonicTrace CLAP layer already provides data worth preserving:

```text
engine.model
engine.model_family
engine.device / device_name
engine.torch_version
engine.cuda_runtime
engine.segment_count
engine.segment_seconds
engine.segment_offsets_seconds
engine.gpu_memory_allocated_mb
engine.gpu_memory_reserved_mb
genres[]
moods[]
instruments[]
traits.electronic
traits.vocal
traits.energy
traits.brightness
traits.danceability
traits.aggression
traits.space
embedding.model
embedding.dimension
embedding.vector[]
provenance
```

The embedding is currently generated from the normalized mean of representative CLAP audio segments and should remain stored with the model identifier and dimension.

### Required persistence principles

1. Preserve provenance (`measured`, `neural`, `estimated`, etc.) whenever supplied.
2. Preserve model/engine version information so old analyses can be recognized.
3. Preserve warnings instead of silently dropping partial-layer failures.
4. Do not present relative zero-shot CLAP scores as absolute probabilities or DSP measurements.
5. A new analysis may become `latest`, while the previous snapshot remains available in history.

## 8. Detecting outdated SonicTrace analysis

Studio must be able to say `analysis outdated` when the source audio changes.

### Decision

Each saved analysis stores a `sourceFingerprint` tied to the R2 audio revision.

The exact fingerprint implementation may be introduced in Phase 4/5, but it must satisfy:

- changes when the canonical audio object changes;
- stable when unrelated metadata/cover/lyrics changes;
- does not require storing a second WAV;
- intended for revision invalidation, not as a security signature.

Preferred implementation order:

1. R2 object revision/ETag + size exposed by the private API;
2. optional SHA-256 if later useful and cheap enough.

If the current audio fingerprint differs from `latest.json.sourceFingerprint`, Studio sets:

```text
audioIntelligence.outdated = true
```

## 9. Current LaunchPAD public read API

Current public Worker contract relevant to Studio MVP:

```text
GET/HEAD /health
GET/HEAD /tracks
GET/HEAD /tracks/{trackId}
GET/HEAD /media/{trackId}/{cover|thumbnail|audio|video|lyrics}/{filename}
OPTIONS ...
```

Important characteristics:

- public, read-only;
- CORS enabled;
- `/tracks` is suitable for the initial Studio catalog list;
- `/tracks/{trackId}` can include lyrics payload;
- only published tracks are exposed.

Therefore Phase 2 can be completed without touching production write behavior.

## 10. Current Track Manager private API

Current routes discovered in the private Worker source:

```text
GET    /health
GET    /api/tracks
GET    /api/tracks/{trackId}
PUT    /api/tracks/{trackId}
DELETE /api/tracks/{trackId}
GET    /api/media/{trackId}/{cover|thumbnail|audio|video|lyrics}
PUT    /api/tracks/{trackId}/thumbnail
POST   /api/catalog/rebuild
GET    /api/migration-plan
POST   /api/import/github/{trackId}
POST   /api/import/legacy/{trackId}
POST   /api/import/legacy
```

`PUT /api/tracks/{trackId}` already supports multipart metadata plus replacement/removal of the existing five asset kinds.

### Missing private API capabilities required later by Studio

Do not implement them during Phase 0, but reserve these responsibilities:

```text
GET/PUT    /api/tracks/{trackId}/lyrics/lrc
GET        /api/tracks/{trackId}/analysis/sonictrace
POST       /api/tracks/{trackId}/analysis/sonictrace
GET        /api/tracks/{trackId}/analysis/sonictrace/history
GET        /api/tracks/{trackId}/revision
```

Exact URLs may be refined before Phase 4 code lands, but the ownership is frozen: these operations belong on the private catalog/admin side, not in the public Worker.

## 11. Track Manager security constraint discovered during audit

Current private Worker write operations enforce:

```text
Origin == private Worker origin
```

This is intentionally stricter than ordinary CORS and means a future UI hosted at:

```text
https://shinobione.github.io/shinobiwan-studio/
```

cannot directly perform current `PUT/POST/DELETE` operations from JavaScript without a deliberate security change.

### Frozen consequence

- Phase 1–3 Studio remain non-destructive/read-only where possible.
- Do **not** weaken this rule casually just to make fetch calls work.
- Phase 4 must introduce a reviewed browser-to-private-API strategy with exact-origin allowlisting and Cloudflare Access behavior tested in real browsers.
- No permanent service token or secret may ever be embedded in GitHub Pages.
- The legacy Track Manager remains the write fallback until this is proven.

This is a known dependency, not a blocker for the read-only MVP foundation.

## 12. Current SonicTrace local API

Coordinator capabilities currently exposed include:

```text
GET  /api/live
GET  /api/health
GET  /api/diagnostics
GET  /api/cluster
GET  /api/neural/status
GET  /api/stems/status
GET  /api/anatomy/status
GET  /api/fusion/status
GET  /api/route/{task}
POST /api/analyze
POST /api/anatomy
POST /api/stems
POST /api/stems/analyze
POST /api/fusion
```

The lightweight health response currently advertises V2-E Catalog as not implemented.

SonicTrace already permits the GitHub Pages origin `https://shinobione.github.io` by default, so a Studio page on the same origin can be integrated later without inventing a second public GPU service.

### Studio integration rule

For the first Studio integration, the Studio may wrap an existing SonicTrace response inside `SonicTraceAnalysis` and attach `trackId` itself. SonicTrace does not need to know about R2 in order to analyze a file.

This keeps the audio engine independent from catalog credentials.

## 13. Data ownership matrix

| Data | Canonical owner | Reader(s) | Writer |
|---|---|---|---|
| Track identity / slug | R2 manifest | LaunchPAD, Studio, SonicTrace context, LRC context | Track Manager/admin API |
| Metadata | R2 manifest | LaunchPAD, Studio | Track Manager/admin API |
| Audio / cover / video | R2 | LaunchPAD, Studio, SonicTrace input | Track Manager/admin API |
| Lyrics TXT | R2 `lyrics.txt` | LaunchPAD, Studio, LRC Maker | Track Manager/admin API |
| Lyrics LRC | R2 `lyrics.lrc` sidecar | Studio, later LaunchPAD/LRC Maker | private admin API |
| SonicTrace latest | R2 analysis sidecar | Studio | private admin API after SonicTrace compute |
| SonicTrace history | R2 analysis sidecars | Studio | private admin API |
| GPU temp upload | SonicTrace temp storage only | SonicTrace | auto-created and deleted |
| Public catalog index | R2 derived artifact | LaunchPAD, Studio Phase 2 | Track Manager catalog rebuild |

## 14. MVP Content Health contract

Content Health is **completeness only**, never artistic quality.

Initial weights remain:

```text
Audio              15
Cover              10
Metadata           15
Lyrics TXT         10
Lyrics LRC         10
SonicTrace         20
Canvas / Video     10
Publication        10
TOTAL              100
```

Rules must be deterministic and explainable. Missing SonicTrace because the local GPU is offline is still missing content, but GPU availability itself must not lower the score.

## 15. Version/master rule

The canonical `trackId` identifies the musical catalog entry. A different master/version must not silently overwrite analysis provenance.

Until a dedicated versions model is implemented, SonicTrace analysis must at minimum preserve a source fingerprint. Future subordinate version IDs may use a shape such as:

```text
<trackId>:<versionId>
```

but `versionId` must never replace the canonical `trackId`.

## 16. Phase gates

### Phase 0 complete when

- [x] canonical trackId selected;
- [x] slug/manifest/catalog/LaunchPAD identity mapping verified;
- [x] `StudioTrack` minimum contract defined;
- [x] `SonicTraceAnalysis` minimum contract defined;
- [x] SonicTrace retained/not-retained policy defined;
- [x] LRC storage path and format defined;
- [x] analysis versioning/history policy defined;
- [x] current Track Manager API mapped;
- [x] current SonicTrace API mapped;
- [x] private write-origin constraint documented.

### Phase 1 may begin after this contract lands

Phase 1 creates `shinobiwan-studio` and its GitHub Pages shell. It must not change production catalog data.

## 17. Non-negotiable rules carried forward

1. LaunchPAD = public product.
2. Studio = private cockpit.
3. R2 = canonical catalog/media/Studio persistence.
4. SonicTrace = audio intelligence engine, not a competing catalog.
5. LRC Maker = lyrics engine during migration.
6. `trackId` = immutable canonical slug.
7. No duplicate WAV storage for Catalog Intelligence.
8. No browser secret in GitHub Pages.
9. No destructive Track Manager replacement before Studio write flows are proven.
10. Integrate progressively; do not copy/paste three applications into one monorepo.
