# LaunchPAD deployment topology

> Current application build: `2026.08.08.62.1` — release `ui-polish-62-1-20260808`.

## One source of truth

`main` is the only authoritative application source. No deployment branch, hosted editor, dashboard copy or generated bundle may become a second source of truth.

```text
                         GitHub repository
                              main
                               |
                    validated Build 62.1
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
          launchpad-media            launchpad-r2-api
                  |                         |
                  +------------+------------+
                               |
                        Cloudflare R2
                      shinobiwan-media
```

## Canonical Build 62.1

The current application release is defined only in `js/build-config.js`:

```text
id       20260808-ui-polish-v62-1
cache    shinobi-launchpad-v62-1
display  2026.08.08.62.1
release  ui-polish-62-1-20260808
```

Every Markdown document must carry the same display/release markers; CI rejects stale documentation. The cache namespace advances with Build 62.1 so the Studio/Audio Lab/mobile-player polish and the corrected visible build marker cannot remain hidden behind Build 61 shell assets.

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

### Private Track Manager Worker

- service: `launchpad-r2-api`
- repository Track Manager contract: v5.7
- protected by Cloudflare Access
- purpose: upload/edit/publish tracks, derive metadata and rebuild `catalog/index.json`
- R2 binding: `MEDIA_BUCKET`

Worker deployment and web-host deployment are intentionally separate operations.

## R2

`shinobiwan-media` is the canonical media and track-manifest store:

```text
catalog/index.json
tracks/<slug>/manifest.json
tracks/<slug>/audio.<ext>
tracks/<slug>/cover.<ext>
tracks/<slug>/thumbnail.webp
tracks/<slug>/lyrics.txt      # optional
tracks/<slug>/video.<ext>     # optional
```

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

Merged head branches are automatically deleted. `main` is the only persistent repository branch.

## Rules preventing split-brain

1. `main` is the only source of truth.
2. GitHub Pages never checks out a recovery/deployment branch.
3. Cloudflare Pages tracks `main` and contains no unique runtime patch.
4. Deployment scripts may copy/validate runtime files but may not mutate them.
5. Temporary branches are disposable and auto-deleted after merge.
6. Build numbers advance only in `js/build-config.js`.
7. Every `.md` file advances with every new build and is validated by CI.
8. Workers and R2 remain separate backend/data concerns.
9. Lovable is prototype-only unless explicitly promoted through GitHub.

## Compatibility debt

A few active filenames still contain historical host/version names, including `build-cloudflare-pages.mjs`, `validate-cloudflare-pages-build.mjs`, `navigation-stability-v39.js` and `ui-stability-v39.css`.

They remain because external deployment configuration or regression-tested runtime wiring still references them. The versioned public Worker wrapper and legacy migration manifest/backend routes are also still live contracts. Rename/remove them only through dedicated, tested refactors.
