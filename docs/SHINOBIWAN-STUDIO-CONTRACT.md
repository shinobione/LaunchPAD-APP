# SHINOBIWAN Studio — integration contract

> Phase 0 architecture freeze — 2026-08-08  
> LaunchPAD reference build: `2026.08.08.64`  
> LaunchPAD reference release: `sonictrace-badge-fix-20260808`

Status: **frozen for the Studio MVP foundation**. This contract defines the shared identity, data ownership and integration boundaries for LaunchPAD, Track Manager, SonicTrace and LRC Maker before the `shinobiwan-studio` repository is created.

## 1. Product boundary

SHINOBIWAN Studio is the private, track-centric orchestration UI.

- **LaunchPAD** remains the public listening product.
- **LaunchPAD / Cloudflare R2** remains the canonical production catalog and media store.
- **Track Manager Worker** remains the write/admin backend during migration.
- **SonicTrace** remains the audio-intelligence engine. It computes results but does not own a competing music catalog.
- **LRC Maker** remains the lyrics synchronization engine during the first integration stages.
- **SHINOBIWAN Studio** selects one track once and reuses that context across metadata, assets, audio intelligence, lyrics and publishing.

The Studio is a projection/orchestration layer, **not a fourth catalog**.

## 2. Canonical track identity

### Frozen decision

The canonical `trackId` is the existing R2/manifest **slug**.

```text
trackId === manifest.slug === R2 track directory === public API slug
```

Example:

```text
trackId = ghost-signal
manifest = tracks/ghost-signal/manifest.json
public API = /tracks/ghost-signal
```

LaunchPAD already converts remote tracks with `id: item.slug`, so introducing another identifier would create unnecessary reconciliation.

### Identity rules

1. `trackId` uses the existing lower-case ASCII kebab-case Track Manager slug rule.
2. `trackId` is stable and immutable after creation for normal edits.
3. `title` is mutable and never serves as identity.
4. Renaming a slug is a migration operation, not a metadata edit.
5. SonicTrace, LRC Maker and Studio reuse the same `trackId`; none may mint a competing track ID.
6. Version/master identifiers remain subordinate to the canonical `trackId`.

## 3. Existing canonical manifest

Current Track Manager manifest schema v1 contains:

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

### Compatibility rule

Do **not** write Studio/SonicTrace-specific fields into manifest schema v1 yet. The current `normalizeManifest()` reconstructs a fixed object, so unknown fields would be discarded on a future Track Manager save.

New Studio integration data therefore uses **R2 sidecars** until an explicit manifest schema migration is designed.

## 4. `StudioTrack` contract

`StudioTrack` is a normalized view model, not a new persisted source of truth.

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

Projection rules:

- `StudioTrack.id = manifest.slug`.
- Current `manifest.assets.lyrics` maps to `StudioTrack.assets.lyricsTxt`.
- `lyricsLrc` is derived from the dedicated LRC sidecar.
- SonicTrace availability is derived from SonicTrace sidecars.
- Public catalog data may populate the initial list; the private manifest remains the richer admin source when accessible.

## 5. Lyrics storage

Keep plain text and synchronized lyrics as two distinct authoring states:

```text
tracks/<trackId>/lyrics.txt
tracks/<trackId>/lyrics.lrc
```

### LRC contract

- UTF-8 text.
- Standard bracketed timestamps, e.g. `[01:23.45]Line`.
- Multiple timestamp tags on a line remain valid.
- SHINOBIWAN output remains lyrics-first; metadata tags are not required.
- Target maximum size: 1 MiB, aligned with the current lyrics safety limit.

For the MVP, `lyrics.lrc` is a discovered sidecar and is **not** inserted into `manifest.assets` until a versioned schema migration exists.

## 6. SonicTrace persistence

### Ownership

SonicTrace computes analysis. R2 stores catalog-linked analysis. SonicTrace must not become an independent authoritative track database.

### R2 layout

```text
tracks/<trackId>/analysis/sonictrace/latest.json
tracks/<trackId>/analysis/sonictrace/history/<analysisId>.json
```

Rules:

- `latest.json` is the fast Studio read path.
- history is append-only except explicit maintenance cleanup.
- the analyzed WAV/MP3 is **not duplicated** in the analysis directory.

## 7. `SonicTraceAnalysis` contract

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

### Neural fields worth retaining

Current SonicTrace CLAP analysis already exposes:

