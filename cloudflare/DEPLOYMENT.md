# Reproducible Cloudflare Worker deployments

> Current application build: `2026.08.08.66` — release `studio-metadata-validation-20260808`.

Current repository backend contracts: public media Worker **v2.6**, private Track Manager **v5.9**, Studio bridge **v1.1**. Web-host deployment is documented separately in [`../docs/DEPLOYMENT-TOPOLOGY.md`](../docs/DEPLOYMENT-TOPOLOGY.md).

LaunchPAD deploys its two Cloudflare Workers from reviewed code on GitHub `main` through protected GitHub Actions and the repository-pinned Wrangler version.

Cloudflare **Pages** is a separate staging web host. A Pages deployment does not deploy Workers, and a Worker deployment does not publish a new PWA shell.

## Production services

| Target | Worker | URL | Access |
| --- | --- | --- | --- |
| `public` | `launchpad-media` | `https://launchpad-media.jerryquinet.workers.dev` | Public read-only |
| `admin` | `launchpad-r2-api` | `https://launchpad-r2-api.jerryquinet.workers.dev` | Cloudflare Access |

Both Workers bind `MEDIA_BUCKET` to `shinobiwan-media`. Deployments change Worker code/configuration only; they do not rebuild `catalog/index.json` or modify R2 media.

Build 66 changes **admin only**. The public Worker remains v2.6.

## Build 66 Studio metadata validation bridge

Track Manager v5.9 / Studio bridge v1.1 keeps the authenticated Phase 4A reads and adds one exact validation-only POST:

```text
OPTIONS /api/studio/*
GET     /api/studio/health
GET     /api/studio/tracks
GET     /api/studio/tracks/<slug>
POST    /api/studio/tracks/<slug>/metadata/validate
```

The validation POST is not a production write route. It requires exact-origin CORS, Cloudflare Access, `Content-Type: application/json`, `X-Shinobiwan-Studio-Intent: metadata-validate-v1` and `expectedUpdatedAt`.

It whitelists metadata fields, preserves canonical slug/assets/provenance/server timestamps, normalizes a proposed manifest and runs Track Manager quality inspection. It returns `validationOnly: true` and does **not** call manifest/catalog writes, R2 put/delete, media replacement, publication or rebuild operations.

Health reports:

```text
validate: ["metadata"]
write: []
```

Every other POST/PUT/PATCH/DELETE operation remains behind the existing same-origin Track Manager guard.

No R2 migration, catalog rebuild, public Worker deploy or media mutation is required by this release.

## GitHub environment

Use `cloudflare-production` with:

- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_API_TOKEN`

Optional authenticated Track Manager smoke tests may use:

- `CLOUDFLARE_ACCESS_CLIENT_ID`
- `CLOUDFLARE_ACCESS_CLIENT_SECRET`

Recommended protection: approval before production jobs, deployment from `main` only, credentials stored as environment secrets.

## Pre-deployment validation

```bash
npm ci
npm run validate:cloudflare
npm run check:studio-private-read-bridge
npm run check:wrangler
```

The full `npm run validate` also checks application/PWA/catalog contracts and requires every Markdown document to match the active Build/Release.

## Deploy from GitHub

1. Merge reviewed Worker changes into `main` after CI is green.
2. Open **Actions → Deploy Cloudflare Workers → Run workflow**.
3. For Build 66 select **`admin` only**.
4. Enter `DEPLOY` in the confirmation field.
5. Approve `cloudflare-production` if requested.
6. Review source SHA, Worker name, Cloudflare version ID, URL and smoke-test result.

Do not select `both` for Build 66; there is no public Worker contract change.

## Build 66 post-deployment checks

Before any Studio save endpoint exists:

- existing Track Manager UI still opens through Cloudflare Access;
- existing create/edit/delete behavior still works from the Track Manager origin;
- `/api/studio/health` reports Track Manager v5.9, bridge v1.1, `validate: ["metadata"]`, `write: []`;
- existing private Studio GET reads still work;
- POST preflight succeeds only on `/api/studio/tracks/<slug>/metadata/validate` from `https://shinobione.github.io`;
- POST to any other `/api/studio/*` path remains rejected;
- a validation request with the correct intent and current `expectedUpdatedAt` returns `validationOnly: true`;
- a stale `expectedUpdatedAt` returns HTTP 409 with `STALE_MANIFEST`;
- validation does not change manifest `updatedAt`, catalog generation timestamp, object count or media;
- an unapproved Origin is rejected;
- no catalog rebuild or R2 object mutation occurs simply because the Worker was deployed or a validation was performed.

General applicable checks also include:

- private Worker remains protected by Cloudflare Access;
- optional service-token Track Manager response;
- public `/health` contract only when the public Worker changes;
- public `/tracks` response only when the public Worker changes;
- audio Range behavior and `Content-Range` only when the public Worker changes;
- successful media HEAD with `Accept-Ranges: bytes` only when the public Worker changes.

## Dashboard-to-repository rule

Repository code is the source of truth. Once a Worker has been deployed from GitHub, do not make unique source edits in the Cloudflare dashboard.

Both Wrangler configurations currently use `keep_vars: true` so existing dashboard-managed variables survive deployments. Moving non-sensitive variables/Access policies into infrastructure-as-code is a separate future task.

## Rollback

1. Prefer reverting the Build 66 PR in GitHub if source rollback is enough.
2. For an already deployed Worker, open **Actions → Roll back Cloudflare Worker → Run workflow**.
3. Select `admin`.
4. Optionally enter a known Cloudflare version ID.
5. Enter `ROLLBACK`.
6. Approve the protected environment.
7. Verify active deployment data and smoke tests.

Global pre-integration source snapshot: `safety/pre-studio-integration-20260808-1048`.
Immediate pre-4B.1A snapshot: `safety/pre-phase-4b1a-20260808-1452`.

Worker rollback does not restore R2 objects, manifests, lyrics, covers, audio, thumbnails or `catalog/index.json`. Build 66's validation endpoint is designed not to modify those objects in the first place.

## Source-of-truth map

- application + Worker source / Wrangler configuration: GitHub `main`;
- web-host deployment: GitHub Pages / Cloudflare Pages from the canonical static artifact;
- active Worker versions: Cloudflare Workers deployment state;
- credentials: GitHub `cloudflare-production` environment;
- track manifests/media/catalog: Cloudflare R2;
- Cloudflare Access policies: Cloudflare account configuration until a future infrastructure-as-code migration.
