# LaunchPAD deployment topology

> Current application build: `2026.08.08.65` — release `studio-private-read-bridge-20260808`.

## One source of truth

`main` is the only authoritative normal application source. No deployment branch, hosted editor, dashboard copy or generated bundle may become a second source of truth. Named `safety/*` branches are rollback snapshots only and are never development sources.

```text
                         GitHub repository
                              main
                               |
                     validated Build 65
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
          launchpad-media            launchpad-r2-api v5.8
                  |                   + Studio GET bridge
                  +------------+------------+
                               |
                        Cloudflare R2
                      shinobiwan-media
```

## Canonical Build 65

The current application release is defined only in `js/build-config.js`:

```text
id       20260808-studio-read-bridge-v65
cache    shinobi-launchpad-v65
display  2026.08.08.65
release  studio-private-read-bridge-20260808
```

Every Markdown document must carry the same display/release markers; CI rejects stale documentation. The cache namespace advances with Build 65 while the private Track Manager contract advances independently to v5.8.

## Web hosting

### GitHub Pages

```text
https://shinobione.github.io/LaunchPAD-APP/
```

`.github/workflows/deploy-github-pages.yml` builds, validates and deploys the static artifact from `main`. The historical `gh-pages` branch is absent and is not a deployment source.

### Cloudflare Pages staging

```text
https://shinobiwan-launchpad-staging.pages.dev/
```

The staging project tracks `main` and currently uses:

```bash
node scripts/build-cloudflare-pages.mjs && node scripts/validate-cloudflare-pages-build.mjs
```

Those compatibility scripts copy/validate the application verbatim. `dist/cloudflare-pages/` is generated output, never source.

## Backend services

### Public Worker

- service: `launchpad-media`
- repository contract: v2.6
- purpose: public catalog, track detail and Range-capable media delivery
- R2 binding: `MEDIA_BUCKET`
- **unchanged by Build 65**

### Private Track Manager Worker

- service: `launchpad-r2-api`
- repository Track Manager contract: **v5.8**
- protected by Cloudflare Access
- purpose: upload/edit/publish tracks, derive metadata and rebuild `catalog/index.json`
- R2 binding: `MEDIA_BUCKET`
- existing write routes remain same-origin protected
- Build 65 adds an additive GET-only Studio namespace

Studio bridge routes:

```text
OPTIONS /api/studio/*
GET     /api/studio/health
GET     /api/studio/tracks
GET     /api/studio/tracks/<trackId>
```

The allowed browser Origin is exactly `https://shinobione.github.io`. Studio GET data remains Access-authenticated. The bridge advertises no write capability and does not alter the historical Track Manager routes.

Worker deployment and web-host deployment are intentionally separate operations.

## R2

`shinobiwan-media` is the canonical media and track-manifest store:

```text
catalog/index.json
tracks/<slug>/manifest.json
tracks/<slug>/audio.<ext>
tracks/<slug>/cover.<ext>
tracks/<slug>/thumbnail.webp
tracks/<slug>/lyrics.txt      # optional; plain or timestamped
tracks/<slug>/video.<ext>     # optional
```

Timestamped `lyrics.txt` is already synchronized content. Build 65 does not add a required `.lrc` object and does not migrate R2.

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
       +--> GitHub Pages
       |
       +--> Cloudflare Pages staging

Worker changes:
main --> protected manual Deploy Cloudflare Workers --> Workers

Catalog/media changes:
Track Manager --> R2 --> rebuild catalog/index.json when required
```

For Build 65, after source merge and CI, only the **admin Worker** needs a deployment. No R2 rebuild or public Worker deployment is implied.

Merged head branches are automatically deleted. `safety/pre-studio-integration-20260808-1048` is retained only as a rollback snapshot during the Studio integration sequence.

## Rules preventing split-brain

1. `main` is the only normal source of truth.
2. Safety branches are rollback references, not development branches.
3. GitHub Pages never checks out a recovery/deployment branch.
4. Cloudflare Pages tracks `main` and contains no unique runtime patch.
5. Deployment scripts may copy/validate runtime files but may not mutate them.
6. Temporary feature branches are disposable and auto-deleted after merge.
7. Build numbers advance only in `js/build-config.js`.
8. Every `.md` file advances with every new build and is validated by CI.
9. Workers and R2 remain separate backend/data concerns.
10. Lovable is prototype-only unless explicitly promoted through GitHub.
11. Studio integration must be additive: Phase 4A cannot weaken or bypass Track Manager's existing write guard.
12. Cross-origin write design belongs to a later, separate security-reviewed phase.

## Compatibility debt

A few active filenames still contain historical host/version names, including `build-cloudflare-pages.mjs`, `validate-cloudflare-pages-build.mjs`, `navigation-stability-v39.js` and `ui-stability-v39.css`.

They remain because external deployment configuration or regression-tested runtime wiring still references them. The versioned public Worker wrapper and legacy migration manifest/backend routes are also still live contracts. Rename/remove them only through dedicated, tested refactors.