```text
engine.model
engine.model_family
engine.device
engine.device_name
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

The embedding is the normalized mean of representative CLAP audio segments and must remain paired with its model ID and dimension.

Persistence principles:

1. Preserve provenance (`measured`, `neural`, `estimated`, etc.).
2. Preserve model/engine versions.
3. Preserve warnings and partial-layer failures.
4. Do not present relative CLAP zero-shot scores as objective DSP measurements or absolute probabilities.
5. Saving a new `latest` analysis does not erase history.

## 8. Outdated-analysis detection

Studio must detect when the canonical audio changed after the latest SonicTrace scan.

Each saved analysis therefore stores a `sourceFingerprint` tied only to the R2 audio revision.

Requirements:

- changes when the canonical audio object changes;
- stays stable when only metadata, cover, video or lyrics change;
- does not require duplicate WAV storage;
- used for revision invalidation, not as a security signature.

Preferred implementation order:

1. R2 object revision/ETag + size exposed by the private API;
2. optional SHA-256 later if useful.

If the current source fingerprint differs from `latest.json.sourceFingerprint`:

```text
audioIntelligence.outdated = true
```

## 9. Current LaunchPAD public read API

Relevant existing routes:

```text
GET/HEAD /health
GET/HEAD /tracks
GET/HEAD /tracks/{trackId}
GET/HEAD /media/{trackId}/{cover|thumbnail|audio|video|lyrics}/{filename}
OPTIONS ...
```

Properties:

- public and read-only;
- CORS enabled;
- `/tracks` is suitable for the Studio Phase 2 catalog list;
- `/tracks/{trackId}` can include lyrics data;
- only published tracks are exposed.

Therefore the first Studio catalog can be implemented without changing production write behavior.

## 10. Current Track Manager private API

Routes discovered in the private Worker source:

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

`PUT /api/tracks/{trackId}` already handles multipart metadata plus replacement/removal of the existing five asset kinds.

### Private capabilities reserved for later Studio phases

```text
GET/PUT /api/tracks/{trackId}/lyrics/lrc
GET     /api/tracks/{trackId}/analysis/sonictrace
POST    /api/tracks/{trackId}/analysis/sonictrace
GET     /api/tracks/{trackId}/analysis/sonictrace/history
GET     /api/tracks/{trackId}/revision
```

Exact route spelling may be refined before Phase 4 code lands, but ownership is frozen: these operations belong on the private catalog/admin side, never the public Worker.

## 11. Private write security constraint

The current Track Manager Worker enforces this for `POST`, `PUT`, `PATCH` and `DELETE`:

```text
Origin == private Worker origin
```

A Studio UI hosted at:

```text
https://shinobione.github.io/shinobiwan-studio/
```

therefore **cannot directly perform current write calls** without a deliberate security change.

Frozen consequences:

- Phase 1–3 remain non-destructive/read-only where practical.
- Do not weaken same-origin merely to make browser fetch calls succeed.
- Phase 4 must introduce a reviewed browser-to-private-API strategy with exact-origin allowlisting and Cloudflare Access tested in real browsers.
- Never place a permanent service token or secret in GitHub Pages.
- Keep the legacy Track Manager as write fallback until the Studio write path is proven.

This dependency does not block the read-only MVP foundation.

## 12. Current SonicTrace local API

Current coordinator capabilities include:

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

The current health contract still reports V2-E Catalog as not implemented.

SonicTrace already allows the GitHub Pages origin `https://shinobione.github.io` by default. A Studio page on that origin can therefore integrate with the local coordinator later without inventing a second public GPU service.

Initial Studio rule: Studio may wrap an existing SonicTrace response inside `SonicTraceAnalysis` and attach the canonical `trackId` itself. SonicTrace does not need R2 credentials to analyze audio.

## 13. Data ownership matrix

| Data | Canonical owner | Readers | Writer |
|---|---|---|---|
| Track identity / slug | R2 manifest | LaunchPAD, Studio, SonicTrace/LRC context | Track Manager/admin API |
| Metadata | R2 manifest | LaunchPAD, Studio | Track Manager/admin API |
| Audio / cover / video | R2 | LaunchPAD, Studio, SonicTrace input | Track Manager/admin API |
| Lyrics TXT | R2 `lyrics.txt` | LaunchPAD, Studio, LRC Maker | Track Manager/admin API |
| Lyrics LRC | R2 `lyrics.lrc` sidecar | Studio, later LaunchPAD/LRC Maker | private admin API |
| SonicTrace latest | R2 analysis sidecar | Studio | private admin API after compute |
| SonicTrace history | R2 analysis sidecars | Studio | private admin API |
| GPU temp upload | SonicTrace temporary storage | SonicTrace | automatically deleted |
| Public catalog index | R2 derived artifact | LaunchPAD, Studio | Track Manager rebuild |

## 14. MVP Content Health

Content Health measures **completeness only**, never artistic quality.

Initial deterministic weights:

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

GPU availability itself never changes the score.

## 15. Version/master rule

The canonical `trackId` identifies the catalog entry. A different master/version must not silently overwrite analysis provenance.

Until a dedicated versions model exists, every SonicTrace analysis must at minimum preserve the source fingerprint. Future subordinate IDs may use:

```text
<trackId>:<versionId>
```

but `versionId` never replaces the canonical `trackId`.

## 16. Phase 0 gate

Phase 0 is complete when this contract lands:

- [x] canonical `trackId` selected;
- [x] slug/manifest/catalog/LaunchPAD mapping verified;
- [x] `StudioTrack` minimum contract defined;
- [x] `SonicTraceAnalysis` minimum contract defined;
- [x] retained/not-retained SonicTrace policy defined;
- [x] LRC storage format/path defined;
- [x] analysis latest/history policy defined;
- [x] current Track Manager API mapped;
- [x] current SonicTrace API mapped;
- [x] private write-origin constraint documented.

After this lands, **Phase 1 may create `shinobiwan-studio`**. Phase 1 must not modify production catalog data.

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
10. Integrate progressively; never copy/paste the three applications into one monorepo.
