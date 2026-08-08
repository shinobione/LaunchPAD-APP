# SHINOBIWAN LaunchPAD architecture

> Current application build: `2026.08.08.62` — release `ui-polish-62-1-20260808`.

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
      visual-engine-live.js   Shared FFT + onset + direct-impact controller
      visual-engine-core-modes.js
                              Neon Shatter + Liquid Chrome
      motion-spring.js        Per-canvas spring + integrated kinetic phase
      pulse-reactor.js        Isolated kinetic reactor renderer
      bass-fracture.js        Isolated kinetic tectonic renderer
      gravity-lens.js         Isolated kinetic space-warp renderer
      bio-structure.js        Isolated kinetic living spine/rib renderer
      void-bloom.js           Isolated kinetic petal/void renderer
      creep-signal.js         Isolated asymmetric crawling network renderer
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

### Motion / kinetic layer

Build 57 introduced two independent concepts and Build 61 keeps them unchanged:

```text
raw FFT + smoothed features --> shapeAudioDrive() --> amplitude/spring targets
real audio activity ---------> advanceMotionPhase() --> integrated forward phase
```

`shapeAudioDrive()` blends the raw analyser bands with the already-smoothed feature stream. `advanceMotionPhase()` stores phase and phase speed per Canvas and integrates `phase += speed * dt` frame by frame. Spring channels still provide local inertia/recoil. The helper owns no RAF, timer or audio node.

### Adaptive onset + direct impact

Build 58 introduced a low-frequency onset detector. Build 59 reserved a separate post-pose impact lane and Builds 60–61 keep that lane intact:

```text
low FFT bins
   +--> fast bass envelope
   +--> slow local bass baseline
   +--> positive low-bin spectral flux
   +--> short bass rise
              |
              v
       adaptive punch
              |
              +--> ordinary kinetic feature overlay
              |
              +--> rising-edge impact tracker
                         |
                         v
              post-pose canvas transform
```

`createDirectVisualImpactTracker()` watches the rising edge of adaptive punch, kick and fast-vs-baseline low-band contrast. Its envelope decays independently and is not mixed back into the normal bass/kick clamp. `applyDirectKineticImpact()` runs after the renderer pose is prepared, so transient movement retains headroom even when normal targets are already high.

Direct impact is scoped to **Pulse Reactor, Bass Fracture, Gravity Lens, Bio Structure, Void Bloom and Creep Signal**. **Neon Shatter, Spectrum and Liquid Chrome** keep their existing calibration.

### Audio Lab rendering contract

Build 61 exposes nine sanctioned presets:

- **Spectrum** — protected reference renderer and owner of the primary analyser contract.
- **Neon Shatter** — unchanged baseline FFT-driven shard renderer.
- **Liquid Chrome** — unchanged baseline FFT-deformed metallic contour.
- **Pulse Reactor** — kinetic travel plus whole-reactor expansion/twist on direct impact.
- **Bass Fracture** — tectonic glide plus horizontal rupture/compression and mass kick on direct impact.
- **Gravity Lens** — precession/field drift plus anisotropic stretch/rotation snap on direct impact.
- **Bio Structure** — organism motion plus whole-body contraction/expansion on direct impact.
- **Void Bloom** — breathing FFT-sampled petals plus whole-bloom direct-impact expansion/twist.
- **Creep Signal** — asymmetric body crossing the canvas; bass controls body mass/travel, mids whip alternating branches, highs drive travelling infection pulses, and direct impact lunges/shears the whole network.

All custom effects read Spectrum's analyser through `readSpectrum()` first. Paused/silent playback must settle. Isolated renderers must not own their own RAF/timer loop or use random motion as a substitute for signal reactivity.

### Mobile visual budget

Performance limits in Build 61:

- Neon Shatter: DPR cap 1.0 on mobile.
- Pulse Reactor: DPR cap 1.1, 3 rings, 14 segments/ring, 10 spokes and 4 peak-only core shards on mobile; desktop uses 4 / 24 / 18 / 7.
- Bass Fracture: DPR cap 1.05, 2 plate layers, 12 sectors and 8 crack spokes on mobile; desktop uses 3 / 16 / 12. Mobile movement keeps the `1.66` travel scale.
- Gravity Lens: DPR cap 1.05, 4 bands, 12 arc segments and 8 curved streams on mobile; desktop uses 6 / 20 / 14.
- Bio Structure: DPR cap 1.05, 5 paired ribs, 8 nerve impulses and 6 spine subdivisions on mobile; desktop uses 8 / 14 / 9.
- Void Bloom: DPR cap 1.05, 7 petals and 7 luminous veins on mobile; desktop uses 11 petals and 16 veins.
- Creep Signal: DPR cap 1.05, 9 body nodes, 6 branches and 7 travelling pulses on mobile; desktop uses 14 / 10 / 12.
- Liquid Chrome: DPR cap 1.35 on mobile.
- Direct impact adds no primitives and uses only cheap canvas transforms around existing geometry.
- All custom modes target the same 60 Hz render scheduler; when performance needs reduction, reduce primitive density before reducing motion travel.

New effects should be isolated in their own module when practical and added one at a time after desktop + Android validation. Continuous motion and transient impact are separate requirements: sustained musical energy must create visible travel, while bass/kick onsets must add a short additional excursion with reserved headroom. New visual families should also avoid repeating the same central radial composition when a distinct motion language can be achieved cheaply.

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

The service worker caches same-origin application assets while audio/video media remain network-oriented. Build 62.1 advances the cache namespace after the Studio/Audio Lab/mobile-player polish so installed clients cannot remain on the Build 61 shell. Mobile Lyrics actions may enter the track's Studio directly; the bottom navigation remains available in Studio. Track Canvas video is silent, looped and `playsinline`, with resume/recovery hooks for mobile lifecycle events.

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
15. Sustained signal must create visible travel; peak reactivity alone is not sufficient evidence that a renderer feels alive.
16. Low-frequency transients must be measured relative to a local baseline so dense passages do not erase kick/bass impact.
17. Detected transient impact must retain a post-pose lane outside ordinary renderer clamps; re-mixing it into saturated spring targets is not sufficient.
18. Readability is a first-class visual contract: fewer stronger gestures beat dense always-on detail.
19. Kinetic phase/spring state may preserve short motion history, but phase speed and amplitudes must stop/settle when the real audio target disappears.
20. New visual families should prefer distinct composition/motion language instead of repeatedly centering a radial object.
21. Historical-looking compatibility files that remain wired into boot/deployment are removed only through dedicated regression-tested refactors.

## Validation

```bash
npm ci
npm run validate
npm run check:wrangler
```
