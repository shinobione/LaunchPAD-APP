# SHINOBIWAN LaunchPAD architecture

_Current baseline: Build `2026.08.07.40` (`unified-v40-20260807`)_

LaunchPAD is a modular static PWA whose application source lives in GitHub `main`. The web shell is mirrored to GitHub Pages and Cloudflare Pages; production catalog/media state lives in Cloudflare R2 and is exposed through public/private Workers.

For the operational hosting map, see [`docs/DEPLOYMENT-TOPOLOGY.md`](docs/DEPLOYMENT-TOPOLOGY.md).

## Runtime topology

```text
                    GitHub repository: main
                              |
                validated static application
                              |
              +---------------+---------------+
              |                               |
              v                               v
       GitHub Pages                    Cloudflare Pages
       public PWA host                 staging PWA host
              |                               |
              +---------------+---------------+
                              |
                         Browser / PWA
                              |
              +---------------+---------------+
              |                               |
              v                               v
      launchpad-media Worker          launchpad-r2-api Worker
      public GET/HEAD API             private Track Manager
              |                               |
              +---------------+---------------+
                              |
                       shinobiwan-media R2
```

## Source-of-truth boundaries

There are three different kinds of canonical state and they must not be confused:

1. **Application/infrastructure code:** GitHub `main`.
2. **Track/media data:** R2 manifests, media objects and `catalog/index.json`.
3. **Deployment/service configuration:** versioned GitHub workflows/Wrangler config plus required external Cloudflare settings/secrets.

GitHub Pages, Cloudflare Pages, generated `dist/` output and Lovable are not authoritative source trees.

## Canonical R2 structure

```text
catalog/index.json
tracks/<slug>/manifest.json
tracks/<slug>/audio.<ext>
tracks/<slug>/cover.<ext>
tracks/<slug>/thumbnail.webp
tracks/<slug>/lyrics.txt      # optional
tracks/<slug>/video.<ext>     # optional
```

`manifest.json` is the canonical per-track metadata record. `catalog/index.json` is the optimized public catalog snapshot generated from publishable manifests and derived flags.

## Application structure

```text
index.html
css/
  ...                         Base, responsive and feature styles

js/
  build-config.js             Single app build/release source
  app-engine.js               Main bootstrap
  app-engine-recovery.js      Cache-safe recovery bootstrap
  app-main.js                 Playback, routing and app composition
  catalog.js                  Album/editorial presentation data
  catalog-fixture.js          Deterministic local/CI fixture

  core/
    assets.js                 Versioned dynamic asset helper
    catalog-schema.js         Canonical track normalization
    catalog-store.js          Hydrated catalog state/selectors
    catalog-ordering.js       Release/import ordering
    remote-catalog.js         Public Worker adapter
    player-queue.js           Queue/Shuffle/Repeat state
    router.js                 Hash routing/deep links
    share.js                  Sharing/clipboard helpers
    theme.js                  Track palette helpers

  features/
    audio-readiness.js        First-start and media recovery
    audio-lab-signal.js       Web Audio analyser bridge/fallback signal
    player-experience.js      Global playback state and Track DNA
    lyrics/                   Lyrics reader/synchronization
    visual/                   Audio Lab renderers and sanctuary registry
    track-detail.js           Dedicated #track= route renderer
    track-videos.js           Video/canvas behavior
    pwa.js                    Install/update orchestration
    ...

cloudflare/
  public-worker*.js           Public media/catalog Worker source
  admin-worker.parts/         Ordered private Track Manager source
  wrangler.public.jsonc       Public deployment contract
  wrangler.admin.jsonc        Private deployment contract

scripts/                      Build, validation and operations tooling
tests/                        Browser/regression fixtures
.github/workflows/            CI and deployment pipelines
```

## Boot sequence

