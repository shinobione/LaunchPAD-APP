# SHINOBIWAN Studio — integration contract

> Integration contract updated: 2026-08-08  
> LaunchPAD reference build: `2026.08.08.65`  
> LaunchPAD reference release: `studio-private-read-bridge-20260808`

Status: **Phase 0–3 established; Phase 4A private-read bridge defined.** This contract defines shared identity, data ownership and safe integration boundaries for LaunchPAD, Track Manager, SonicTrace, LRC Maker and SHINOBIWAN Studio.

## 1. Product boundary

SHINOBIWAN Studio is the private, track-centric orchestration UI.

- **LaunchPAD** remains the public listening product.
- **LaunchPAD / Cloudflare R2** remains the canonical production catalog and media store.
- **Track Manager Worker** remains the write/admin backend during migration.
- **SonicTrace** remains the audio-intelligence engine. It computes results but does not own a competing music catalog.
- **LRC Maker** remains the lyrics editing/synchronization engine during the integration stages.
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

Do **not** write Studio/SonicTrace-specific fields into manifest schema v1 yet. The current `normalizeManifest()` reconstructs a fixed object, so unknown fields could be discarded on a future Track Manager save.

New Studio integration data therefore uses additive sidecars or dedicated private API contracts until an explicit manifest schema migration is designed.

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
  "lyricsAvailable": false,
  "timestampsAvailable": false,
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
- `timestampsAvailable` is content-derived and may also be inferred from parsed timestamp segments returned by the API.
- `lyricsLrc` remains an optional compatibility field only; its absence does not mean lyrics are unsynchronized.
- SonicTrace availability is derived from SonicTrace persistence, never guessed.
- Public catalog data populates the first read layer; the private manifest/quality projection is the richer admin read source.

## 5. Lyrics storage and synchronization

### Canonical rule — corrected in Build 65

The canonical authoring object remains:

```text
tracks/<trackId>/lyrics.txt
```

That file may contain plain lyrics **or synchronized timestamped lyrics**.

Supported timestamp forms already include LRC-style bracketed lines and the existing Track Manager/LaunchPAD parser variants.

Synchronization is determined from **content**, not from file extension:

```text
lyrics.txt present + no recognized timestamps  -> plain lyrics
lyrics.txt present + recognized timestamps     -> synchronized lyrics
optional lyrics.lrc sidecar present            -> compatible synchronized artifact
```

A separate `lyrics.lrc` is **not required** for synchronization, Content Health or normal Studio operation. If a later export/compatibility workflow writes an `.lrc` sidecar, it must not become a competing canonical source.

This rule avoids maintaining two near-duplicate lyric files that can drift apart.

## 6. SonicTrace persistence

### Ownership

SonicTrace computes analysis. R2 stores catalog-linked analysis. SonicTrace must not become an independent authoritative track database.

### Planned R2 layout

```text
tracks/<trackId>/analysis/sonictrace/latest.json
tracks/<trackId>/analysis/sonictrace/history/<analysisId>.json
```

Rules:

- `latest.json` is the fast Studio read path.
- history is append-only except explicit maintenance cleanup.
- the analyzed WAV/MP3 is **not duplicated** in the analysis directory.

No SonicTrace persistence is introduced by Build 65; that remains Phase 5 work.

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

## 9. LaunchPAD public read API

Relevant routes:

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
- `/tracks` powers Studio's public catalog layer;
- `/tracks/{trackId}` can include lyrics and parsed timestamp data;
- only published tracks are exposed.

The public Worker remains contract v2.6 and is unchanged by Build 65.

## 10. Track Manager private API

Historical routes remain:

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

Build 65 advances the private Worker to **Track Manager v5.8** and adds this separate Phase 4A namespace:

```text
OPTIONS /api/studio/*
GET     /api/studio/health
GET     /api/studio/tracks
GET     /api/studio/tracks/{trackId}
```

The list/detail bridge reuses the existing private read implementations rather than creating a competing data projection.

### Phase 4A security contract

- Cloudflare Access JWT verification remains mandatory for Studio data GETs.
- CORS is allowlisted to the exact browser Origin `https://shinobione.github.io`.
- CORS advertises only `GET, OPTIONS`.
- `/api/studio/health` reports read capabilities and `write: []`.
- Existing historical write methods still pass through `enforceSameOrigin(request, url)`.
- No permanent Access service token, secret or API key is embedded in GitHub Pages.
- Phase 4A is **read-only**; cross-origin Studio writes are not solved by Build 65.

### Private capabilities reserved for later Studio phases

Possible additive contracts include:

```text
GET/POST /api/studio/tracks/{trackId}/analysis/sonictrace
GET      /api/studio/tracks/{trackId}/analysis/sonictrace/history
GET      /api/studio/tracks/{trackId}/revision
```

Any write route requires a separately reviewed authentication/authorization design. Do not simply add PUT/POST to CORS or weaken `enforceSameOrigin()`.

## 11. Current private write security constraint

The historical Track Manager Worker enforces this for `POST`, `PUT`, `PATCH` and `DELETE`:

```text
Origin == private Worker origin
```

Build 65 **preserves this rule**.

A Studio UI hosted at:

```text
https://shinobione.github.io/shinobiwan-studio/
```

can now perform the new private **GET-only** bridge reads after Cloudflare Access authentication, but cannot directly use current write routes.

