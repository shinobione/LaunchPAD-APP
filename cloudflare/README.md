
# LaunchPAD Cloudflare architecture

The media catalog uses one private administration Worker and one public read-only Worker, both bound to the `shinobiwan-media` R2 bucket as `MEDIA_BUCKET`.

## Verified deployment status

- Public `launchpad-media`: live v2.3, 16 canonical tracks confirmed on 2026-08-03.
- Private `launchpad-r2-api`: repository source v4.5; the matching protected production deployment is not yet independently confirmed.
- Wrangler validation: merged and green for both bundles.
- Repository deployment workflow: available but not yet recorded as a successful production deployment.

## Canonical R2 layout

```text
catalog/index.json
tracks/<slug>/manifest.json
tracks/<slug>/audio.<ext>
tracks/<slug>/cover.<ext>
tracks/<slug>/thumbnail.webp # generated 512 px UI artwork
tracks/<slug>/lyrics.txt     # optional
tracks/<slug>/video.<ext>    # optional
```

The public API exposes only manifests whose `status` is `published`.

## Versioned Worker sources

The public Worker is stored directly in:

```text
cloudflare/public-worker.js
```

The larger private Track Manager is stored as ordered source parts:

```text
cloudflare/admin-worker.parts/*.part
```

Build a single dashboard-compatible Worker file with:

```bash
npm run build:admin-worker
```

The output is written to:

```text
dist/launchpad-r2-admin-worker.js
```

`npm run validate` also concatenates the parts into a temporary file and runs `node --check`, so a broken private Worker cannot pass CI.

Wrangler 4.118.0 is pinned in `package-lock.json`. The production service names, entry points and R2 binding are versioned in:

```text
cloudflare/wrangler.public.jsonc
cloudflare/wrangler.admin.jsonc
```

Validate the exact deployable bundles without contacting the production account:

```bash
npm ci
npm run check:wrangler
```

## Workers

### Private Track Manager

- Service: `launchpad-r2-api`.
- Protected by Cloudflare Access.
- Required bindings and variables:
  - `MEDIA_BUCKET` → `shinobiwan-media`
  - `POLICY_AUD`
  - `TEAM_DOMAIN`
- Creates and edits canonical manifests.
- Generates WebP thumbnails.
- Rebuilds `catalog/index.json`.
- During a rebuild, reads each lyrics file and derives `lyricsAvailable` and `timestampsAvailable`.

### Public media API

- Source: `public-worker.js`.
- Service: `launchpad-media`.
- Public read-only access; do not add Cloudflare Access.
- Binding: `MEDIA_BUCKET` → `shinobiwan-media`.
- Reads `catalog/index.json` for the fast `/tracks` response.
- Streams media with HTTP Range support.
- Serves `thumbnail.webp` for catalog cards while preserving original-cover URLs.
- Accepts bracketed LRC timestamps and standalone `mm:ss.xx` lines.

## Timestamp metadata

`/tracks` does not download full lyrics during normal operation. It relies on the derived timestamp flag stored in `catalog/index.json`.

After adding or replacing lyrics, rebuild the index through the private Track Manager. The public Worker can still inspect a full lyrics file for `/tracks/<slug>`, but the index is the authoritative fast-path metadata source.

## Deployment order for parser or index changes

1. Merge the reviewed repository changes after CI passes.
2. Run `npm run build:admin-worker` and deploy the generated private Worker.
3. Rebuild `catalog/index.json` once.
4. Deploy the matching `cloudflare/public-worker.js`.
5. Verify `/health`, `/tracks` and `/tracks/<slug>`.
6. Refresh the installed PWA after its service-worker namespace changes.

## Reproducible GitHub deployment

The `Deploy Cloudflare Workers` workflow is manual and accepts `public`, `admin` or `both`. It only runs from `main`, validates both bundles before deployment, and uses the protected `cloudflare-production` GitHub environment.

Configure these GitHub environment secrets before the first run:

- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_API_TOKEN`

The token should be scoped to the LaunchPAD Cloudflare account and only the permissions required to deploy Workers and use the existing R2 binding. Never commit either value.

Both Wrangler configurations set `keep_vars` so the existing dashboard variables are preserved. The private Worker still requires `POLICY_AUD` and `TEAM_DOMAIN` to exist in Cloudflare. Cloudflare Access protection remains an external service setting and must be checked after every private Worker deployment.

The workflow deploys code only. It does not rebuild `catalog/index.json`; perform that explicit Track Manager action only when a manifest or lyrics change requires it.

After every run, record the selected `main` SHA and verify `/health`. For the private Worker, complete the Cloudflare Access login and confirm Track Manager version 4.5. For the public Worker, confirm version 2.3, the catalog count and a byte-range media request.

## Migration cleanup

Legacy GitHub audio, per-track covers and lyrics remain temporary fallbacks. Remove them only after R2 playback, thumbnails, synchronized lyrics and Android Media Session behavior are validated.

Future tracks are created through the Track Manager form. Metadata is stored in `manifest.json`; no hand-written metadata TXT file is required.

