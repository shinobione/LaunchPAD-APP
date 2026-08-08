# SHINOBIWAN LaunchPAD

> Current application build: `2026.08.08.56` — release `dynamic-breathing-20260808`.

Installable music PWA for the SHINOBIWAN catalog: playback, albums, synchronized lyrics, Audio Lab visuals, favorites, queues, Track DNA, Canvas/Studio experiences and shareable track cards.

## Source of truth

**GitHub `main` is the only application-code authority.**

Public / staging hosts:

- GitHub Pages: `https://shinobione.github.io/LaunchPAD-APP/`
- Cloudflare Pages staging: `https://shinobiwan-launchpad-staging.pages.dev/`

Both hosts publish the same validated runtime from `main`. Cloudflare R2 remains the canonical media/catalog store; Workers remain separate backend deployment units. Lovable is prototype-only unless a future migration is explicitly promoted back through GitHub.

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

See [`docs/DEPLOYMENT-TOPOLOGY.md`](docs/DEPLOYMENT-TOPOLOGY.md) for the authoritative hosting map.

## Build 56 highlights

Build 56 keeps the proven shared-Spectrum FFT pipeline and recalibrates **Pulse Reactor, Bass Fracture, Gravity Lens and Bio Structure** for wider visual dynamics:

- **Spectrum**, **Neon Shatter** and **Liquid Chrome** remain untouched as the trusted baseline.
- `motion-spring.js` now includes a soft-knee motion target. Low/mid signal detail is preserved while strong boosted values are compressed before they can pin a visual near its maximum pose.
- Signal-gated phase uses a sub-linear activity curve, so quiet/moderate passages retain visible movement instead of waiting for large peaks.
- **Pulse Reactor** keeps its Build 55 geometry budget but uses lower target ceilings, slower springs and signed bass/impact recoil. Rings breathe and precess through the groove instead of living fully expanded.
- **Bass Fracture** keeps the same 2/3 layer, 12/16 sector and 8/12 crack budgets. Rupture peaks are compressed; signed plate recoil, sway and crawl make the mass glide between impacts rather than remain permanently broken open.
- **Gravity Lens** keeps 4/6 bands, 12/20 arcs and 8/14 streams. Warp/shear/caustic targets now reserve headroom, while low-level precession, breathing and curved stream drift remain visible through moderate passages.
- **Bio Structure** keeps 5/8 ribs, 8/14 nerve impulses and 6/9 spine subdivisions. Its body width expands less on peaks, while spine sway, rib flex, membrane drift and heart motion remain more continuous at mid energy.
- No new visual geometry, private RAF/timer loop, random motion or secondary audio path is introduced by this pass.
- Pause/silence still drives targets to zero and spring velocity decays naturally.
- The PWA cache advances to v56 so the recalibrated motion code cannot be hidden behind Build 55 assets.

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

The public application hydrates through the public Worker. Localhost/CI may use deterministic fixtures; production must not silently substitute a bundled production catalog.

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

CI checks browser navigation, PWA/service-worker behavior, Audio Lab signal contracts, catalog contracts, Cloudflare bundles, repository cleanliness, documentation/build coherence and desktop overflow regressions.

## Release discipline

A runtime build advances in one place: `js/build-config.js`.

Every build that changes that metadata must update **all Markdown documentation** to the same `display` and `release` values. `npm run check:build-docs` enforces this so README/architecture/roadmap/deployment docs cannot silently lag behind the shipped build.

Web-host deployment, Worker deployment and R2 catalog publication remain separate states. Do not report “deployed” without saying which state changed.

## Project map

```text
index.html                    Static application shell
css/                          UI, responsive and feature styles
js/
  build-config.js             Single application release/version source
  app-engine*.js              Boot/recovery bootstrap
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
- [`CHANGELOG.md`](CHANGELOG.md) — recent build history
- [`docs/DEPLOYMENT-TOPOLOGY.md`](docs/DEPLOYMENT-TOPOLOGY.md) — canonical hosting/deployment topology
- [`RELEASE-CHECKLIST.md`](RELEASE-CHECKLIST.md) — safe release procedure
- [`ROADMAP.md`](ROADMAP.md) — remaining consolidation/product work
- [`cloudflare/README.md`](cloudflare/README.md) — Workers/R2 operations

## Repository rules

1. `main` is the only source of truth.
2. Do not edit production code only in Cloudflare, GitHub Pages, Lovable or generated `dist/` output.
3. Temporary feature/fix branches are disposable and automatically deleted after merge.
4. Advance application versions only in `js/build-config.js`.
5. Update every `.md` file for every new build; CI validates the build/release markers.
6. Keep Worker deployment, web deployment and R2 catalog rebuild as separate explicit states.
7. Spectrum remains the Audio Lab reference path; every visual effect must consume the real FFT feed rather than independent loop animation.
8. Add Audio Lab presets one at a time, with desktop and mobile budgets defined before merge.
9. Prefer deterministic, signal-derived geometry over random particles when a visual must remain cheap on mobile.
10. Preserve dynamic range: quiet/mid passages need visible motion and peaks need headroom rather than permanent saturation.
11. Motion memory may add overshoot/inertia, but it must decay from real signal targets and never become an autonomous visual loop.
12. Historical-looking compatibility files still wired into boot/deployment are removed only through dedicated refactors, not cosmetic cleanup.
