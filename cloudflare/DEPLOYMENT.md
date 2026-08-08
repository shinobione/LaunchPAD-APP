# Reproducible Cloudflare Worker deployments

> Current application build: `2026.08.08.63` — release `sonictrace-admin-link-20260808`.

Current repository backend contracts: public media Worker **v2.6**, private Track Manager **v5.7**. Web-host deployment is documented separately in [`../docs/DEPLOYMENT-TOPOLOGY.md`](../docs/DEPLOYMENT-TOPOLOGY.md).

LaunchPAD deploys its two Cloudflare Workers from reviewed code on GitHub `main` through protected GitHub Actions and the repository-pinned Wrangler version.

Cloudflare **Pages** is a separate staging web host. A Pages deployment does not deploy Workers, and a Worker deployment does not publish a new PWA shell.

## Production services

| Target | Worker | URL | Access |
| --- | --- | --- | --- |
| `public` | `launchpad-media` | `https://launchpad-media.jerryquinet.workers.dev` | Public read-only |
| `admin` | `launchpad-r2-api` | `https://launchpad-r2-api.jerryquinet.workers.dev` | Cloudflare Access |

Both Workers bind `MEDIA_BUCKET` to `shinobiwan-media`. Deployments change Worker code/configuration only; they do not rebuild `catalog/index.json` or modify R2 media.

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
npm run check:wrangler
```

The full `npm run validate` also checks application/PWA/catalog contracts and requires every Markdown document to match the active Build/Release.

## Deploy from GitHub

1. Merge reviewed Worker changes into `main` after CI is green.
2. Open **Actions → Deploy Cloudflare Workers → Run workflow**.
3. Select `public`, `admin` or `both`.
4. Enter `DEPLOY` in the confirmation field.
5. Approve `cloudflare-production`.
6. Review source SHA, Worker name, Cloudflare version ID, URL and smoke-test result.

For `both`, the private Track Manager is deployed/checked first, followed by the public media Worker.

## Post-deployment checks

Applicable checks include:

- private Worker remains protected by Cloudflare Access;
- optional service-token Track Manager response;
- public `/health` contract;
- public `/tracks` response;
- audio Range behavior and `Content-Range`;
- successful media HEAD with `Accept-Ranges: bytes`.

## Dashboard-to-repository rule

Repository code is the source of truth. Once a Worker has been deployed from GitHub, do not make unique source edits in the Cloudflare dashboard.

Both Wrangler configurations currently use `keep_vars: true` so existing dashboard-managed variables survive deployments. Moving non-sensitive variables/Access policies into infrastructure-as-code is a separate future task.

## Rollback

1. Open **Actions → Roll back Cloudflare Worker → Run workflow**.
2. Select `public` or `admin`.
3. Optionally enter a known Cloudflare version ID.
4. Enter `ROLLBACK`.
5. Approve the protected environment.
6. Verify active deployment data and smoke tests.

Worker rollback does not restore R2 objects, manifests, lyrics, covers, audio, thumbnails or `catalog/index.json`.

## Source-of-truth map

- application + Worker source / Wrangler configuration: GitHub `main`;
- web-host deployment: GitHub Pages / Cloudflare Pages from the canonical static artifact;
- active Worker versions: Cloudflare Workers deployment state;
- credentials: GitHub `cloudflare-production` environment;
- track manifests/media/catalog: Cloudflare R2;
- Cloudflare Access policies: Cloudflare account configuration until a future infrastructure-as-code migration.
