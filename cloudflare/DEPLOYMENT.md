# Reproducible Cloudflare deployments

LaunchPAD deploys its two Cloudflare Workers from reviewed code on `main` through GitHub Actions and the project-pinned Wrangler version.

## Production services

| Target | Worker | URL | Access |
| --- | --- | --- | --- |
| `public` | `launchpad-media` | `https://launchpad-media.jerryquinet.workers.dev` | Public read-only |
| `admin` | `launchpad-r2-api` | `https://launchpad-r2-api.jerryquinet.workers.dev` | Cloudflare Access |

Both Workers bind `MEDIA_BUCKET` to the existing `shinobiwan-media` R2 bucket. Deployments change Worker code and configuration only; they do not rebuild `catalog/index.json` and do not modify R2 media.

## One-time GitHub setup

Create a GitHub environment named `cloudflare-production` and add these required environment secrets:

- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_API_TOKEN`

Create the API token from Cloudflare's **Edit Cloudflare Workers** template, restrict it to the LaunchPAD account, and grant no unrelated account or zone resources.

For a fully authenticated Track Manager smoke test, optionally create a Cloudflare Access service token accepted by the Track Manager Access application and add:

- `CLOUDFLARE_ACCESS_CLIENT_ID`
- `CLOUDFLARE_ACCESS_CLIENT_SECRET`

Without those optional secrets, CI still verifies that the private Worker is not publicly reachable and that unauthenticated requests are intercepted by Cloudflare Access.

Recommended GitHub environment protection:

1. Require approval before production jobs start.
2. Restrict deployment branches to `main`.
3. Keep all Cloudflare credentials as environment secrets rather than repository secrets.

## Pre-deployment validation

Every pull request runs the Worker validation workflow, which:

1. validates the versioned public Worker source;
2. rebuilds and syntax-checks the private Track Manager bundle;
3. checks the operational deployment scripts;
4. performs Wrangler dry-runs for both production configurations.

The production workflow repeats those checks before uploading anything.

## Deploy from GitHub

1. Merge the reviewed Worker change into `main` after both CI workflows are green.
2. Open **Actions → Deploy Cloudflare Workers → Run workflow**.
3. Select `public`, `admin`, or `both`.
4. Enter `DEPLOY` in the confirmation field.
5. Approve the `cloudflare-production` environment when prompted.
6. Review the job summary for the source SHA, Worker name, Cloudflare version ID, deployment URL, and smoke-test result.

For `both`, the private Track Manager is deployed and checked first, followed by the public media Worker.

### Post-deployment checks

The workflow automatically verifies:

- private Worker: Cloudflare Access still blocks anonymous access;
- private Worker with optional service token: the Track Manager UI responds and exposes the expected version;
- public `/health`: service identity, expected version, and canonical track count;
- public `/tracks`: non-empty catalog and consistent count;
- audio streaming: a one-byte Range request returns HTTP `206` with `Content-Range`;
- full audio metadata: a HEAD request returns HTTP `200` and `Accept-Ranges: bytes`.

The structured Wrangler output is parsed into the GitHub job summary so each production version can be traced back to its Git SHA.

## First repository-driven deployment

Use a deliberately staged first migration from Dashboard deployment:

1. Confirm `POLICY_AUD` and `TEAM_DOMAIN` still exist on `launchpad-r2-api` in Cloudflare.
2. Confirm Cloudflare Access protects `launchpad-r2-api`.
3. Dispatch the workflow for `public` and verify the complete smoke test.
4. Dispatch it for `admin` and verify Access plus the Track Manager version.
5. Record both GitHub run URLs and Cloudflare version IDs.
6. Stop editing Worker source in the Cloudflare dashboard after the first successful repository-driven deployment.

Both Wrangler configurations currently use `keep_vars: true`. This intentionally preserves the existing Dashboard variables during the migration. Secrets are not deleted by Wrangler deployments. A later infrastructure-as-code phase can move non-sensitive variables and Access policies under explicit version control.

## Rollback

1. Open **Actions → Roll back Cloudflare Worker → Run workflow**.
2. Select `public` or `admin`.
3. Optionally enter a known Cloudflare version ID. Leave it blank to restore the previous deployment.
4. Enter `ROLLBACK` in the confirmation field.
5. Approve the `cloudflare-production` environment.
6. Review the active deployment data and post-rollback smoke test in the job summary.

A Worker rollback changes the active Worker version immediately. It does not restore R2 objects, manifests, lyrics, covers, audio, thumbnails, or `catalog/index.json`.

## Local operational commands

```bash
npm ci
npm run validate:cloudflare
npm run check:wrangler
npm run verify:cloudflare:public
npm run verify:cloudflare:admin
```

The admin verification command checks anonymous Access protection unless the two optional service-token environment variables are present.

## Source of truth

- Worker source and Wrangler configuration: GitHub repository
- Worker deployment history and active version: Cloudflare Workers deployments
- Production credentials: GitHub `cloudflare-production` environment
- Track manifests and media: R2
- Cloudflare Access application and policies: Cloudflare account configuration until a later infrastructure-as-code migration
