# LaunchPAD Cloudflare services

_Current repository contracts: public media Worker v2.6, private Track Manager v5.7, application Build 40._

Cloudflare provides three separate LaunchPAD concerns:

1. **Cloudflare Pages** — staging host for the static PWA built from GitHub `main`.
2. **Workers** — public media/catalog API and private Track Manager.
3. **R2** — canonical production track/media storage.

Cloudflare is not an alternate application source repository. See [`../docs/DEPLOYMENT-TOPOLOGY.md`](../docs/DEPLOYMENT-TOPOLOGY.md).

## Services

### Cloudflare Pages staging

```text
https://shinobiwan-launchpad-staging.pages.dev/
```

The Pages project tracks GitHub `main` and uses the compatibility build command:

```bash
node scripts/build-cloudflare-pages.mjs && node scripts/validate-cloudflare-pages-build.mjs
```

The output directory is:

```text
dist/cloudflare-pages
```

The builder copies the runtime verbatim. A Pages deployment must never contain a host-only patch that is missing from `main`.

The filenames/output directory still contain `cloudflare-pages` for dashboard compatibility. They can be renamed only after updating the external Pages build settings in the same maintenance window.

### Public media Worker

- service: `launchpad-media`
- repository contract: v2.6
- public read-only access
- binding: `MEDIA_BUCKET` → `shinobiwan-media`
- exposes catalog/track/media resources
- supports HTTP Range streaming
- must not be placed behind the private Track Manager Access policy

Public source/config lives under:

```text
cloudflare/public-worker*.js
cloudflare/wrangler.public.jsonc
```

### Private Track Manager Worker

- service: `launchpad-r2-api`
- repository Track Manager contract: v5.7
- protected by Cloudflare Access
- binding: `MEDIA_BUCKET` → `shinobiwan-media`
- required external variables/settings include the Access policy values used by the Worker
- creates/edits manifests, uploads media, derives metadata and rebuilds `catalog/index.json`

Private source is stored as ordered parts:

```text
cloudflare/admin-worker.parts/*.part
```

Build the dashboard-compatible bundle with:

```bash
npm run build:admin-worker
```

Output:

```text
dist/launchpad-r2-admin-worker.js
```

## Canonical R2 layout

```text
catalog/index.json
tracks/<slug>/manifest.json
tracks/<slug>/audio.<ext>
tracks/<slug>/cover.<ext>
tracks/<slug>/thumbnail.webp
tracks/<slug>/lyrics.txt      # optional
tracks/<slug>/video.<ext>     # optional
```

`manifest.json` is canonical per-track metadata. `catalog/index.json` is the optimized public listing generated from publishable manifests and derived metadata.

## Validation

Wrangler is pinned through the repository package lock/configuration.

```bash
npm ci
npm run validate
npm run check:wrangler
```

`npm run validate` checks application, catalog, Worker assembly and regression contracts. `npm run check:wrangler` builds the exact public/private Wrangler bundles without deploying them.

## Worker deployment

Workers are deployed separately from the PWA/web hosts.

From `main`, use the protected **Deploy Cloudflare Workers** workflow and select the intended target (`public`, `admin` or `both`). The workflow uses the `cloudflare-production` GitHub environment.

Required environment secrets:

- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_API_TOKEN`

The token must be scoped to the LaunchPAD account and minimum required deployment permissions. Never commit it.

Worker deployment changes code only. It does **not** automatically rebuild `catalog/index.json` or modify track/media objects. Data publication remains an explicit Track Manager/R2 operation.

## Recommended order for catalog/parser changes

1. Merge reviewed source changes into `main` after CI passes.
2. Deploy the private Worker if catalog-generation/Track Manager behavior changed.
3. Rebuild `catalog/index.json` if derived catalog data changed.
4. Deploy the public Worker if public API/media behavior changed.
5. Verify Access/private UI and public `/health`, `/tracks`, a full track resource and Range media behavior.
6. Independently verify GitHub Pages and Cloudflare Pages application builds.

## Operational rules

1. Do not paste a unique production application fix into Cloudflare Pages.
2. Avoid dashboard Worker source editing after repository-driven Worker deployment is proven reproducible.
3. Keep Cloudflare Access only on the private admin service.
4. Keep R2 media/catalog state separate from Git history.
5. Record source SHA, Worker deployment version and catalog rebuild as separate facts.
6. A failed Cloudflare Pages build does not roll back GitHub `main`; it simply leaves the previous successful Pages deployment active.
7. The staging Pages URL should use a clean root URL when linked externally; application hash routes are for navigation, not required for the profile homepage link.
