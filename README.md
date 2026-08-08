# SHINOBIWAN LaunchPAD

> Current application build: `2026.08.08.66` — release `studio-metadata-validation-20260808`.

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

## Track Manager v5.10 / Studio bridge v1.2 hotfix

The public LaunchPAD application remains on **Build 66** because this hotfix changes only the protected Track Manager Worker. No public PWA cache/build bump is required.

- Track Manager advances from **v5.9** to **v5.10** and the Studio bridge from **v1.1** to **v1.2**.
- The existing metadata-validation endpoint remains validation-only and continues to advertise `write: []`.
- Build 6 Studio used `Content-Type: application/json` plus `X-Shinobiwan-Studio-Intent`, which forces a CORS preflight. In the real Chrome + Cloudflare Access path, authenticated private GETs succeeded while that preflight could be intercepted before the Worker.
- Bridge v1.2 keeps the old JSON/custom-header transport for backward compatibility and adds a no-preflight transport using `Content-Type: text/plain` with the same JSON payload.
- In the simple transport, `intent: "metadata-validate-v1"` moves into the JSON body and remains mandatory.
- Exact origin `https://shinobione.github.io`, Cloudflare Access verification, whitelist-only metadata and `expectedUpdatedAt` stale-manifest protection remain mandatory.
- No manifest save, R2 `put/delete`, asset operation, publish, delete or catalog rebuild primitive is added.
- Public Worker **v2.6**, R2 media/data, SonicTrace and LRC Maker remain unchanged.

See [`docs/STUDIO-VALIDATION-CORS-HOTFIX.md`](docs/STUDIO-VALIDATION-CORS-HOTFIX.md).

## Build 66 highlights

Build 66 advances **SHINOBIWAN Studio Phase 4B.1A** while still refusing all cross-origin production writes.

- Track Manager contract advances to **v5.9** and the Studio bridge to **v1.1**.
- Existing `/api/studio/*` private GET reads remain Cloudflare-Access-authenticated and restricted to the exact origin `https://shinobione.github.io`.
- One exact additional endpoint is assembled: `POST /api/studio/tracks/<slug>/metadata/validate`.
- That POST requires `Content-Type: application/json`, the custom `X-Shinobiwan-Studio-Intent: metadata-validate-v1` header and an `expectedUpdatedAt` stale-manifest guard.
- Metadata fields are whitelist-only; assets, slug, migration/provenance fields and server-owned timestamps cannot be supplied through the Studio patch.
- The endpoint normalizes the proposed manifest and runs Track Manager quality inspection, but performs **no** `writeManifest`, `writeCatalogIndex`, R2 `put/delete`, upload, delete, publish or rebuild operation.
- Studio bridge health advertises `validate: ["metadata"]` while `write: []` remains explicit.
- Every other `POST`, `PUT`, `PATCH` and `DELETE` route keeps the existing Track Manager `enforceSameOrigin()` boundary.
- CI fails if the validation module gains a production mutation primitive or if the assembled worker loses the exact validation-only exception.
- The public Worker stays **v2.6** and is not part of this change.

## Build 65 highlights

Build 65 prepared the private Track Manager for **SHINOBIWAN Studio Phase 4A** without opening production write access.

- Track Manager contract advanced to **v5.8**.
- A new authenticated namespace `/api/studio/*` exposed GET-only health, track-list and track-detail projections for Studio.
- CORS was allowlisted to the exact GitHub Pages origin `https://shinobione.github.io`; it was not wildcarded.
- Cloudflare Access JWT verification remained mandatory for Studio data reads.
- Existing `POST`, `PUT`, `PATCH` and `DELETE` routes remained protected by the unchanged same-origin write guard.
- The bridge advertised `write: []` and supported only `GET, OPTIONS`; CI added a dedicated regression guard for this contract.
- No R2 migration, catalog rebuild, asset rewrite or public Worker behavior was part of Build 65.
- The synchronized-lyrics contract was corrected: timestamped canonical `lyrics.txt` is already synchronized; a second `.lrc` file is optional compatibility/export data, not a mandatory source of truth.

## Build 64 highlights

Build 64 fixes the visual integration of the new **SonicTrace** admin shortcut in the stylesheet actually used by the live PWA shell.

- SonicTrace now uses the exact same pill geometry, spacing, typography and hover behavior as LRC Maker and Track Manager.
- Its `ST` disc uses a cyan/teal gradient and the surrounding pill uses matching cyan border, text and arrow accents.
- The active `css/pwa.css` contract now includes SonicTrace in every shared admin-tool selector instead of leaving it as an unstyled anchor.
- CI explicitly guards the SonicTrace pill styling so this mismatch cannot silently return.
- The PWA cache advances to v64 so installed clients cannot stay on the visually broken Build 63 shell.

