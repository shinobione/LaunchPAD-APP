# Changelog

> Current application build: `2026.08.08.54` — release `gravity-lens-20260808`.

This file intentionally tracks the recent stabilized release line. Older milestone-by-milestone history remains available in Git history and merged pull requests.

## Build 54 — Gravity Lens + readability pass

- Add **Gravity Lens** as the sixth sanctioned Audio Lab preset, isolated in `js/features/visual/gravity-lens.js`.
- Drive Gravity Lens from the shared Spectrum FFT: bass/kicks deepen the lens, mids shear its bands, highs/transients light caustic arcs and curved streams.
- Give Gravity Lens an explicit mobile budget of 4 bands / 12 arcs / 8 streams at DPR 1.05; desktop uses 6 / 20 / 14.
- Rework **Pulse Reactor** for readability: fewer desktop rings/segments/spokes, fewer mobile segments/spokes, a larger dominant core, gated needles and selective peak breakup instead of frame-wide chaos.
- Rework **Bass Fracture** for readability and stronger mobile impact: reduce desktop sector/crack counts, keep mobile geometry fixed, increase mobile displacement via `motionScale`, and emphasize fewer, larger fault gestures.
- Keep all custom modes on Spectrum's shared analyser feed first; decoded analysis remains fallback-only.
- Keep isolated renderers deterministic and free of private `requestAnimationFrame`, `setInterval` and `Math.random()` animation paths.
- Cache Gravity Lens in the PWA shell and advance the app/cache namespace to Build 54.

## Build 53 — Bass Fracture + Pulse Reactor breakup

- Add **Bass Fracture** as the fifth sanctioned Audio Lab preset, isolated in `js/features/visual/bass-fracture.js`.
- Render Bass Fracture as deterministic tectonic plates: bass/kicks separate the mass, mids twist plate groups and highs/transients light fault lines and edge cracks.
- Give Bass Fracture an explicit mobile budget of 2 layers / 12 sectors / 10 crack spokes at DPR 1.05; desktop uses 3 / 20 / 18.
- Increase Pulse Reactor peak violence without increasing its permanent mobile geometry: strong bass/kick peaks de-cohere ring segments and eject a small deterministic set of core shards before settling.
- Keep both new behaviors on Spectrum's shared analyser feed with only signal-gated residual drift; paused/silent playback remains stable.
- Keep both isolated renderers free of private `requestAnimationFrame`, `setInterval` and `Math.random()` animation paths.
- Cache Bass Fracture in the PWA shell and advance the app/cache namespace to Build 53.

## Build 52 — Pulse Reactor

- Add **Pulse Reactor** as the fourth sanctioned Audio Lab preset, without changing the validated Neon Shatter / Spectrum / Liquid Chrome renderers.
- Drive the reactor from the same Spectrum analyser feed: bass/kicks control the core, mids the segmented orbital rings, highs/transients the radial needles.
- Keep autonomous motion signal-gated; silence/paused playback produces a stable reactor rather than a looping animation.
- Isolate the effect in `js/features/visual/pulse-reactor.js` so it can be tuned or removed without touching the three validated baseline renderers.
- Add an explicit mobile budget: 3 rings, 18 segments/ring, 16 spokes and DPR cap 1.1; desktop uses 5 rings, 32 segments and 30 spokes.
- Cache the new renderer in the PWA shell and advance the app/cache namespace to Build 52.
- Extend Audio Lab CI contracts to verify the shared FFT path, mobile budget and absence of self-scheduled animation loops.

## Build 51 — Audio Lab three-core reset

- Reduce Audio Lab to Neon Shatter, Spectrum and Liquid Chrome only; retire Aurora Glass, Nebula and Singularity from the sanctioned runtime.
- Preserve Spectrum as the known-good reference renderer and expose its analyser feed to custom effects.
- Rebuild Neon Shatter from scratch with FFT-driven shard geometry, cracks and bass/kick impact rings.
- Rebuild Liquid Chrome from scratch with an FFT-deformed metallic contour, bass pulse, mid fluidity and high-frequency specular response.
- Remove custom-effect synthetic playback-spectrum and separate amplitude paths; Spectrum's analyser is primary and the decoded bridge is fallback-only.
- Gate residual time drift by real signal energy so silence/paused playback settles.
- Advance the PWA cache namespace to v51 so cached Build 50 Audio Lab JavaScript cannot mask the new runtime.

## Build 50 — Audio Lab signal-first

- Make Neon Shatter consume raw FFT bins/local spectral deltas as its primary geometry input instead of time-driven rotation.
- Make Aurora Glass deform from raw spectral lift/deltas; remove the dominant autonomous phase loop.
- Move Liquid Chrome and Singularity onto the same live decoded-FFT renderer path and increase their footprint/reactivity moderately rather than aggressively.
- Zero custom visual input while playback is paused so reactive effects settle instead of behaving like looping video.
- Add a documentation/build contract: every Markdown file must carry the current build display/release markers and CI rejects stale docs.

## Build 49 — Mobile Studio/reactivity polish

- Route mobile Track Detail Lyrics actions directly into the selected track's Studio.
- Keep the mobile bottom navigation visible in Studio and place the mini-player above it.
- Harden silent Canvas autoplay/loop recovery for mobile lifecycle events.
- Increase direct FFT influence in Neon Shatter/Aurora Glass as an intermediate step before Build 50's signal-first rewrite.

## Build 48 — Decoded Audio Lab analysis copy

- Replace hidden/mirrored media capture approaches with `fetch` + `decodeAudioData` + `AudioBufferSourceNode` metering.
- Keep the audible HTML5 audio element outside the Web Audio analysis graph.
- Synchronize the decoded analysis source with track identity, seek position and playback rate.

## Builds 45–47 — Audio isolation investigation

- Separate Audio Lab from the audible playback path to address artefacts under heavy visualization/background playback.
- Retire fragile `captureStream()` and hidden-audio mirror experiments after real-device testing exposed track-switch and silent-meter failures.

## Build 44 — Card status alignment

- Align `NOW PLAYING` with cover-relative badges on track cards across desktop/mobile.

## Build 43 — Admin tool persistence

- Style LRC Maker as a LaunchPAD admin control.
- Persist admin mode for installed desktop PWA launches after a deliberate `?admin=1` opt-in; `?admin=0` clears it.

## Build 42 — Audio/Admin integration

- Restore Spectrum as a first-class Audio Lab preset.
- Add LRC Maker admin access beside Track Manager.
- Begin audio-path isolation and mobile visual performance work.

## Build 41 — Visual Card/mobile Home

- Repair CORS-safe Visual Card PNG export.
- Restore LAUNCHPAD-first mobile Home layout and action button consistency.

## Build 40 — Repository reconciliation

- Reconcile the previously divergent Cloudflare/GitHub runtime lines.
- Restore canonical GitHub Pages deployment from `main`.
- Remove the old split-brain deployment model and establish `main` as the single application source of truth.
