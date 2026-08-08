# LaunchPAD Cloudflare services

> Current application build: `2026.08.08.66` — release `studio-metadata-validation-20260808`.

Public media Worker remains **v2.6**. Private Track Manager **v5.13** / Studio bridge **v1.5** is now deployed as the final backend capability set required by SHINOBIWAN Studio roadmap Phase 4.

The current source branch is the **v5.14 / bridge v1.6 Phase 5 candidate**. It is not described as deployed until the protected admin workflow and Access verification complete. It adds only private SonicTrace sidecar contracts; public LaunchPAD and the public media Worker remain unchanged.

Phase 5 candidate routes:

```text
GET  /api/studio/tracks/<slug>/analysis/sonictrace
POST /api/studio/tracks/<slug>/analysis/sonictrace
GET  /api/studio/analysis/sonictrace
```

Cloudflare provides three separate LaunchPAD concerns:

1. **Cloudflare Pages** — staging host for the static PWA built from GitHub `main`.
2. **Workers** — public media/catalog API and private Track Manager.
3. **R2** — canonical production track/media storage.

Cloudflare is not an alternate application source repository. See [`../docs/DEPLOYMENT-TOPOLOGY.md`](../docs/DEPLOYMENT-TOPOLOGY.md).

## Public media Worker

- service: `launchpad-media`
- repository contract: **v2.6**
- public read-only access
- binding: `MEDIA_BUCKET` → `shinobiwan-media`
- HTTP Range streaming
- unchanged by Track Manager v5.13

## Private Track Manager Worker

- service: `launchpad-r2-api`
- deployed repository contract: **v5.13**
- deployed Studio bridge: **v1.5**
- source SHA: `df75509d89b1ed1477d4b249fab63a6bd41db311`
- protected workflow run: `31272655808`
- deployment target: `admin`
- Cloudflare Worker Version ID: `781f75f9-776c-4e39-90a7-5cdf34854599`
- Cloudflare Access post-deploy verification: protected, HTTP `302`
- public Worker deploy/record/verify steps: skipped
- binding: `MEDIA_BUCKET` → `shinobiwan-media`
- existing same-origin Track Manager UI remains the operational fallback
- public LaunchPAD application remains Build 66

Private source is stored as ordered parts in `cloudflare/admin-worker.parts/*.part` and assembled by `scripts/build-admin-worker.mjs`.

## Studio bridge v1.5 surface

Existing private reads/writes remain:

```text
GET  /api/studio/health
GET  /api/studio/tracks
GET  /api/studio/tracks/<slug>
GET  /api/studio/tracks/<slug>/lyrics
POST /api/studio/tracks/<slug>/metadata/validate
POST /api/studio/tracks/<slug>/metadata/save
POST /api/studio/tracks/<slug>/lyrics/validate
POST /api/studio/tracks/<slug>/lyrics/save
```

v1.5 adds only the remaining roadmap Phase 4 operational routes:

```text
POST /api/studio/tracks/create
POST /api/studio/tracks/<slug>/assets/<kind>/upload
POST /api/studio/tracks/<slug>/assets/<kind>/delete
POST /api/studio/catalog/rebuild
```

Allowed asset kinds are exactly:

```text
audio
cover
thumbnail
lyrics
video
```

Health contract:

```json
{
  "read": ["tracks", "track", "lyrics"],
  "validate": ["metadata", "lyrics"],
  "write": ["metadata", "lyrics"],
  "manage": ["track-create", "assets", "catalog-rebuild"]
}
```

`manage` is deliberately separate from the proven metadata/lyrics write list so older Studio builds do not misclassify the operational capabilities.

## Track creation

`POST /api/studio/tracks/create`:

- exact Studio origin + Cloudflare Access required;
- CORS-simple `text/plain` JSON body;
- canonical slug required and duplicate slugs refused;
- metadata uses the existing Studio whitelist;
- new tracks are forced to `draft`;
- asset references start empty;
- manifest is written, catalog rebuilt and manifest reread verified;
- on failure, the new manifest is removed and catalog rebuilt from the previous canonical state.

## Asset upload / replace

`POST /api/studio/tracks/<slug>/assets/<kind>/upload`:

