# LaunchPAD Cloudflare services

> Current application build: `2026.08.08.66` — release `studio-metadata-validation-20260808`.

Current backend contracts: public media Worker **v2.6**, private Track Manager **v5.11**, Studio bridge **v1.3**.

Cloudflare provides three separate LaunchPAD concerns:

1. **Cloudflare Pages** — staging host for the static PWA built from GitHub `main`.
2. **Workers** — public media/catalog API and private Track Manager.
3. **R2** — canonical production track/media storage.

Cloudflare is not an alternate application source repository. See [`../docs/DEPLOYMENT-TOPOLOGY.md`](../docs/DEPLOYMENT-TOPOLOGY.md).

## Cloudflare Pages staging

```text
https://shinobiwan-launchpad-staging.pages.dev/
```

The Pages project tracks `main`. Build 66 remains the active public LaunchPAD build; later Track Manager v5.10/v5.11 changes are private Worker-only backend revisions and do not advance the public PWA build.

## Public media Worker

- service: `launchpad-media`
- repository contract: **v2.6**
- public read-only access
- binding: `MEDIA_BUCKET` → `shinobiwan-media`
- exposes catalog/track/media resources
- supports HTTP Range streaming

The public Worker was not redeployed for Studio metadata validation/save work.

## Private Track Manager Worker

- service: `launchpad-r2-api`
- repository contract: **v5.11**
- protected by Cloudflare Access
- binding: `MEDIA_BUCKET` → `shinobiwan-media`
- existing same-origin Track Manager UI remains the full operational write fallback
- Studio bridge exposes private reads, metadata validation and one guarded metadata-only save

Private source is stored as ordered parts in `cloudflare/admin-worker.parts/*.part` and assembled by `scripts/build-admin-worker.mjs`.

Build the dashboard-compatible bundle with:

```bash
npm run build:admin-worker
```

## Studio bridge — v1.3

Current Studio bridge surface:

```text
GET  /api/studio/health
GET  /api/studio/tracks
GET  /api/studio/tracks/<slug>
POST /api/studio/tracks/<slug>/metadata/validate
POST /api/studio/tracks/<slug>/metadata/save
```

Current health capability contract:

```json
{
  "read": ["tracks", "track"],
  "validate": ["metadata"],
  "write": ["metadata"]
}
```

Security/behavior rules:

- all Studio data remains behind Cloudflare Access JWT verification;
- browser origin is restricted to `https://shinobione.github.io`;
- metadata POSTs use CORS-simple `Content-Type: text/plain` JSON-text bodies to avoid the proven Access/OPTIONS preflight failure;
- validation intent is `metadata-validate-v1`;
- save intent is `metadata-save-v1`;
- both validation and save require canonical `expectedUpdatedAt` stale protection;
- metadata is whitelist-only and cannot replace slug, assets, migration/provenance or server-owned timestamps;
- validation is non-mutating;
- save can write only canonical manifest metadata + the required `catalog/index.json` rebuild;
- the metadata save module contains no media upload/delete plumbing;
- every unrelated Track Manager `POST`, `PUT`, `PATCH` and `DELETE` remains behind the historical same-origin boundary;
- no Cloudflare Access secret or permanent browser admin token is shipped to GitHub Pages.

Track Manager v5.11 production Worker Version ID:

```text
8bd802ec-0c2b-47ce-aebb-83f6190d5b73
```

Protected deployment workflow run:

```text
31264114407
```

Deployment target was `admin` only; public Worker steps were skipped.

## Metadata save production proof

The guarded Studio metadata write has been proven end-to-end in the real browser on `soft-addiction`.

Smoke write:

- changed field: `keyConfidence` only;
- temporary value: `0.01`;
- canonical revision: `2026-08-08T16:21:15.503Z`;
- catalog rebuilt: yes;
- browser canonical reread: verified;
- media untouched.

Restoration write:

- `keyConfidence` restored to original empty/null state;
- canonical revision: `2026-08-08T16:22:10.890Z`;
- catalog rebuilt: yes;
- browser canonical reread: verified;
- quality: `ready`;
- publishable: yes;
- errors/warnings: `0 / 0`;
- media untouched.

Preferred current rollback reference:

```text
safety/post-metadata-write-proven-20260808-1822
```

See [`../docs/STUDIO-METADATA-WRITE.md`](../docs/STUDIO-METADATA-WRITE.md).

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

### Lyrics contract

Track Manager already enforces `.txt` for `kind=lyrics` uploads.

Synchronization is content-derived:

- canonical source is `lyrics.txt`;
- bracketed/naked timestamps in its text drive `timestampsAvailable`;
- a separate `.lrc` sidecar is not required by Track Manager and must not become a mandatory second source of truth.

Phase 4B.2 audit: [`../docs/STUDIO-LYRICS-WRITE-AUDIT.md`](../docs/STUDIO-LYRICS-WRITE-AUDIT.md).

## Validation

```bash
npm ci
npm run validate
npm run check:wrangler
```

`npm run validate` verifies public app behavior, documentation/build coherence and Studio bridge security boundaries. Worker-specific guards verify metadata validation remains non-mutating and metadata save remains isolated from media operations.

## Worker deployment

Workers deploy separately from the PWA/web hosts. From `main`, use **Deploy Cloudflare Workers** and select `public`, `admin` or `both` through the protected `cloudflare-production` environment.

Required secrets:

- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_API_TOKEN`

Worker deployment changes code only. It does not automatically invoke metadata save, rebuild `catalog/index.json` or modify media objects.

For private Track Manager-only releases, deploy **admin only** unless public Worker behavior actually changed.

## Operational rules

1. GitHub `main` remains the code authority.
2. Do not paste unique production fixes into Cloudflare dashboards/Pages.
3. Keep Cloudflare Access only on the private admin service.
4. Keep R2 media/catalog state separate from Git history.
5. Record source SHA, Worker version, web deployment and catalog mutation as separate facts.
6. Studio integration must remain additive and reversible; do not weaken Track Manager writes to solve browser CORS.
7. Safety branches are rollback references only and must never become development branches.
8. Current known-good checkpoint after the first write + restoration proof is `safety/post-metadata-write-proven-20260808-1822`.