Consequences:

- Phase 4A proves authenticated private reads first.
- Legacy Track Manager remains the write fallback and production publishing interface.
- Phase 4B must be designed separately with explicit authorization, destructive-action guards and no browser secrets.
- Studio integration failure must not take Track Manager offline.

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

SonicTrace already allows the GitHub Pages origin `https://shinobione.github.io` by default. A Studio page on that origin can integrate with the local coordinator later without inventing a second public GPU service.

Initial Studio rule: Studio may wrap an existing SonicTrace response inside `SonicTraceAnalysis` and attach the canonical `trackId` itself. SonicTrace does not need R2 credentials to analyze audio.

## 13. Data ownership matrix

| Data | Canonical owner | Readers | Writer |
|---|---|---|---|
| Track identity / slug | R2 manifest | LaunchPAD, Studio, SonicTrace/LRC context | Track Manager/admin API |
| Metadata | R2 manifest | LaunchPAD, Studio | Track Manager/admin API |
| Audio / cover / video | R2 | LaunchPAD, Studio, SonicTrace input | Track Manager/admin API |
| Lyrics TXT, plain or synchronized | R2 `lyrics.txt` | LaunchPAD, Studio, LRC Maker | Track Manager/admin API |
| Optional LRC compatibility artifact | optional sidecar/export | Studio/LRC compatibility workflows | future private lyrics workflow |
| SonicTrace latest | planned R2 analysis sidecar | Studio | future private admin API after compute |
| SonicTrace history | planned R2 analysis sidecars | Studio | future private admin API |
| GPU temp upload | SonicTrace temporary storage | SonicTrace | automatically deleted |
| Public catalog index | R2 derived artifact | LaunchPAD, Studio | Track Manager rebuild |

## 14. MVP Content Health

Content Health measures **completeness only**, never artistic quality.

Current deterministic weights:

```text
Audio              15
Cover              10
Metadata           15
Lyrics TXT         10
Synced Lyrics      10
SonicTrace         20
Canvas / Video     10
Publication        10
TOTAL              100
```

`Synced Lyrics` earns its 10 points when recognized timestamp data is present in the canonical lyrics source, or when an optional compatible synchronized sidecar exists. A missing `.lrc` file by itself is not a gap.

GPU availability itself never changes the score.

## 15. Version/master rule

The canonical `trackId` identifies the catalog entry. A different master/version must not silently overwrite analysis provenance.

Until a dedicated versions model exists, every SonicTrace analysis must at minimum preserve the source fingerprint. Future subordinate IDs may use:

```text
<trackId>:<versionId>
```

but `versionId` never replaces the canonical `trackId`.

## 16. Integration progress gates

### Phase 0 — complete

- [x] canonical `trackId` selected;
- [x] slug/manifest/catalog/LaunchPAD mapping verified;
- [x] `StudioTrack` minimum contract defined;
- [x] `SonicTraceAnalysis` minimum contract defined;
- [x] private write-origin constraint documented.

### Phases 1–3 — complete in Studio

- [x] Studio shell on GitHub Pages;
- [x] public catalog read layer;
- [x] track-centric workspace;
- [x] Content Health;
- [x] synchronized lyrics semantics corrected to content-driven detection.

### Phase 4A — Build 65 source gate

- [x] pre-integration restoration branches created;
- [x] GET-only Studio private namespace implemented on a dedicated branch;
- [x] exact allowed Origin defined;
- [x] Access-authenticated data reads retained;
- [x] write capability explicitly empty;
- [x] legacy same-origin write guard retained;
- [x] dedicated regression test added;
- [ ] all LaunchPAD CI/check:wrangler green;
- [ ] reviewed PR merged;
- [ ] admin Worker deployed through protected workflow;
- [ ] standalone Track Manager revalidated after deployment;
- [ ] Studio private-health consumer added in a separate Studio PR.

## 17. Rollback / repository safety

Before Phase 4 integration, restoration references were created:

```text
LaunchPAD + Track Manager: safety/pre-studio-integration-20260808-1048
SonicTrace:               safety/pre-studio-integration-20260808-1048
LRC Maker:                safety/pre-studio-integration-20260808-1048
Studio:                   safety/pre-integration-20260808-1048
```

Rules:

1. Prefer a normal PR revert for a bad integration step.
2. Stop the next phase when a regression appears.
3. Verify the affected standalone tool independently after rollback.
4. Use safety branches only if a normal revert is insufficient.
5. Cross-repository features use separate PRs; do not merge breaking coordinated changes simultaneously.

## 18. Non-negotiable rules carried forward

1. LaunchPAD = public product.
2. Studio = private cockpit.
3. R2 = canonical catalog/media/Studio persistence.
4. SonicTrace = audio intelligence engine, not a competing catalog.
5. LRC Maker = lyrics engine during migration.
6. `trackId` = immutable canonical slug.
7. No duplicate WAV storage for Catalog Intelligence.
8. No browser secret in GitHub Pages.
9. No destructive Track Manager replacement before Studio write flows are proven.
10. Timestamped canonical TXT is synchronized lyrics; do not require a duplicate `.lrc` source.
11. Integrate progressively; never copy/paste the three applications into one monorepo.
12. Phase 4A is read-only. Write integration is a separate security problem and must remain separately reviewable/reversible.