- exact Studio origin + Access required;
- multipart `FormData` with no custom request headers, keeping the browser request CORS-safelisted;
- `expectedUpdatedAt` stale-manifest guard required;
- existing Track Manager `validateUploadFile()` rules are reused;
- thumbnail keeps the existing 2 MB limit;
- lyrics upload is canonicalized to `lyrics.txt`; no `.lrc` persistence is introduced;
- upload/replace operates on exactly one asset kind per request;
- previous object is copied to `_studio-backups/...` before replacement;
- manifest + catalog are updated only after the new object exists;
- published tracks are rechecked for quality before committing manifest publication state;
- reread verifies manifest revision + asset existence;
- failure triggers compensating asset/manifest/catalog rollback and backup cleanup.

The temporary backup prefix is outside `tracks/<slug>/`, so Track Manager quality inspection cannot mistake a rollback object for a canonical track asset.

## Asset delete

`POST /api/studio/tracks/<slug>/assets/<kind>/delete`:

- exact Studio origin + Access required;
- CORS-simple `text/plain` JSON body;
- `expectedUpdatedAt` required;
- only the named asset is considered;
- deletion of an essential asset from a published track is blocked when the resulting manifest would not be publishable;
- previous object is backed up before deletion;
- manifest/catalog publication is reread and verified;
- failure restores the object, manifest and catalog.

Whole-track deletion is **not** exposed by the Studio bridge. The roadmap requires delete/replace **asset**, not deletion of an entire canonical track. The legacy Track Manager remains the fallback for operations outside the frozen Studio Phase 4 scope.

## Explicit catalog rebuild

`POST /api/studio/catalog/rebuild` requires:

```json
{
  "intent": "catalog-rebuild-v1",
  "confirm": "REBUILD"
}
```

It rebuilds only the canonical `catalog/index.json` from R2 manifests. No track/media mutation is bundled with the endpoint.

## Security rules

- all Studio routes remain behind Cloudflare Access JWT verification;
- exact browser origin remains `https://shinobione.github.io`;
- credentialed CORS never uses `*`;
- JSON control POSTs use `text/plain` simple requests;
- file upload uses browser-generated multipart FormData without custom headers;
- no R2 credentials are shipped to Studio;
- all unrelated legacy Track Manager POST/PUT/PATCH/DELETE routes retain `enforceSameOrigin()`;
- no SonicTrace, analysis persistence or Phase 5 code exists in the v5.13 operations module;
- no `.lrc` object is introduced.

## Canonical R2 layout

```text
catalog/index.json
tracks/<slug>/manifest.json
tracks/<slug>/audio.<ext>
tracks/<slug>/cover.<ext>
tracks/<slug>/thumbnail.webp
tracks/<slug>/lyrics.txt
tracks/<slug>/video.<ext>
```

Temporary rollback objects may exist only during a scoped operation under:

```text
_studio-backups/<slug>/...
```

They are removed after success or rollback completion.

## Validation

```bash
npm ci
npm run validate
npm run check:wrangler
```

The Studio bridge regression guard verifies:

- metadata validation stays non-mutating;
- metadata save remains media-isolated;
- canonical lyrics remains manifest+ETag guarded;
- final Phase 4 operations are restricted to track-create, per-asset upload/delete and explicit catalog rebuild;
- no whole-track deletion or legacy all-in-one `saveTrack()` route becomes cross-origin;
- v5.13 bundle remains behind Access and legacy unrelated writes remain same-origin.

## Deployment proof

Production deployment succeeded from exact source SHA `df75509d89b1ed1477d4b249fab63a6bd41db311` using protected workflow run `31272655808` with `target=admin`.

The workflow:

- rebuilt and revalidated Track Manager v5.13 / bridge v1.5;
- deployed only `launchpad-r2-api`;
- recorded Worker Version ID `781f75f9-776c-4e39-90a7-5cdf34854599`;
- verified Cloudflare Access remains protected (`302` unauthenticated);
- skipped all public Worker deployment/verification steps;
- did not rebuild `catalog/index.json` or mutate R2 media merely by deploying Worker code.

Immediate rollback checkpoint before v5.13 work:

```text
safety/pre-v5.13-phase4-ops-20260808-1948
```

Previous deployed backend:

- Track Manager v5.12 / bridge v1.4;
- merge `98504263dac8a5f284337fe7e26fa6c808ad75e3`;
- Worker Version ID `3aa3136f-492d-46c5-af0a-fd3b048e8666`;
- deployment run `31270132063`;
- target `admin`; public steps skipped.

See [`../docs/STUDIO-PHASE4-OPERATIONS.md`](../docs/STUDIO-PHASE4-OPERATIONS.md).
