# LaunchPAD Cloudflare services

> Current application build: `2026.08.08.66` — release `studio-metadata-validation-20260808`.

Current backend contracts: public media Worker **v2.6**, private Track Manager **v5.12**, Studio bridge **v1.4**.

Cloudflare provides three separate LaunchPAD concerns:

1. **Cloudflare Pages** — staging host for the static PWA built from GitHub `main`.
2. **Workers** — public media/catalog API and private Track Manager.
3. **R2** — canonical production track/media storage.

Cloudflare is not an alternate application source repository. See [`../docs/DEPLOYMENT-TOPOLOGY.md`](../docs/DEPLOYMENT-TOPOLOGY.md).

## Cloudflare Pages staging

```text
https://shinobiwan-launchpad-staging.pages.dev/
```

The Pages project tracks `main`. Build 66 remains the active public LaunchPAD build; Track Manager v5.10-v5.12 changes are private Worker-only backend revisions and do not advance the public PWA build.

## Public media Worker

- service: `launchpad-media`
- repository contract: **v2.6**
- public read-only access
- binding: `MEDIA_BUCKET` → `shinobiwan-media`
- exposes catalog/track/media resources
- supports HTTP Range streaming

The public Worker is unchanged by Phase 4B.2B.

## Private Track Manager Worker

- service: `launchpad-r2-api`
- repository contract: **v5.12**
- protected by Cloudflare Access
- binding: `MEDIA_BUCKET` → `shinobiwan-media`
- existing same-origin Track Manager UI remains the full operational write fallback
- Studio bridge exposes private catalog/track/lyrics reads, metadata validation/save and guarded existing-lyrics validation/save

Private source is stored as ordered parts in `cloudflare/admin-worker.parts/*.part` and assembled by `scripts/build-admin-worker.mjs`.

Build the dashboard-compatible bundle with:

```bash
npm run build:admin-worker
```

## Studio bridge — v1.4

Current Studio bridge surface:

```text
GET  /api/studio/health
GET  /api/studio/tracks
GET  /api/studio/tracks/<slug>
GET  /api/studio/tracks/<slug>/lyrics
POST /api/studio/tracks/<slug>/metadata/validate
POST /api/studio/tracks/<slug>/metadata/save
POST /api/studio/tracks/<slug>/lyrics/validate
POST /api/studio/tracks/<slug>/lyrics/save
```

Current health capability contract:

```json
{
  "read": ["tracks", "track", "lyrics"],
  "validate": ["metadata", "lyrics"],
  "write": ["metadata", "lyrics"]
}
```

Security/behavior rules:

- all Studio data remains behind Cloudflare Access JWT verification;
- browser origin is restricted to `https://shinobione.github.io`;
- guarded Studio POSTs use CORS-simple `Content-Type: text/plain` JSON-text bodies to avoid the proven Access/OPTIONS preflight failure;
- metadata intents remain `metadata-validate-v1` and `metadata-save-v1`;
- lyrics intents are `lyrics-validate-v1` and `lyrics-save-v1`;
- metadata validation/save require canonical `expectedUpdatedAt` stale protection;
- lyrics validation/save require both `expectedUpdatedAt` and opaque `expectedLyricsEtag`;
- lyrics write is limited to an already-existing canonical `manifest.assets.lyrics === "lyrics.txt"` object;
- missing lyrics creation and noncanonical filename migration are refused in this phase;
- timestamp synchronization remains content-derived from `lyrics.txt`;
- no `.lrc` sidecar is created;
- lyrics validation is non-mutating;
- lyrics save can replace only the canonical lyrics object, update server-owned manifest revision fields and rebuild `catalog/index.json`;
- lyrics save rereads manifest + lyrics and verifies the stored text and changed R2 ETag;
- a post-write failure triggers compensating rollback of lyrics bytes/object metadata, manifest when needed and catalog projection;
- the lyrics module has no `.delete()`, multipart/FormData, audio, cover, thumbnail, video, track-delete or arbitrary metadata write path;
- every unrelated Track Manager `POST`, `PUT`, `PATCH` and `DELETE` remains behind the historical same-origin boundary;
- no Cloudflare Access secret or permanent browser admin token is shipped to GitHub Pages.

See [`../docs/STUDIO-LYRICS-WRITE.md`](../docs/STUDIO-LYRICS-WRITE.md).

## Metadata save production proof — v5.11 ancestry

The guarded Studio metadata write remains production-proven end-to-end in the real browser on `soft-addiction`.

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

Preferred current rollback references:

```text
safety/pre-4b2-lyrics-write-20260808-1837
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
tracks/<slug>/lyrics.txt      # optional; timestamps inside define synchronized state
tracks/<slug>/video.<ext>     # optional
```

### Lyrics contract

Track Manager enforces `.txt` for `kind=lyrics` uploads.

Synchronization is content-derived:

- canonical source is `lyrics.txt`;
- bracketed/naked timestamps in its text drive `timestampsAvailable`;
- a separate `.lrc` sidecar is not required and must not become a mandatory second source of truth.

Phase 4B.2 audit: [`../docs/STUDIO-LYRICS-WRITE-AUDIT.md`](../docs/STUDIO-LYRICS-WRITE-AUDIT.md).  
Implemented v5.12/v1.4 contract: [`../docs/STUDIO-LYRICS-WRITE.md`](../docs/STUDIO-LYRICS-WRITE.md).

## Validation

```bash
npm ci
npm run validate
npm run check:wrangler
```

`npm run validate` verifies public app behavior, documentation/build coherence and Studio bridge security boundaries. Worker-specific guards prove:

- metadata validation remains non-mutating;
- metadata save remains isolated from media operations;
- lyrics validation requires manifest+ETag concurrency and remains non-mutating;
- lyrics save targets only the existing canonical lyrics key;
- exactly the canonical lyrics update + rollback restore R2 puts exist in the dedicated lyrics module;
- unrelated media/delete/write paths remain unreachable from Studio.

## Worker deployment

Workers deploy separately from the PWA/web hosts. From `main`, use **Deploy Cloudflare Workers** and select `public`, `admin` or `both` through the protected `cloudflare-production` environment.

Required secrets:

- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_API_TOKEN`

Worker deployment changes code only. It does not invoke a metadata/lyrics save by itself and therefore does not rebuild `catalog/index.json` or modify track/media objects merely because v5.12 is deployed.

For Track Manager v5.12 / bridge v1.4, deploy **admin only**. Public Worker behavior did not change.

## Operational rules

1. GitHub `main` remains the code authority.
2. Do not paste unique production fixes into Cloudflare dashboards/Pages.
3. Keep Cloudflare Access only on the private admin service.
4. Keep R2 media/catalog state separate from Git history.
5. Record source SHA, Worker version, web deployment and catalog mutation as separate facts.
6. Studio integration must remain additive and reversible; do not weaken Track Manager writes to solve browser CORS.
7. Safety branches are rollback references only and must never become development branches.
8. Immediate pre-v5.12 rollback checkpoint is `safety/pre-4b2-lyrics-write-20260808-1837`.
9. Studio 0.5.2 Build 11 remains compatibility-only; do not expose a lyrics-save UI until a later phase explicitly opens it.
