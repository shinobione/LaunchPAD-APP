# SHINOBIWAN LaunchPAD

Installable music PWA for the SHINOBIWAN catalog: playback, albums, synchronized lyrics, Audio Lab visuals, favorites, queues, Track DNA and shareable track experiences.

## Current release

**Canonical application build:** `2026.08.07.40`  
**Release:** `unified-v40-20260807`  
**Source of truth:** `main`

Public / staging hosts:

- GitHub Pages: `https://shinobione.github.io/LaunchPAD-APP/`
- Cloudflare Pages staging: `https://shinobiwan-launchpad-staging.pages.dev/`

The two web hosts are mirrors of the same validated repository runtime. Neither host is an editable source of truth.

## Architecture at a glance

```text
GitHub main
   |
   +--> GitHub Pages ---------+
   |                          |
   +--> Cloudflare Pages -----+--> LaunchPAD PWA
                                      |
                         +------------+------------+
                         |                         |
                         v                         v
                launchpad-media Worker    launchpad-r2-api Worker
                         |                         |
                         +------------+------------+
                                      |
                               Cloudflare R2
```

- **GitHub `main`** — canonical application and infrastructure source.
- **GitHub Pages** — public static PWA host.
- **Cloudflare Pages** — staging/preview static PWA host.
- **Cloudflare R2** — canonical production media and track manifests.
- **Public Worker (`launchpad-media`)** — read-only catalog/media API and HTTP Range streaming; repository contract v2.6.
- **Private Worker (`launchpad-r2-api`)** — Track Manager behind Cloudflare Access; repository Track Manager contract v5.7.
- **Lovable** — external prototyping only unless a future migration is explicitly promoted back through this repository and `main`.

See [`docs/DEPLOYMENT-TOPOLOGY.md`](docs/DEPLOYMENT-TOPOLOGY.md) for the authoritative deployment map and anti-split-brain rules.

## Canonical media model

Production media lives in R2:

```text
catalog/index.json
tracks/<slug>/manifest.json
tracks/<slug>/audio.<ext>
tracks/<slug>/cover.<ext>
tracks/<slug>/thumbnail.webp
tracks/<slug>/lyrics.txt      # optional
tracks/<slug>/video.<ext>     # optional
```

The public application hydrates its catalog through the public Worker. Localhost/CI may use deterministic fixtures; production must not silently substitute a bundled production catalog.

## Local development

```bash
npm ci
python3 -m http.server 4173
```

Then open `http://127.0.0.1:4173/`.

A local HTTP server is required for ES modules, media behavior and the service worker.

## Validation

Before merging application or infrastructure changes:

```bash
npm run validate
npm run check:wrangler
```

CI additionally checks browser navigation, PWA/service-worker behavior, catalog contracts, Cloudflare bundles and desktop overflow regressions.

The important rule is simple: **tests protect current behavior, not historical build-number strings.**

## Deployment

### Web application

A merge to `main` is the only supported source transition.

- GitHub Pages deploys the validated static runtime through `.github/workflows/deploy-github-pages.yml`.
- Cloudflare Pages staging tracks the same `main` source.
- The current compatibility build scripts are `scripts/build-cloudflare-pages.mjs` and `scripts/validate-cloudflare-pages-build.mjs`; despite their historical names, they copy and validate the runtime verbatim and do not patch application files.

### Cloudflare Workers

Workers are a separate release operation. Use the protected **Deploy Cloudflare Workers** workflow from `main`; do not infer Worker deployment from a web-app merge.

Required GitHub environment secrets:

- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_API_TOKEN`

A Worker deployment does not rebuild `catalog/index.json`. Rebuild the public catalog explicitly through Track Manager when manifests/lyrics require it.

## Project map

```text
index.html                    Static application shell
css/                          UI, responsive and feature styles
js/
  build-config.js             Single application release/version source
  app-engine*.js              Boot and recovery bootstrap
  app-main.js                 Main application composition
  core/                       Shared catalog/router/player/theme state
  features/                   User-facing modules
cloudflare/                   Public/private Worker source and Wrangler configs
scripts/                      Validation, build and deployment tooling
tests/                        Browser regression fixtures
docs/                         Operational and architecture documentation
.github/workflows/            CI and deployment workflows
```

Useful documents:

- [`ARCHITECTURE.md`](ARCHITECTURE.md) — runtime/module structure
- [`docs/DEPLOYMENT-TOPOLOGY.md`](docs/DEPLOYMENT-TOPOLOGY.md) — canonical hosting/deployment topology
- [`RELEASE-CHECKLIST.md`](RELEASE-CHECKLIST.md) — safe release procedure
- [`ROADMAP.md`](ROADMAP.md) — remaining consolidation/product work
- [`cloudflare/README.md`](cloudflare/README.md) — Workers/R2 operations

## Repository rules

1. `main` is the only source of truth.
2. Do not edit production code only in Cloudflare, GitHub Pages, `gh-pages`, Lovable or a generated `dist/` directory.
3. Temporary `agent/`, `fix/`, `hotfix/`, `migration/` and `release/` branches should be deleted after merge/abandonment.
4. Do not restore the old `gh-pages` recovery branch as a deployment source.
5. Advance application versions only in `js/build-config.js`.
6. Keep Worker deployment, web deployment and R2 catalog rebuild as separate explicit states.
7. Preserve the Audio Lab sanctuary guarantees for validated renderers unless a dedicated change intentionally updates their regression hashes.

## Build 40 consolidation note

Build 40 reconciled the previously divergent Cloudflare v39 line and GitHub `main` line. It also restored GitHub Pages from the canonical `main` artifact, removed the stale `gh-pages` recovery checkout, fixed single-owner track routing and prevents the old second stylesheet paint.

Historical branch names and a few compatibility filenames may still exist remotely. They are cleanup debt, **not active architecture**.
