# LaunchPAD deployment topology

> Current application build: `2026.08.09.67` — release `post-phase6-track-dna-release-date-20260809`.

## One source of truth

`main` is the only authoritative application source. No deployment branch, hosted editor, dashboard copy or generated bundle may become a second source of truth. Named `safety/*` branches are rollback snapshots only and are never development sources.

Lovable is prototype-only unless a future migration is explicitly promoted back through GitHub `main`.

```text
                         GitHub repository
                              main
                               |
                     validated Build 67
                               |
                +--------------+--------------+
                |                             |
                v                             v
        GitHub Pages                    Cloudflare Pages
        public web host                 staging / preview host
                |                             |
                +--------------+--------------+
                               |
                         Browser / PWA
                               |
                  +------------+------------+
                  |                         |
                  v                         v
          public media Worker        private admin Worker
          launchpad-media v2.6       launchpad-r2-api v5.15
                                     Studio bridge v1.7
                  |                         |
                  +------------+------------+
                               |
                        Cloudflare R2
                      shinobiwan-media
```

## Canonical public Build 67

The public application release is defined only in `js/build-config.js`:

```text
id       20260809-post-phase6-track-dna-release-date-v67
cache    shinobi-launchpad-v67
display  2026.08.09.67
release  post-phase6-track-dna-release-date-20260809
revision track-dna-release-date-1
```

Build 67 is a public UI/PWA maintenance release correcting the Home Track DNA release-date formatter. It does not imply a Worker deployment or R2 mutation.

`README.md` is the living public build marker. Historical phase/audit Markdown documents keep the build/version state they were written to describe; they are not rewritten on every later public build.

## Web hosting

### GitHub Pages

```text
https://shinobione.github.io/LaunchPAD-APP/
```

`.github/workflows/deploy-github-pages.yml` builds, validates and deploys the static artifact from `main`.

### Cloudflare Pages staging

```text
https://shinobiwan-launchpad-staging.pages.dev/
```

The staging project tracks `main`. Generated `dist/cloudflare-pages/` output is never source.

## Backend services

### Public Worker

- service: `launchpad-media`;
- repository contract: **v2.6**;
- purpose: public catalog, track detail and Range-capable media delivery;
- R2 binding: `MEDIA_BUCKET`;
- public/read-only surface;
- unchanged by the private Phase 5/6 Studio integration and by Build 67.

### Private Track Manager Worker

- service: `launchpad-r2-api`;
- deployed Track Manager contract: **v5.15**;
- deployed Studio bridge contract: **v1.7**;
- protected by Cloudflare Access;
- purpose: Track Manager production writes plus the private Studio integration;
- R2 binding: `MEDIA_BUCKET`;
- deployed source head: `23a7b494b89d4958f573f0889057b53a44aa23b6`;
- protected deployment run: `31288949405`;
- deployment target: `admin`;
- public Worker deployment was not required by that Phase 6 deployment.

The private Worker supports the established Track Manager operations plus the versioned Studio capabilities introduced across Phases 4–6.

Current Studio families include:

```text
GET  /api/studio/health
GET  /api/studio/tracks
GET  /api/studio/tracks/<slug>

POST /api/studio/tracks/<slug>/metadata/validate
POST /api/studio/tracks/<slug>/metadata/save

GET  /api/studio/tracks/<slug>/lyrics
POST /api/studio/tracks/<slug>/lyrics/validate
POST /api/studio/tracks/<slug>/lyrics/save

POST /api/studio/tracks/create
POST /api/studio/tracks/<slug>/assets/<kind>/upload
POST /api/studio/tracks/<slug>/assets/<kind>/delete
POST /api/studio/catalog/rebuild

GET  /api/studio/tracks/<slug>/analysis/sonictrace
POST /api/studio/tracks/<slug>/analysis/sonictrace
GET  /api/studio/analysis/sonictrace

GET  /api/studio/tracks/<slug>/lyrics/context
POST /api/studio/tracks/<slug>/lyrics/sync/validate
POST /api/studio/tracks/<slug>/lyrics/sync/save
```

Protected canonical media reads used by Studio also support HTTP single-byte `Range` requests and return `206` / `416` as appropriate, without weakening Access or exact-origin credentialed CORS.

## Cloudflare Access / CORS boundary

The allowed Studio browser origin is exactly:

```text
https://shinobione.github.io
```

Rules:

- Cloudflare Access verification precedes private Studio routing;
- credentialed CORS never uses `*`;
- browser control POSTs use the proven CORS-simple `text/plain;charset=UTF-8` transport where applicable;
- multipart asset uploads use browser-generated `FormData` without custom headers;
- no Access secret or R2 credential is shipped in GitHub Pages;
- unrelated legacy Track Manager mutations retain their historical same-origin enforcement.

Worker deployment and web-host deployment are intentionally separate operations.

## Canonical R2 model

`shinobiwan-media` is the canonical catalog/media store:

```text
catalog/index.json
tracks/<slug>/manifest.json
tracks/<slug>/audio.<ext>
tracks/<slug>/cover.<ext>
tracks/<slug>/thumbnail.webp
tracks/<slug>/lyrics.txt
tracks/<slug>/video.<ext>
tracks/<slug>/analysis/sonictrace/latest.json
tracks/<slug>/analysis/sonictrace/history/<analysisId>.json
```

Lyrics contract:

```text
tracks/<slug>/lyrics.txt = only canonical lyrics source
timestamps in lyrics.txt  = synchronized lyrics
.lrc                       = optional export/compatibility only
```

An optional `.lrc` artifact cannot establish Content Health or override canonical `lyrics.txt`.

Temporary rollback material may exist only during a scoped Track Manager transaction under `_studio-backups/...`; it is not canonical track data.

## Release flow

```text
feature/fix branch
       |
       v
pull request + CI
       |
       v
      main
       |
       +--> GitHub Pages / static hosts

Worker source changes:
main --> protected manual Deploy Cloudflare Workers --> target admin/public as explicitly required

Catalog/media changes:
Track Manager operation --> R2 --> rebuild catalog/index.json only when the operation requires it
```

Do not collapse these into one status. A source merge, a Pages deployment, a Worker deployment and an R2/catalog mutation are four distinct facts.

For private Track Manager-only changes, prefer `target=admin`. Never use `both` unless both Worker surfaces actually changed.

## Current rollback references

Phase 6 final operational checkpoint:

```text
safety/phase6-complete-20260809-0513
```

Post-Phase-6 maintenance safety snapshots are separate and must not replace the Phase 6 checkpoint.

## Rules preventing split-brain

1. `main` is the normal code source of truth.
2. Safety branches are rollback references, not development branches.
3. GitHub Pages and Cloudflare Pages do not contain unique patches.
4. Generated deployment output is never source.
5. Public build numbers advance only for public runtime changes.
6. Worker versions advance independently from the public PWA build.
7. Worker deployment, Pages deployment and R2/catalog mutation remain separate explicit states.
8. `lyrics.txt` is the only canonical lyrics source.
9. Track Manager remains the protected write authority for R2-backed Studio workflows.
10. Phase 7 must not start without explicit user authorization.

## Compatibility debt

Some active filenames still carry historical version names (`navigation-stability-v39.js`, `ui-stability-v39.css`, etc.). They remain because regression-tested runtime wiring still references them. Rename or remove them only through a dedicated tested refactor, never as incidental cleanup.
