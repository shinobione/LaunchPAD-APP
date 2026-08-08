# LaunchPAD Cloudflare services

> Current application build: `2026.08.08.66` — release `studio-metadata-validation-20260808`.

Current backend contracts: public media Worker **v2.6**, private Track Manager **v5.9**, Studio bridge **v1.1**.

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

The builder copies the runtime verbatim. A Pages deployment must never contain a host-only patch missing from `main`. Build 66 advances the PWA cache namespace to `shinobi-launchpad-v66`; its functional backend change is isolated to the private Track Manager validation contract rather than the public LaunchPAD media path.

## Public media Worker

- service: `launchpad-media`
- repository contract: v2.6
- public read-only access
- binding: `MEDIA_BUCKET` → `shinobiwan-media`
- exposes catalog/track/media resources
- supports HTTP Range streaming

Source/config lives under `cloudflare/public-worker*.js` and `cloudflare/wrangler.public.jsonc`.

**Build 66 does not change this Worker.**

## Private Track Manager Worker

- service: `launchpad-r2-api`
- repository contract: **v5.9**
- protected by Cloudflare Access
- binding: `MEDIA_BUCKET` → `shinobiwan-media`
- existing same-origin UI remains the only production write surface
- Studio bridge keeps private reads and adds one validation-only POST
- no cross-origin manifest/media/catalog write is enabled in Build 66

Private source is stored as ordered parts in `cloudflare/admin-worker.parts/*.part` and assembled by `scripts/build-admin-worker.mjs`.

Build the dashboard-compatible bundle with:

```bash
npm run build:admin-worker
```

### Studio bridge — v1.1

Build 66 keeps the Phase 4A reads and adds one exact Phase 4B.1A validation endpoint:

```text
OPTIONS /api/studio/*
GET     /api/studio/health
GET     /api/studio/tracks
GET     /api/studio/tracks/<slug>
POST    /api/studio/tracks/<slug>/metadata/validate
```

The POST is **not a save endpoint**.

Security/behavior rules:

- all Studio data remains behind Cloudflare Access JWT verification;
- browser CORS is allowlisted only to `https://shinobione.github.io`;
- GET preflights remain supported;
- POST preflight is accepted only for the exact `/metadata/validate` route;
- POST requires `Content-Type: application/json` and `X-Shinobiwan-Studio-Intent: metadata-validate-v1`;
- request payload requires `expectedUpdatedAt`; a stale manifest returns `409` / `STALE_MANIFEST`;
- metadata is restricted to an explicit whitelist and cannot replace slug, assets, migration/provenance or server timestamps;
- the proposed manifest is normalized and checked with Track Manager quality logic against current R2 objects;
- the endpoint returns `validationOnly: true` and does not call `writeManifest`, `writeCatalogIndex`, R2 `put/delete`, upload/delete, publication or rebuild code;
- health advertises `validate: ["metadata"]` and still advertises `write: []`;
- every other `POST`, `PUT`, `PATCH` and `DELETE` route still executes the existing same-origin Track Manager guard;
- no Cloudflare Access secret or permanent service token is moved into GitHub Pages.

Validate the boundary with:

```bash
npm run check:studio-private-read-bridge
```

The guard assembles the final Worker and also scans the validation source part for mutation primitives.

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

`npm run validate` also verifies that **every Markdown file matches the active Build/Release** from `js/build-config.js`. Documentation drift is therefore a CI failure, not a manual cleanup task. Build 66 additionally verifies that the validation-only Studio POST cannot silently become a production write path.

## Worker deployment

Workers deploy separately from the PWA/web hosts. From `main`, use **Deploy Cloudflare Workers** and select `public`, `admin` or `both` through the protected `cloudflare-production` environment.

Required secrets:

- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_API_TOKEN`

Worker deployment changes code only. It does not automatically rebuild `catalog/index.json` or modify track/media objects.

For Build 66, deploy **admin only** after source PR/CI is green and merged. The public Worker contract is unchanged.

## Recommended order for Build 66

1. Merge reviewed source into `main` only after all CI is green.
2. Confirm GitHub Pages/static deployment independently.
3. Deploy **admin Worker only** through the protected workflow.
4. Verify `/api/studio/health` reports Track Manager v5.9 / bridge v1.1, `validate: ["metadata"]`, `write: []`.
5. Verify existing authenticated Studio GET reads still work.
6. Verify the validation POST with a no-change metadata proposal returns `validationOnly: true` and leaves `updatedAt` unchanged.
7. Verify a stale `expectedUpdatedAt` returns `409` / `STALE_MANIFEST`.
8. Verify existing Track Manager create/edit/delete still works from its own origin.
9. Do **not** rebuild `catalog/index.json`; Build 66 validation does not require it.
10. Deploy the public Worker only if public API/media behavior changes; Build 66 does not.

## Operational rules

1. Do not paste unique production application fixes into Cloudflare Pages.
2. Avoid dashboard Worker source editing once repository deployment is reproducible.
3. Keep Cloudflare Access only on the private admin service.
4. Keep R2 media/catalog state separate from Git history.
5. Record source SHA, Worker version and catalog rebuild as separate facts.
6. A failed Cloudflare Pages build leaves the previous successful staging deployment active; it does not roll back `main`.
7. Studio integration must remain additive and reversible; do not weaken Track Manager writes to solve browser CORS.
8. Global pre-integration rollback reference: `safety/pre-studio-integration-20260808-1048`.
9. Immediate pre-4B.1A rollback reference: `safety/pre-phase-4b1a-20260808-1452`.
