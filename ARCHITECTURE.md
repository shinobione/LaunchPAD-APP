# SHINOBIWAN LaunchPAD architecture

> Current application build: `2026.08.08.54` — release `gravity-lens-20260808`.

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

1. **Application/infrastructure code:** GitHub `main`.
2. **Track/media data:** R2 manifests, media objects and `catalog/index.json`.
3. **Deployment/service configuration:** versioned GitHub workflows/Wrangler config plus required external Cloudflare settings/secrets.

GitHub Pages, Cloudflare Pages, generated `dist/` output and Lovable are not authoritative source trees.

## Application structure

```text
index.html
css/                          Base, responsive and feature styles
js/
  build-config.js             Single app build/release source
  app-engine*.js              Boot and recovery bootstrap
  app-main.js                 Playback, routing and app composition
  core/                       Shared catalog/router/player/theme state
  features/
    audio-lab-signal.js       Decoded analysis-copy fallback
    lyrics/                   Lyrics reader/synchronization
    visual/
      visual-engine-v2.js     Spectrum reference renderer/analyser
      visual-engine-live.js   Shared live FFT controller
      visual-engine-core-modes.js
                              Neon Shatter + Liquid Chrome
      pulse-reactor.js        Isolated readable reactor renderer
      bass-fracture.js        Isolated tectonic plate renderer
      gravity-lens.js         Isolated space-warp renderer
      audio-lab-registry.js   Sanctioned preset list
    track-detail.js           Dedicated #track= route renderer
    track-videos.js           Canvas/video behavior
    pwa.js                    Install/update orchestration
cloudflare/                   Worker source and Wrangler configs
scripts/                      Build, validation and operations tooling
tests/                        Browser/regression fixtures
.github/workflows/            CI and deployment pipelines
```

## Boot and routing rules

1. `index.html` loads the static shell and `js/build-config.js`.
2. Build metadata versions dynamic stability/boot resources and the PWA cache namespace.
3. The recovery bootstrap initializes catalog/runtime state.
4. Remote catalog data is normalized through the shared schema/store before rendering.
5. `app-main.js` composes playback, views and feature modules.
6. Dedicated routes such as `#track=<id>` and `#studio=<id>` remain single-owner so Home cannot flash/render first.

Stable routes include:

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

## Player and page theme separation

The viewed track and currently playing track can differ. Theme scoping therefore maintains a page palette for the viewed detail context and a player palette for the loaded audio track. Theme writes are idempotent to avoid observer/render loops.

## Audio architecture

### Audible path

```text
HTMLAudioElement --> browser/native media pipeline --> output device
```

Audio Lab must not become part of this audible graph.

### Analysis path

The live custom renderers request the same analyser that powers Spectrum. The independent decoded analysis copy remains available only as a resilient fallback:

```text
primary:   Spectrum AnalyserNode --> shared 128-bin FFT --> custom renderers
fallback:  track URL --> fetch/decode --> AnalyserNode --> shared FFT readers
```

### Audio Lab rendering contract

Build 54 exposes six sanctioned presets:

- **Spectrum** — protected reference renderer and owner of the primary analyser contract.
- **Neon Shatter** — FFT/local-delta shard displacement, scaling, rotation, cracks and bass/kick impact rings.
- **Liquid Chrome** — FFT-deformed metallic contour; bass controls pulse, mids fluidity and highs local/specular detail.
- **Pulse Reactor** — hierarchy-first reactor: a dominant core, fewer segmented rings, gated high-frequency needles and selective peak breakup so large impacts stay readable.
- **Bass Fracture** — deterministic tectonic disc: bass/kicks separate annular plates, mids twist them and highs/transients illuminate a restrained set of faults. Mobile reaction amplitude is boosted without adding primitives.
- **Gravity Lens** — spatial distortion renderer: bass/kicks deepen the lens, mids shear orbital bands, highs/transients create caustic arcs and curved streams around a central horizon.

All custom effects read Spectrum's analyser through `readSpectrum()` first. Time may add only a tiny signal-gated drift; paused/silent playback must settle instead of continuing an autonomous loop. Isolated renderers must not own their own RAF/timer loop or use random motion as a substitute for signal reactivity.

### Mobile visual budget

Performance limits are part of each preset contract rather than an afterthought:

- Neon Shatter: DPR cap 1.0 on mobile.
- Pulse Reactor: DPR cap 1.1, 3 rings, 14 segments/ring, 10 spokes and 4 peak-only core shards on mobile; desktop uses 4 / 24 / 18 / 7.
- Bass Fracture: DPR cap 1.05, 2 plate layers, 12 sectors and 8 crack spokes on mobile; desktop uses 3 / 16 / 12. Mobile uses stronger displacement rather than more geometry.
- Gravity Lens: DPR cap 1.05, 4 bands, 12 arc segments and 8 curved streams on mobile; desktop uses 6 / 20 / 14.
- Liquid Chrome: DPR cap 1.35 on mobile.
- All custom modes target the same 60 Hz render scheduler, with geometry reduced before visual reactivity is reduced.

New effects should be isolated in their own module when practical and added one at a time after desktop + Android validation. When a visual becomes cluttered, reduce simultaneous primitives before reducing signal amplitude.

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

## PWA / Canvas / Studio

The service worker caches same-origin application assets while audio/video media remain network-oriented. Build 54 advances the cache namespace and includes `pulse-reactor.js`, `bass-fracture.js` and `gravity-lens.js` in the application shell. Mobile Lyrics actions may enter the track's Studio directly; the bottom navigation remains available in Studio. Track Canvas video is silent, looped and `playsinline`, with resume/recovery hooks for mobile lifecycle events.

## Deployment artifact

`scripts/build-cloudflare-pages.mjs` currently builds `dist/cloudflare-pages/` by copying the runtime verbatim. Despite the historical filename, the artifact is host-neutral and is also used by GitHub Pages.

`scripts/validate-cloudflare-pages-build.mjs` checks that the artifact matches the source runtime and includes required boot/feature files.

## Documentation/version contract

Every new application build must update every Markdown file to the exact `display` and `release` values from `js/build-config.js`. `scripts/validate-build-docs.mjs` enforces this during `npm run validate`.

## Architecture rules

1. `main` is the only application-code authority.
2. R2 manifests/media are the production track/media authority.
3. All UI consumers normalize tracks through the shared catalog schema/store.
4. The public Worker stays read-only and Range-capable.
5. The private Worker remains behind Cloudflare Access.
6. Audio/video delivery must not be silently trapped in the PWA static cache.
7. Hash routes remain shareable and have one owner each.
8. Feature code belongs in `js/features/`; shared state/helpers belong in `js/core/`.
9. Shell-changing releases advance `js/build-config.js` and the service-worker namespace through that metadata.
10. Web-host deployment, Worker deployment and R2 catalog rebuild are separate release states.
11. Deployment builders may copy/validate runtime files but may not patch production runtime code.
12. Lovable remains external prototyping unless a deliberate migration lands back in `main`.
13. Audio Lab visuals must prove reactivity against the live FFT feed rather than merely animate while playback is active.
14. Audio Lab presets are added one at a time with explicit mobile geometry/DPR budgets.
15. Peak violence should come from signal-derived deformation/fracture, not permanently higher particle counts.
16. Readability is a first-class visual contract: fewer stronger gestures beat dense always-on detail.
17. Historical-looking compatibility files that remain wired into boot/deployment are removed only through dedicated regression-tested refactors.

## Validation

```bash
npm ci
npm run validate
npm run check:wrangler
```
