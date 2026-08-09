# LaunchPAD Cloudflare services

> Current public application build: `2026.08.09.67` — release `post-phase6-track-dna-release-date-20260809`.

Cloudflare provides three separate LaunchPAD concerns:

1. **Cloudflare Pages** — staging host for the static PWA built from GitHub `main`.
2. **Workers** — public media/catalog API and private Track Manager.
3. **R2** — canonical production track/media storage.

Cloudflare is not an alternate source repository. GitHub `main` remains the code authority. See [`../docs/DEPLOYMENT-TOPOLOGY.md`](../docs/DEPLOYMENT-TOPOLOGY.md).

## Current production services

### Public media Worker

- service: `launchpad-media`;
- contract: **v2.6**;
- public/read-only;
- binding: `MEDIA_BUCKET` → `shinobiwan-media`;
- supports HTTP Range streaming;
- unchanged by private Studio Phases 4–6 and by LaunchPAD Build 67.

### Private Track Manager Worker

- service: `launchpad-r2-api`;
- deployed Track Manager: **v5.15**;
- deployed Studio bridge: **v1.7**;
- deployed source head: `23a7b494b89d4958f573f0889057b53a44aa23b6`;
- protected deployment run: `31288949405`;
- deployment target: `admin`;
- Cloudflare Access remains mandatory;
- binding: `MEDIA_BUCKET` → `shinobiwan-media`;
- same-origin Track Manager UI remains the administrative fallback;
- no public Worker redeploy was required for the final Phase 6 protected-media seek hotfix.

Private Worker source is stored as ordered parts under `cloudflare/admin-worker.parts/*.part` and assembled by `scripts/build-admin-worker.mjs`.

## Studio surface by domain

### Read / context

```text
GET /api/studio/health
GET /api/studio/tracks
GET /api/studio/tracks/<slug>
GET /api/studio/tracks/<slug>/lyrics
GET /api/studio/tracks/<slug>/lyrics/context
```

### Metadata

```text
POST /api/studio/tracks/<slug>/metadata/validate
POST /api/studio/tracks/<slug>/metadata/save
```

### Canonical lyrics

```text
POST /api/studio/tracks/<slug>/lyrics/validate
POST /api/studio/tracks/<slug>/lyrics/save
POST /api/studio/tracks/<slug>/lyrics/sync/validate
POST /api/studio/tracks/<slug>/lyrics/sync/save
```

The lyrics contract is frozen:

```text
tracks/<slug>/lyrics.txt = only canonical lyrics source
timestamped lyrics.txt   = synchronized lyrics
.lrc                      = optional export/compatibility only
```

A separate `.lrc` object is never required for Content Health and cannot become a second source of truth.

### Track / asset management

```text
POST /api/studio/tracks/create
POST /api/studio/tracks/<slug>/assets/<kind>/upload
POST /api/studio/tracks/<slug>/assets/<kind>/delete
POST /api/studio/catalog/rebuild
```

Allowed asset kinds remain exactly:

```text
audio
cover
thumbnail
lyrics
video
```

Whole-track deletion is not exposed through the Studio bridge.

### SonicTrace persistence

```text
GET  /api/studio/tracks/<slug>/analysis/sonictrace
POST /api/studio/tracks/<slug>/analysis/sonictrace
GET  /api/studio/analysis/sonictrace
```

SonicTrace results are stored as private R2 sidecars. Canonical audio is not duplicated into the analysis directory.

## Protected canonical media

The private media path used by Studio supports single HTTP byte ranges for canonical audio/video reads:

- `Accept-Ranges: bytes`;
- `206 Partial Content` for valid ranges;
- `416 Range Not Satisfiable` for invalid ranges;
- R2 ranged reads using offset/length;
- `Content-Range`, `Content-Length`, `Accept-Ranges` and ETag exposure to the exact Studio origin.

This exists so the embedded/standalone LRC engine can reliably reposition protected audio. **Simple click selects a lyric line; double-click is the explicit seek action.**

## Security rules

- all Studio routes remain behind Cloudflare Access JWT verification;
- exact browser origin remains `https://shinobione.github.io`;
- credentialed CORS never uses `*`;
- JSON-like cross-origin control POSTs use `text/plain;charset=UTF-8` when the established contract requires a CORS-simple request;
- file uploads use native multipart `FormData` without custom request headers;
- no R2 credential or Access secret is shipped to Studio/GitHub Pages;
- stale-sensitive writes use canonical revisions/ETags;
- successful writes are canonically reread;
- multi-object mutations retain compensating rollback where required;
- unrelated legacy Track Manager mutations retain same-origin enforcement.

## Canonical R2 layout

```text
catalog/index.json
tracks/<slug>/manifest.json
tracks/<slug>/audio.<ext>
tracks/<slug>/cover.<ext>
tracks/<slug>/thumbnail.webp
tracks/<slug>/lyrics.txt
tracks/<slug>/video.<ext>
tracks/<slug>/analysis/sonictrace/latest.json
tracks/<slug>/analysis/sonictrace/history/<analysisId>.json
```

Temporary rollback objects may exist only during an active scoped operation under `_studio-backups/...`. They are not canonical track data and are removed after success/compensation.

## Validation

```bash
npm ci
npm run validate
npm run check:wrangler
```

The regression suite protects, among other things:

- exact Access/CORS boundaries;
- metadata and lyrics stale guards;
- canonical `lyrics.txt` semantics;
- scoped track/asset operations;
- SonicTrace sidecar contracts;
- protected media Range/206/416 behavior;
- public Worker isolation;
- LaunchPAD PWA/media regressions.

## Deployment discipline

Worker deployment is manual and separate from web deployment.

For private Track Manager-only changes:

```text
target = admin
confirm = DEPLOY
```

Do not use `both` unless both Worker surfaces actually changed. Deploying Worker source does not itself rebuild `catalog/index.json` or mutate canonical media.

Final Phase 6 backend deployment proof:

```text
source head  23a7b494b89d4958f573f0889057b53a44aa23b6
workflow     31288949405
target       admin
result       success
```

Final Phase 6 operational checkpoint:

```text
safety/phase6-complete-20260809-0513
```

Phase 7 remains forbidden until explicitly authorized.
