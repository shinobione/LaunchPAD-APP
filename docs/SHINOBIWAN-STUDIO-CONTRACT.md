# SHINOBIWAN Studio — authoritative integration contract

> Contract hardened: 2026-08-09  
> LaunchPAD reference build: `2026.08.09.67`  
> LaunchPAD reference release: `post-phase6-track-dna-release-date-20260809`

Status: **Phases 0–6 complete and production-validated. Phase 7 is not started.**

This document is the current cross-repository contract for LaunchPAD, Track Manager, SonicTrace, LRC Maker and SHINOBIWAN Studio. Older phase documents remain useful as historical implementation records, but this file wins when an old document conflicts with a frozen current rule.

## 1. Product boundary

- **LaunchPAD** = public listening product / PWA.
- **SHINOBIWAN Studio** = private track-centric orchestration cockpit.
- **Track Manager** = protected production write/admin authority.
- **Cloudflare R2** = canonical production catalog/media/sidecar store.
- **SonicTrace** = audio-intelligence engine; it does not own a competing music catalog.
- **LRC Maker** = lyrics editing/timing engine; standalone remains a fallback.
- **GitHub** = source of truth for code.

Studio is a projection/orchestration layer, **not another catalog**.

## 2. Canonical track identity

The canonical `trackId` is the R2/manifest slug:

```text
trackId === manifest.slug === R2 track directory === public API slug
```

Rules:

1. lower-case ASCII kebab-case Track Manager slug;
2. stable during normal edits;
3. title is mutable and is never identity;
4. slug rename is an explicit migration;
5. Studio, Track Manager, LaunchPAD, SonicTrace and LRC Maker reuse the same `trackId`;
6. version/master identifiers remain subordinate to `trackId`.

## 3. Canonical manifest and R2 layout

Manifest schema v1 remains authoritative for core track metadata/assets. Do not silently add Studio/SonicTrace-only fields to schema v1 while `normalizeManifest()` still reconstructs a fixed shape.

Canonical layout:

```text
catalog/index.json
tracks/<trackId>/manifest.json
tracks/<trackId>/audio.<ext>
tracks/<trackId>/cover.<ext>
tracks/<trackId>/thumbnail.webp
tracks/<trackId>/lyrics.txt
tracks/<trackId>/video.<ext>
tracks/<trackId>/analysis/sonictrace/latest.json
tracks/<trackId>/analysis/sonictrace/history/<analysisId>.json
```

Temporary transactional backup material may exist under `_studio-backups/...` only while a scoped Track Manager operation is active. It is not canonical track data.

## 4. `StudioTrack` projection

`StudioTrack` is a normalized view model, not a persisted source of truth.

Core projection rules:

- `StudioTrack.id = manifest.slug`;
- `manifest.assets.lyrics` maps to canonical lyrics TXT availability;
- `timestampsAvailable` is derived from recognized timestamps in canonical lyrics content / parsed canonical segments;
- SonicTrace availability/freshness is derived from persisted SonicTrace sidecars and source revision;
- public catalog data is fallback read data; protected Track Manager reads are the richer admin source;
- Studio must not cache a competing authoritative copy of the manifest/catalog.

## 5. Lyrics — frozen canonical rule

The **only canonical lyrics source** is:

```text
tracks/<trackId>/lyrics.txt
```

It may contain plain lyrics or timestamped synchronized lyrics.

```text
lyrics.txt missing                        -> lyrics missing
lyrics.txt present, no recognized times  -> plain / unsynchronized lyrics
lyrics.txt present, recognized times     -> synchronized lyrics
```

### `.lrc` rule

A separate `.lrc` file is optional export/compatibility material only.

It:

- is **not required**;
- is **not a second source of truth**;
- does **not** determine synchronization state;
- does **not** award Content Health points;
- must never override or silently diverge from canonical `lyrics.txt`.

If a future compatibility workflow produces `.lrc`, it is derived from canonical lyrics state.

## 6. LRC Maker synchronization behavior

Final Phase 6 native workflow, shared by standalone and embedded modes:

- **simple click** = select lyric line only;
- **double-click** on a timestamped line = explicit seek/reposition to its existing timestamp;
- **Space** = write current audio time to the selected line, then advance selection exactly one line.

The 6.3.2 experiment that sought audio on simple click is retired.

Embedded Studio reuses the real LRC Maker engine via Web Component/Shadow DOM. It is not an iframe and not a copied reimplementation.

## 7. Lyrics context and guarded save

Studio passes only minimal context in navigation:

```text
studio=lyrics-v1
trackId=<canonical slug>
returnPath=<same-origin Studio path>
```

Audio blobs and lyric text are never placed in the URL.

Protected context:

```text
GET /api/studio/tracks/<slug>/lyrics/context
```

Protected synchronization write:

```text
POST /api/studio/tracks/<slug>/lyrics/sync/validate
POST /api/studio/tracks/<slug>/lyrics/sync/save
```

Writes remain specialized and require canonical stale guards (`expectedUpdatedAt`, lyrics ETag), strict validation, canonical reread and compensation/rollback where required.

Canonical text equality normalizes only the agreed storage form: optional UTF-8 BOM removal and `CRLF` / `CR` to `LF`. Genuine lyric differences remain blocking.

## 8. SonicTrace persistence

SonicTrace computes; R2 persists catalog-linked results.

```text
tracks/<trackId>/analysis/sonictrace/latest.json
tracks/<trackId>/analysis/sonictrace/history/<analysisId>.json
```

Rules:

