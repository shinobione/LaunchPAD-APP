# SHINOBIWAN LaunchPAD

> Current application build: `2026.08.08.55` — release `motion-bio-20260808`.

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

## Build 55 highlights

Build 55 keeps the proven shared-Spectrum FFT pipeline and adds a **motion & elasticity layer** without raising mobile geometry budgets:

- **Spectrum**, **Neon Shatter** and **Liquid Chrome** remain untouched as the trusted baseline.
- A shared `motion-spring.js` helper adds short-memory spring channels, velocity/overshoot and signal-gated phase. It never owns a RAF/timer loop.
- **Pulse Reactor** keeps 3/4 rings, 14/24 segments and 10/18 spokes, but the core breathes more, ring motion propagates with phase delay and segments/spokes gain elastic wobble instead of rigid pose changes.
- **Bass Fracture** keeps 2/3 layers, 12/16 sectors and 8/12 cracks. Mobile motion scale rises to `1.58`, while spring rupture, plate sway and short crack propagation make the mass break, glide and rebound without adding geometry.
- **Gravity Lens** keeps 4/6 bands, 12/20 arcs and 8/14 streams. Spring warp/shear plus signal-gated precession, breathing and stream drift make the field feel alive while the horizon stays visually anchored.
- **Bio Structure** becomes the seventh sanctioned preset: a sparse living spine/rib organism where bass inflates the body, mids flex branches and highs travel as luminous nerve impulses.
- Bio Structure mobile budget is 5 ribs / 8 vein impulses / 6 spine nodes at DPR 1.05; desktop uses 8 / 14 / 9.
- All custom effects still read Spectrum's analyser first. Decoded analysis remains fallback-only and the audible HTML5 player stays outside the analysis graph.
- Pause/silence drives the spring targets back to zero; residual movement decays naturally instead of becoming an autonomous screensaver.
- The PWA cache advances to v55 and includes `motion-spring.js` + `bio-structure.js`.

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
10. Favor readability and motion amplitude: reduce simultaneous primitives before reducing reaction amplitude.
11. Motion memory may add overshoot/inertia, but it must decay from real signal targets and never become an autonomous visual loop.
12. Historical-looking compatibility files still wired into boot/deployment are removed only through dedicated refactors, not cosmetic cleanup.