## Build 63 highlights

Build 63 adds **SonicTrace** to the persistent desktop admin-tool strip alongside LRC Maker and Track Manager.

- SonicTrace opens `https://shinobione.github.io/LM-IA-Analayse/` in a new tab.
- It shares the exact same persisted `?admin=1` / `?admin=0` gate as the existing private-tool shortcuts.
- The shortcut stays desktop-only, matching the current admin access contract.
- Its `ST` badge uses a cyan/teal treatment derived from SonicTrace's visual identity while keeping LaunchPAD's existing pill geometry.
- The PWA cache advances to v63 so installed clients pick up the new admin UI immediately.

## Build 61 highlights

Build 61 adds **Creep Signal**, the ninth sanctioned Audio Lab preset and the first deliberately non-radial kinetic visual in the current line.

- **Spectrum**, **Neon Shatter** and **Liquid Chrome** remain untouched as the trusted baseline.
- Build 57's integrated kinetic phase still owns continuous movement while Build 58/59 onset + Direct Impact own short low-frequency hits.
- **Creep Signal** forms an asymmetric signal-organism that traverses the canvas instead of orbiting a central object.
- Bass gives the body mass and wider travel, mids whip alternating branches, highs/transients drive luminous infection pulses along the network.
- Local FFT samples deform separate body/branch positions so the structure does not behave like one rigid spline.
- Direct Impact gives kick/bass onsets a reserved whole-network lateral lunge, shear and compression after the normal pose is computed.
- Mobile budget is fixed at 9 body nodes / 6 branches / 7 travelling pulses / DPR 1.05; desktop uses 14 / 10 / 12 / DPR up to 2.
- The renderer owns no private RAF/timer, uses no `Math.random()` motion and adds no particle field.
- The PWA cache advances to v61 so installed clients cannot remain on Build 60 visual runtime code.

## Canonical media model

Production media lives in R2:

```text
catalog/index.json
tracks/<slug>/manifest.json
tracks/<slug>/audio.<ext>
tracks/<slug>/cover.<ext>
tracks/<slug>/thumbnail.webp
tracks/<slug>/lyrics.txt      # optional; may contain synchronization timestamps
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

CI checks browser navigation, PWA/service-worker behavior, Audio Lab signal contracts, catalog contracts, Cloudflare bundles, repository cleanliness, documentation/build coherence, the Studio bridge security boundary and desktop overflow regressions. The current bridge guard additionally proves that both metadata-validation transports remain non-mutating and that real writes remain same-origin-only.

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
- [`docs/SHINOBIWAN-STUDIO-CONTRACT.md`](docs/SHINOBIWAN-STUDIO-CONTRACT.md) — Studio integration contract
- [`docs/STUDIO-VALIDATION-CORS-HOTFIX.md`](docs/STUDIO-VALIDATION-CORS-HOTFIX.md) — Track Manager v5.10 / bridge v1.2 browser validation transport hotfix
- [`RELEASE-CHECKLIST.md`](RELEASE-CHECKLIST.md) — safe release procedure
- [`ROADMAP.md`](ROADMAP.md) — remaining consolidation/product work
- [`cloudflare/README.md`](cloudflare/README.md) — Workers/R2 operations

## Repository rules

1. `main` is the only source of truth.
2. Do not edit production code only in Cloudflare, GitHub Pages, Lovable or generated `dist/` output.
3. Temporary feature/fix branches are disposable and automatically deleted after merge; named `safety/*` restoration snapshots created for Studio integration are rollback references and must not be developed on.
4. Advance application versions only in `js/build-config.js`.
5. Update every `.md` file for every new build; CI validates the build/release markers.
6. Keep Worker deployment, web deployment and R2 catalog rebuild as separate explicit states.
7. Spectrum remains the Audio Lab reference path; every visual effect must consume the real FFT feed rather than independent loop animation.
8. Add Audio Lab presets one at a time, with desktop and mobile budgets defined before merge.
9. Prefer deterministic, signal-derived geometry over random particles when a visual must remain cheap on mobile.
10. Continuous movement and transient impact must stay separate: groove energy owns travel; detected onset creates a post-pose impact with reserved visual headroom.
11. Motion memory/kinetic phase must stop when the real audio target disappears and must never become an autonomous screensaver.
12. New visual families should prefer distinct composition/motion language rather than repeating radial center-object patterns.
13. Historical-looking compatibility files still wired into boot/deployment are removed only through dedicated refactors, not cosmetic cleanup.
14. Studio integration must remain additive and reversible: validation-only cross-origin capabilities may be introduced before writes, but production mutation remains forbidden until separately versioned, reviewed and tested.
