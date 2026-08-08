# SHINOBIWAN LaunchPAD

> Current application build: `2026.08.08.58` — release `adaptive-punch-20260808`.

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

## Build 58 highlights

Build 58 keeps Build 57's kinetic motion intact and adds a separate **adaptive low-frequency punch** layer for Pulse Reactor, Bass Fracture, Gravity Lens and Bio Structure.

- **Spectrum**, **Neon Shatter** and **Liquid Chrome** remain untouched as the trusted baseline.
- Build 57's integrated phase remains responsible for travel, rotation, breathing and continuous groove motion.
- A new low-frequency onset tracker compares fast bass, a slow local bass baseline, low-bin positive spectral flux and short-term bass rise. Kicks can therefore stand out even after a dense section has already raised the average bass level.
- The adaptive punch is short-lived and overlays the existing kinetic movement; it does not replace groove motion or create a private animation loop.
- Only Pulse Reactor, Bass Fracture, Gravity Lens and Bio Structure receive the punch-enhanced kick/peak/dynamics features. Neon Shatter and Liquid Chrome keep their previous feature calibration.
- Audio Lab telemetry now exposes `audioLabPunch` so real-device testing can distinguish continuous bass level from detected low-frequency impacts.
- No new visual primitives or higher mobile DPR budgets are introduced.
- The PWA cache advances to v58 so Build 57 assets cannot mask the new transient detector.

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
10. Separate continuous movement from transient impact: groove energy owns travel; adaptive low-frequency onset detection owns the brief visual punch.
11. Motion memory/kinetic phase must stop when the real audio target disappears and must never become an autonomous screensaver.
12. Historical-looking compatibility files still wired into boot/deployment are removed only through dedicated refactors, not cosmetic cleanup.
