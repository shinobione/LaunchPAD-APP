# Reproducible Cloudflare Worker deployments

_Current repository contracts: public media Worker v2.6, private Track Manager v5.7. Web-host deployment is documented separately in [`../docs/DEPLOYMENT-TOPOLOGY.md`](../docs/DEPLOYMENT-TOPOLOGY.md)._

LaunchPAD deploys its two Cloudflare Workers from reviewed code on GitHub `main` through protected GitHub Actions and the repository-pinned Wrangler version.

Cloudflare **Pages** is a separate staging web host. A Pages deployment does not deploy Workers, and a Worker deployment does not publish a new PWA shell.

## Production services

| Target | Worker | URL | Access |
| --- | --- | --- | --- |
| `public` | `launchpad-media` | `https://launchpad-media.jerryquinet.workers.dev` | Public read-only |
| `admin` | `launchpad-r2-api` | `https://launchpad-r2-api.jerryquinet.workers.dev` | Cloudflare Access |

Both Workers bind `MEDIA_BUCKET` to the existing `shinobiwan-media` R2 bucket. Deployments change Worker code/configuration only; they do not rebuild `catalog/index.json` and do not modify R2 media.

## GitHub environment setup

Use a GitHub environment named `cloudflare-production` with these required environment secrets:

- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_API_TOKEN`

Create the API token from an appropriate Cloudflare Workers deployment template, restrict it to the LaunchPAD account and grant no unrelated account/zone resources.

For a fully authenticated Track Manager smoke test, an Access service token accepted by the Track Manager Access application may also be supplied as:

- `CLOUDFLARE_ACCESS_CLIENT_ID`
- `CLOUDFLARE_ACCESS_CLIENT_SECRET`

Without those optional secrets, CI still verifies that the private Worker is not anonymously reachable and is intercepted by Cloudflare Access.

Recommended environment protection:

1. Require approval before production jobs start.
2. Restrict deployment branches to `main`.
3. Keep Cloudflare credentials as environment secrets rather than repository secrets.

## Pre-deployment validation

Pull requests validate Worker/runtime contracts before production deployment. The relevant checks include:

1. versioned public Worker source and Wrangler dry-run;
2. private Track Manager bundle rebuild/syntax checks and Wrangler dry-run;
3. operational deployment/verification scripts;
4. application/catalog regressions that depend on the Worker contracts.

The production workflow repeats deployment-critical checks before uploading anything.

## Deploy from GitHub

1. Merge the reviewed Worker change into `main` after required CI is green.
2. Open **Actions → Deploy Cloudflare Workers → Run workflow**.
3. Select `public`, `admin`, or `both`.
4. Enter `DEPLOY` in the confirmation field.
5. Approve the `cloudflare-production` environment when prompted.
6. Review the job summary for source SHA, Worker name, Cloudflare version ID, deployment URL and smoke-test result.

For `both`, the private Track Manager is deployed/checked first, followed by the public media Worker.

### Post-deployment checks

The workflow verifies the applicable service contract, including:

- private Worker: Cloudflare Access still blocks anonymous access;
- private Worker with optional service token: Track Manager responds and exposes the expected repository contract;
- public `/health`: service identity/version contract;
- public `/tracks`: usable catalog response;
- audio streaming: Range behavior and `Content-Range`;
- full media metadata: successful HEAD response and `Accept-Ranges: bytes`.

Structured Wrangler output is reported so a production version can be traced back to its Git SHA.

## Dashboard-to-repository cutover rule

Repository code is the source of truth. Once a Worker has been successfully deployed from the protected GitHub workflow, do not make unique source edits in the Cloudflare dashboard.

Both Wrangler configurations currently use `keep_vars: true` so existing dashboard-managed variables survive deployments. A future infrastructure-as-code phase can move non-sensitive variables and Access policies under explicit version control, but that is separate from application cleanup.

## Rollback

1. Open **Actions → Roll back Cloudflare Worker → Run workflow**.
2. Select `public` or `admin`.
3. Optionally enter a known Cloudflare version ID; leave it blank to restore the previous deployment when supported by the workflow.
4. Enter `ROLLBACK` in the confirmation field.
5. Approve the `cloudflare-production` environment.
6. Review active deployment data and post-rollback smoke tests.

A Worker rollback changes Worker code/version only. It does not restore R2 objects, manifests, lyrics, covers, audio, thumbnails or `catalog/index.json`.

## Local operational commands

```bash
npm ci
npm run validate:cloudflare
npm run check:wrangler
npm run verify:cloudflare:public
npm run verify:cloudflare:admin
```

The admin verification command checks anonymous Access protection unless optional service-token environment variables are present.

## Source-of-truth map

- application + Worker source / Wrangler configuration: GitHub `main`;
- web-host deployment: GitHub Pages / Cloudflare Pages from the canonical static artifact;
- Worker deployment history and active Worker version: Cloudflare Workers deployment state;
- production credentials: GitHub `cloudflare-production` environment;
- track manifests/media/catalog: Cloudflare R2;
- Cloudflare Access application/policies: Cloudflare account configuration until a later infrastructure-as-code migration.

Never use a Worker dashboard edit, Pages deployment or R2 object as a substitute for an application source change that belongs in `main`.
