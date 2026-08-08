# LaunchPAD Cloudflare services

> Current application build: `2026.08.08.65` — release `studio-private-read-bridge-20260808`.

Current backend contracts: public media Worker **v2.6**, private Track Manager **v5.8**.

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

The builder copies the runtime verbatim. A Pages deployment must never contain a host-only patch missing from `main`. Build 65 advances the PWA cache namespace to `shinobi-launchpad-v65`; its functional backend change is isolated to the private Track Manager contract rather than the public LaunchPAD media path.

## Public media Worker

- service: `launchpad-media`
- repository contract: v2.6
- public read-only access
- binding: `MEDIA_BUCKET` → `shinobiwan-media`
- exposes catalog/track/media resources
- supports HTTP Range streaming

Source/config lives under `cloudflare/public-worker*.js` and `cloudflare/wrangler.public.jsonc`.

**Build 65 does not change this Worker.**

## Private Track Manager Worker

- service: `launchpad-r2-api`
- repository contract: **v5.8**
- protected by Cloudflare Access
- binding: `MEDIA_BUCKET` → `shinobiwan-media`
- creates/edits manifests, uploads media, derives metadata and rebuilds `catalog/index.json`
- keeps all historical write routes protected by same-origin enforcement
- adds a separate GET-only SHINOBIWAN Studio read namespace in v5.8

Private source is stored as ordered parts in `cloudflare/admin-worker.parts/*.part`.

Build the dashboard-compatible bundle with:

```bash
npm run build:admin-worker
```

### Studio private read bridge — v1.0

Build 65 adds only these integration routes:

```text
OPTIONS /api/studio/*
GET     /api/studio/health
GET     /api/studio/tracks
GET     /api/studio/tracks/<slug>
```

Security rules:

- Studio data GETs remain behind Cloudflare Access JWT verification.
- Browser CORS is allowlisted only to `https://shinobione.github.io`.
- Preflight advertises only `GET, OPTIONS`.
- The health contract explicitly exposes `write: []`.
- Existing `POST`, `PUT`, `PATCH` and `DELETE` routes still execute `enforceSameOrigin()`.
- No Cloudflare Access secret or permanent service token is moved into GitHub Pages.

Validate the boundary with:

```bash
npm run check:studio-private-read-bridge
```

## Canonical R2 layout

```text
catalog/index.json
tracks/<slug>/manifest.json
tracks/<slug>/audio.<ext>
tracks/<slug>/cover.<ext>
tracks/<slug>/thumbnail.webp
tracks/<slug>/lyrics.txt      # optional; may contain synchronization timestamps
tracks/<slug>/video.<ext>     # optional
```

A timestamped canonical `lyrics.txt` is synchronized content. A separate `.lrc` sidecar is optional compatibility/export data rather than a required second source of truth.

## Validation

```bash
npm ci
npm run validate
npm run check:wrangler
```

`npm run validate` also verifies that **every Markdown file matches the active Build/Release** from `js/build-config.js`. Documentation drift is therefore a CI failure, not a manual cleanup task. Build 65 additionally verifies that the Studio namespace cannot silently acquire cross-origin write capability.

## Worker deployment

Workers deploy separately from the PWA/web hosts. From `main`, use **Deploy Cloudflare Workers** and select `public`, `admin` or `both` through the protected `cloudflare-production` environment.

Required secrets:

- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_API_TOKEN`

Worker deployment changes code only. It does not automatically rebuild `catalog/index.json` or modify track/media objects.

For Build 65, deploy **admin only** after source PR/CI is green and merged. The public Worker contract is unchanged.

## Recommended order for backend changes

1. Merge reviewed source into `main` after CI passes.
2. Deploy the private Worker if Track Manager/catalog generation changed.
3. For Build 65, verify existing Track Manager create/edit/delete from its own origin before connecting Studio.
4. Verify `/api/studio/health` from the allowed Studio origin after Access authentication and confirm disallowed origins are rejected.
5. Rebuild `catalog/index.json` only if derived catalog data changed; Build 65 itself does not require a rebuild.
6. Deploy the public Worker only if public API/media behavior changed; Build 65 does not.
7. Independently verify GitHub Pages and Cloudflare Pages.

## Operational rules

1. Do not paste unique production application fixes into Cloudflare Pages.
2. Avoid dashboard Worker source editing once repository deployment is reproducible.
3. Keep Cloudflare Access only on the private admin service.
4. Keep R2 media/catalog state separate from Git history.
5. Record source SHA, Worker version and catalog rebuild as separate facts.
6. A failed Cloudflare Pages build leaves the previous successful staging deployment active; it does not roll back `main`.
7. Studio integration must remain additive and reversible; do not weaken Track Manager writes to solve browser CORS.
8. Pre-integration rollback reference: `safety/pre-studio-integration-20260808-1048`.
