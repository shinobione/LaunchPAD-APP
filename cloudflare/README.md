# LaunchPAD Cloudflare services

> Current application build: `2026.08.08.62.1` — release `ui-polish-62-1-20260808`.

Current backend contracts: public media Worker **v2.6**, private Track Manager **v5.7**.

Cloudflare provides three separate LaunchPAD concerns:

1. **Cloudflare Pages** — staging host for the static PWA built from GitHub `main`.
2. **Workers** — public media/catalog API and private Track Manager.
3. **R2** — canonical production track/media storage.

Cloudflare is not an alternate application source repository. See [`../docs/DEPLOYMENT-TOPOLOGY.md`](../docs/DEPLOYMENT-TOPOLOGY.md).

## Cloudflare Pages staging

```text
https://shinobiwan-launchpad-staging.pages.dev/
```

The Pages project tracks `main` and uses the compatibility command:

```bash
node scripts/build-cloudflare-pages.mjs && node scripts/validate-cloudflare-pages-build.mjs
```

Output:

```text
dist/cloudflare-pages
```

The builder copies the runtime verbatim. A Pages deployment must never contain a host-only patch missing from `main`. Build 62.1 keeps the validated Audio Lab architecture and advances the PWA cache namespace to `shinobi-launchpad-v62-1` after the Studio/Audio Lab/mobile-player UI polish.

## Public media Worker

- service: `launchpad-media`
- repository contract: v2.6
- public read-only access
- binding: `MEDIA_BUCKET` → `shinobiwan-media`
- exposes catalog/track/media resources
- supports HTTP Range streaming

Source/config lives under `cloudflare/public-worker*.js` and `cloudflare/wrangler.public.jsonc`.

## Private Track Manager Worker

- service: `launchpad-r2-api`
- repository contract: v5.7
- protected by Cloudflare Access
- binding: `MEDIA_BUCKET` → `shinobiwan-media`
- creates/edits manifests, uploads media, derives metadata and rebuilds `catalog/index.json`

Private source is stored as ordered parts in `cloudflare/admin-worker.parts/*.part`.

Build the dashboard-compatible bundle with:

```bash
npm run build:admin-worker
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

## Validation

```bash
npm ci
npm run validate
npm run check:wrangler
```

`npm run validate` also verifies that **every Markdown file matches the active Build/Release** from `js/build-config.js`. Documentation drift is therefore a CI failure, not a manual cleanup task.

## Worker deployment

Workers deploy separately from the PWA/web hosts. From `main`, use **Deploy Cloudflare Workers** and select `public`, `admin` or `both` through the protected `cloudflare-production` environment.

Required secrets:

- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_API_TOKEN`

Worker deployment changes code only. It does not automatically rebuild `catalog/index.json` or modify track/media objects.

## Recommended order for backend changes

1. Merge reviewed source into `main` after CI passes.
2. Deploy the private Worker if Track Manager/catalog generation changed.
3. Rebuild `catalog/index.json` if derived catalog data changed.
4. Deploy the public Worker if public API/media behavior changed.
5. Verify Access/private UI and public `/health`, `/tracks`, a full track resource and Range media behavior.
6. Independently verify GitHub Pages and Cloudflare Pages.

## Operational rules

1. Do not paste unique production application fixes into Cloudflare Pages.
2. Avoid dashboard Worker source editing once repository deployment is reproducible.
3. Keep Cloudflare Access only on the private admin service.
4. Keep R2 media/catalog state separate from Git history.
5. Record source SHA, Worker version and catalog rebuild as separate facts.
6. A failed Cloudflare Pages build leaves the previous successful staging deployment active; it does not roll back `main`.