1. `index.html` loads the static shell and `js/build-config.js`.
2. `build-config.js` exposes the Build 40 metadata and installs dynamic stability/boot resources.
3. Parser-delivered stylesheets are deliberately left untouched after first paint; only dynamically inserted styles receive the active build query string.
4. The recovery bootstrap initializes the catalog/runtime and attempts the public Cloudflare catalog.
5. Remote catalog data is normalized through the shared schema/store before rendering.
6. If the remote catalog is temporarily unavailable, the shell remains navigable through the local fallback path instead of aborting application boot. This fallback is a resilience path, not a second production catalog authority.
7. `app-main.js` composes playback, views and feature modules.
8. `#track=<id>` is owned by Track Detail; the generic view router does not render Home first.
9. The service worker caches same-origin application assets while audio/video media remain network-oriented with dedicated Range behavior.

## Routing rules

Hash routes are stable/shareable application state:

```text
#home
#library
#favorites
#lyrics=<track-id>
#studio=<track-id>
#track=<track-id>
#album=<album-id>
#lab
#streaming
#about
```

Dedicated route owners must remain single-owner. In particular, a track-detail route must not be transiently interpreted as Home because that causes double rendering and competing scroll restoration.

## Player and page theme separation

The viewed track and currently playing track can differ. Theme scoping therefore maintains:

- page palette for the viewed detail context;
- player palette for the loaded audio track;
- `split` scope when those IDs differ;
- `unified` scope when they are the same.

Theme writes are idempotent to avoid MutationObserver/render loops.

## Audio Lab

The Audio Lab registry is authoritative for supported presets. The validated core set is:

- Spectrum
- Liquid Chrome
- Aurora Glass
- Nebula
- Singularity
- Neon Shatter as the default visual mode where applicable

Spectrum and Liquid Chrome are sanctuary-protected by regression hashes. Retired renderers must not be reintroduced through stale routes or compatibility code.

The signal path uses Web Audio frequency/time-domain data when available and a deterministic playback fallback while the analyser is warming/unavailable. Telemetry writes are throttled/idempotent so visual reactivity cannot create a DOM mutation loop.

## Lyrics flow

The public catalog can expose derived lyrics/timestamp flags for fast listing. Full track detail may resolve the exact lyrics status from the track resource.

Supported timestamp forms include bracketed LRC and plain timestamp-line variants. Track Manager catalog rebuilds are responsible for refreshing derived index flags when lyrics change.

## Web deployment artifact

`scripts/build-cloudflare-pages.mjs` currently builds `dist/cloudflare-pages/` by copying the runtime verbatim. Despite the historical filename, the artifact is host-neutral and is also used by GitHub Pages.

`scripts/validate-cloudflare-pages-build.mjs` checks that the artifact matches the source runtime and includes required boot/feature files.

These names are compatibility debt because the Cloudflare Pages dashboard already references them. Renaming them should happen only after the external build configuration is updated atomically.

## Architecture rules

1. `main` is the only application-code authority.
2. R2 manifests/media are the only production track/media authority.
3. All UI consumers normalize tracks through the shared catalog schema/store.
4. The public Worker stays read-only and Range-capable.
5. The private Worker remains behind Cloudflare Access.
6. Audio/video delivery must not be silently trapped in the PWA static cache.
7. Hash routes remain shareable and have one owner each.
8. Queue contexts remain explicit; they do not silently fall back to another queue.
9. Feature code belongs in `js/features/`; shared state/helpers belong in `js/core/`.
10. Shell-changing releases advance `js/build-config.js` and the service-worker namespace through that build metadata.
11. Web-host deployment, Worker deployment and R2 catalog rebuild are separate release states.
12. Deployment builders may copy and validate runtime files but may not patch production runtime code.
13. Historical/recovery branches are never deployment authorities.
14. Lovable remains external prototyping unless a deliberate migration lands back in `main`.
15. Regression tests should assert current behavior/contracts rather than obsolete historical build identifiers.

## Validation

```bash
npm ci
npm run validate
npm run check:wrangler
```

GitHub Actions also runs LaunchPAD, Cloudflare Worker and horizontal-overflow validation. GitHub Pages performs an additional static artifact build/validation before deployment.