- `latest.json` = fast current profile;
- history = append-oriented provenance;
- canonical WAV/MP3 is not duplicated in the analysis directory;
- analysis stores a source revision/fingerprint so changed audio can mark results outdated;
- metadata/cover/video/lyrics-only changes must not invalidate the audio fingerprint;
- model/engine/provenance/warnings are preserved;
- relative Neural/CLAP scores are not mislabelled as objective DSP measurements.

## 9. Current backend surfaces

### Public LaunchPAD Worker

- service: `launchpad-media`;
- contract: **v2.6**;
- public/read-only;
- catalog/detail/media delivery including Range-capable public media.

### Private Track Manager

- service: `launchpad-r2-api`;
- deployed Track Manager: **v5.16**;
- deployed Studio bridge: **v1.8**;
- deployed source: `1bbe0293e4e17968bb7e191f58e7ae1cdd95dadf`;
- protected deployment run: `31324447727`;
- Worker Version ID: `5a83c6dd-cfb4-4be6-ab8d-16b5c34bdc2b`;
- target: `admin`.

Studio capability families include:

```text
read/context
metadata validate/save
canonical lyrics validate/save
track create
asset upload/delete
explicit catalog rebuild
SonicTrace sidecar read/save
Lyrics Studio context
Lyrics synchronization validate/save
protected canonical media Range reads
```

Whole-track deletion is not exposed by the Studio bridge.

## 10. Security boundary

The private Studio bridge remains behind Cloudflare Access.

Required rules:

- exact allowed browser origin: `https://shinobione.github.io`;
- Access verification before protected routing;
- credentialed CORS never uses wildcard origin;
- browser control POSTs use established CORS-simple `text/plain;charset=UTF-8` where applicable;
- multipart uploads use native `FormData` without custom request headers;
- no R2 credentials or Access secrets in GitHub Pages/browser bundles;
- stale-sensitive writes use manifest revisions/ETags;
- successful writes use canonical reread;
- multi-object operations keep compensating rollback;
- unrelated legacy Track Manager mutation routes retain same-origin enforcement.

The public Worker's wildcard public-read CORS is a separate public surface and does not weaken the private Track Manager boundary.

## 11. Protected media seek contract

Protected canonical Studio media supports one HTTP byte range:

- `Accept-Ranges: bytes`;
- `206 Partial Content` for valid ranges;
- `416 Range Not Satisfiable` for invalid ranges;
- exact `Content-Range` / `Content-Length`;
- R2 offset/length ranged reads;
- Range headers exposed only through the established exact-origin credentialed CORS path.

This backend capability supports explicit media seeks such as LRC Maker **double-click**. It does not redefine simple-click behavior.

## 12. Content Health

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

`Synced Lyrics` earns its 10 points **only when recognized timestamp data is present in canonical `lyrics.txt` / its canonical parsed representation**.

An optional `.lrc` sidecar can never award these points.

GPU availability itself never changes the score.

## 13. Version/master rule

The canonical `trackId` identifies the catalog entry. A different audio master/version must not silently overwrite analysis provenance.

Until a dedicated versions model exists, every SonicTrace analysis preserves the analyzed source revision/fingerprint. Future subordinate identifiers may use:

```text
<trackId>:<versionId>
```

but `versionId` never replaces canonical `trackId`.

## 14. Deployment discipline

Treat these as separate states:

1. source merged;
2. GitHub Pages/static web deployed;
3. Worker deployed;
4. R2/catalog data mutated/rebuilt.

Never report one as another.

Private Track Manager-only source changes should deploy `target=admin`. Never use `both` unless both Worker surfaces genuinely changed.

A public LaunchPAD build bump is not required for Worker-only changes; conversely a public UI Build 67 change does not require Worker redeployment.

## 15. Frozen Phase 6 production state

```text
SHINOBIWAN Studio
  0.9.5 / Build 20
  closeout main SHA: 00b4504779ec6220d97564965309ef7a9ef20887

LRC Maker
  6.3.4 production-validated baseline
  SHA: 8bd3f3fd52acc1217a65216541c0b7e40fcab5ba

Track Manager / LaunchPAD backend
  v5.15 / bridge v1.7
  Phase 6 backend source: 23a7b494b89d4958f573f0889057b53a44aa23b6

Final Phase 6 checkpoint
  safety/phase6-complete-20260809-0513
```

Post-Phase-6 maintenance/hardening may advance public/test/doc versions without changing what constituted the validated Phase 6 checkpoint.

## 16. Rollback / repository safety

Rules:

1. use dedicated feature branches;
2. keep `safety/*` branches immutable rollback references;
3. never merge red CI;
4. merge the exact tested head;
5. deploy backend dependency before frontend consumer when a contract changes;
6. prefer normal PR revert before emergency branch restoration;
7. verify standalone tools independently after rollback;
8. do not mutate real production media merely to prove destructive code can mutate it.

## 17. Non-negotiable rules carried forward

1. LaunchPAD = public product.
2. Studio = private cockpit.
3. R2 = canonical catalog/media/analysis persistence.
4. Track Manager = protected R2 write authority.
5. SonicTrace = audio intelligence engine, not a competing catalog.
6. LRC Maker = lyrics timing engine with standalone fallback.
7. `trackId` = canonical slug everywhere.
8. No duplicate canonical WAV storage for Catalog Intelligence.
9. No browser secrets.
10. `lyrics.txt` is the only canonical lyrics source.
11. Timestamped canonical TXT = synchronized lyrics.
12. `.lrc` is optional compatibility/export only and cannot affect Content Health.
13. No iframe as the final Lyrics Studio architecture.
14. Preserve LaunchPAD, Track Manager, LRC Maker and SonicTrace independently.
15. **Phase 7 must not start, be scaffolded or be silently prepared without explicit user authorization.**
