# LaunchPAD deployment topology

> Current application build: `2026.08.08.66` — release `studio-metadata-validation-20260808`.

## One source of truth

`main` is the only authoritative application source. No deployment branch, hosted editor, dashboard copy or generated bundle may become a second source of truth. Named `safety/*` branches are rollback snapshots only and are never development sources.

```text
                         GitHub repository
                              main
                               |
                     validated Build 66
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
          launchpad-media            launchpad-r2-api v5.9
                  |                   + Studio bridge v1.1
                  +------------+------------+
                               |
                        Cloudflare R2
                      shinobiwan-media
```

## Canonical Build 66

The current application release is defined only in `js/build-config.js`:

```text
id       20260808-studio-metadata-validation-v66
cache    shinobi-launchpad-v66
display  2026.08.08.66
release  studio-metadata-validation-20260808
```

Every Markdown document must carry the same display/release markers; CI rejects stale documentation. The cache namespace advances with Build 66 while the private Track Manager contract advances independently to v5.9 / Studio bridge v1.1.

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
- **unchanged by Build 66**

### Private Track Manager Worker

- service: `launchpad-r2-api`
- repository Track Manager contract: **v5.9**
- Studio bridge contract: **v1.1**
- protected by Cloudflare Access
- purpose: same-origin Track Manager production writes plus private Studio integration
- R2 binding: `MEDIA_BUCKET`
- existing write routes remain same-origin protected

Studio bridge routes:

```text
OPTIONS /api/studio/*
GET     /api/studio/health
GET     /api/studio/tracks
GET     /api/studio/tracks/<trackId>
POST    /api/studio/tracks/<trackId>/metadata/validate
```

The allowed browser Origin is exactly `https://shinobione.github.io`. Studio data remains Access-authenticated.

The Build 66 POST is validation-only: it requires the Studio intent header, JSON, `expectedUpdatedAt`, a metadata whitelist and returns a normalized/quality-checked proposal without writing the manifest, catalog or R2 objects. Health reports `validate: ["metadata"]` and still reports `write: []`.

POST preflight is accepted only on the exact metadata-validation route. Every other `POST`, `PUT`, `PATCH` and `DELETE` keeps the historical Track Manager same-origin enforcement.

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

Timestamped `lyrics.txt` is already synchronized content. Build 66 adds no required `.lrc` object, performs no R2 migration and does not rebuild the catalog merely by validating metadata.

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

For Build 66, after source merge and CI, only the **admin Worker** needs a deployment. No R2 rebuild or public Worker deployment is implied.

Merged head branches are automatically deleted. `safety/pre-studio-integration-20260808-1048` remains the global rollback reference; `safety/pre-phase-4b1a-20260808-1452` is the immediate pre-validation snapshot.

## Rules preventing split-brain

1. `main` is the only normal source of truth.
2. Safety branches are rollback references, not development branches.
3. GitHub Pages never checks out a recovery/deployment branch.
4. Cloudflare Pages tracks `main` and contains no unique runtime patch.
5. Web deployment scripts may copy/validate runtime files but may not mutate them.
6. Temporary feature branches are disposable and auto-deleted after merge.
7. Build numbers advance only in `js/build-config.js`.
8. Every `.md` file advances with every new build and is validated by CI.
9. Workers and R2 remain separate backend/data concerns.
10. Lovable is prototype-only unless explicitly promoted through GitHub.
11. Studio integration must be additive and reversible.
12. Build 66 may validate a metadata proposal cross-origin but may not mutate production state.
13. Real cross-origin writes require a later separately versioned security-reviewed phase; do not turn `/metadata/validate` into save by stealth.

## Compatibility debt

A few active filenames still contain historical host/version names, including `build-cloudflare-pages.mjs`, `validate-cloudflare-pages-build.mjs`, `navigation-stability-v39.js` and `ui-stability-v39.css`.

They remain because external deployment configuration or regression-tested runtime wiring still references them. The versioned public Worker wrapper and legacy migration manifest/backend routes are also still live contracts. Rename/remove them only through dedicated, tested refactors.
