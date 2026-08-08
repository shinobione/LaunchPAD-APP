# Changelog

> Current application build: `2026.08.08.63` — release `sonictrace-admin-link-20260808`.

This file intentionally tracks the recent stabilized release line. Older milestone-by-milestone history remains available in Git history and merged pull requests.

## Build 63 — SonicTrace admin shortcut

- Add **SonicTrace** to LaunchPAD's desktop admin shortcut strip beside LRC Maker and Track Manager.
- Reuse the same persisted `?admin=1` gate and `?admin=0` opt-out so no separate access mode is introduced.
- Open `https://shinobione.github.io/LM-IA-Analayse/` in a new tab with the existing `noopener noreferrer` external-tool behavior.
- Add an `ST` badge with a cyan/teal treatment inspired by SonicTrace's green-to-cyan favicon identity while preserving LaunchPAD's existing pill geometry.
- Extend admin-access validation and master-spec guards to cover the SonicTrace URL, label, initials and shared persistence behavior.
- Advance the PWA cache namespace to `shinobi-launchpad-v63` so installed desktop clients receive the new shortcut without stale Build 62 assets.

## Build 62.1 — UI microfix

- Correct the visible Build/Release marker after the Build 62/62.1 UI polish so the About/build panel no longer reports Build 61.
- Advance the PWA cache namespace to `shinobi-launchpad-v62` so installed clients refresh the current shell/assets.
- Keep the Build 62.1 UI scope unchanged: Studio Canvas spacing, mobile Audio Lab center-cover removal, and mobile mini-player seek-thumb alignment.

## Build 61 — Creep Signal

- Add **Creep Signal** as the ninth sanctioned Audio Lab preset, isolated in `js/features/visual/creep-signal.js`.
- Keep the validated shared Spectrum FFT, integrated kinetic phase, adaptive onset detector and post-pose Direct Impact lane intact.
- Introduce a deliberately non-radial composition: a signal-organism traverses the canvas instead of orbiting a centered object.
- Bass controls body mass and travel amplitude; mids whip alternating branches; highs/transients drive luminous pulses through the network.
- Sample different FFT positions along the body/branches so the network deforms locally rather than moving as one rigid spline.
- Give Creep Signal a dedicated Direct Impact gesture: lateral lunge, shear and compression on low-frequency attacks, after the ordinary pose is computed.
- Define a mobile-first budget of 9 body nodes / 6 branches / 7 travelling pulses / DPR 1.05; desktop uses 14 / 10 / 12 / DPR up to 2.
- Keep **Spectrum**, **Neon Shatter** and **Liquid Chrome** unchanged.
- Add no private RAF/timers, random motion or particle field.
- Cache the new renderer in the PWA shell and advance the namespace to Build 61 / cache v61.

## Build 60 — Void Bloom

- Add **Void Bloom** as the eighth sanctioned Audio Lab preset, isolated in `js/features/visual/void-bloom.js`.
- Keep the validated Build 57 kinetic motion, Build 58 adaptive low-frequency onset detection and Build 59 direct post-pose visual impact lane intact.
- Drive Void Bloom from Spectrum's shared FFT: bass opens/deepens the bloom, mids twist individual petals, highs/transients drive luminous edge veins and integrated phase keeps the whole form breathing/drifting/rotating.
- Give Void Bloom a dedicated Build 59 direct-impact gesture: whole-bloom expansion plus rotation snap on detected low-frequency attacks, outside ordinary renderer target clamps.
- Define a mobile-first budget of 7 petals / 7 veins / DPR 1.05; desktop uses 11 petals / 16 veins / DPR up to 2.
- Keep **Spectrum**, **Neon Shatter** and **Liquid Chrome** unchanged.
- Add no private RAF/timers, random motion or particle field.
- Cache the new renderer in the PWA shell and advance the namespace to Build 60 / cache v60.

## Build 59 — Direct impact

- Keep Build 57's integrated kinetic travel and Build 58's adaptive low-frequency onset detector intact.
- Fix the remaining transient-impact architecture bug: detected punch was previously re-injected into ordinary clamped spring targets, so loud/dense passages could still flatten visual kick response.
- Add `createDirectVisualImpactTracker()` to derive a short visual-only impulse from rising adaptive punch, kick and fast-vs-baseline low-band contrast.
- Add `applyDirectKineticImpact()` after normal renderer pose computation so transient movement retains reserved headroom independently from already-high bass/kick targets.
- Give each kinetic preset a distinct cheap transform: Pulse Reactor expands/twists, Bass Fracture ruptures/compresses, Gravity Lens snaps into anisotropic stretch/rotation, Bio Structure contracts/expands as a whole organism.
- Expose `audioLabVisualImpact` telemetry separately from `audioLabPunch` so detector activity and actual visual impulse can be diagnosed independently.
- Keep **Spectrum**, **Neon Shatter** and **Liquid Chrome** unchanged.
- Add no new primitives, private RAF/timer loops, random motion or higher mobile DPR budgets.
- Advance the PWA namespace to Build 59 / cache v59.

## Build 58 — Adaptive punch

- Keep Build 57's integrated kinetic travel unchanged for **Pulse Reactor**, **Bass Fracture**, **Gravity Lens** and **Bio Structure**.
- Add an adaptive low-frequency onset detector in `visual-engine-live.js` using a fast bass envelope, a slow local bass baseline, positive low-bin spectral flux and short-term bass rise.
- Detect low-frequency impacts relative to the current groove instead of only from absolute bass level, so kicks remain visually distinct after a dense section has already raised the baseline.
- Apply the short punch overlay only to the four kinetic presets by temporarily strengthening their kick/peak/dynamics/intensity features. **Neon Shatter**, **Spectrum** and **Liquid Chrome** keep their existing calibration.
- Expose `audioLabPunch` telemetry for real-device diagnosis alongside bass/mid/high/kick/peak.
- Do not add visual primitives, private RAF/timer loops, random motion or higher mobile DPR budgets.
- Advance the PWA namespace to Build 58 / cache v58 so the new detector cannot be masked by cached Build 57 JavaScript.

## Build 57 — Kinetic flow

- Remove Build 56 `shapeMotionTarget()` soft-knee pose compression from Pulse Reactor, Bass Fracture, Gravity Lens and Bio Structure after real-device feedback showed it reduced visible travel and made the effects feel more static.
- Add `shapeAudioDrive()` to blend raw FFT energy with the smoothed feature stream without pinning the renderer at a permanently-open pose.
- Add `advanceMotionPhase()` with per-canvas integrated phase/speed state. Motion now advances frame by frame while audio activity exists instead of multiplying absolute time by a changing activity value.
- **Pulse Reactor** gains whole-reactor drift, larger breathing travel, continuously rotating rings, travelling radial waves and groove-level spoke motion; kicks still add impact/fracture on top.
- **Bass Fracture** gains whole-body roll/translation, continuous plate sliding and twisting, wider crack crawl and a mobile motion scale of `1.66` without increasing primitive counts.
- **Gravity Lens** gains continuous precession, lens-centre drift, wider orbital breathing and sweeping curved streams while preserving the central horizon as the visual anchor.
- **Bio Structure** gains whole-body drift/tilt, larger travelling spine waves, wider rib sweeps, stronger membrane deformation and clearly travelling nerve impulses.
- Keep **Spectrum**, **Neon Shatter** and **Liquid Chrome** untouched.
- Keep every isolated renderer deterministic, on Spectrum's shared analyser feed, without private RAF/timer loops or `Math.random()` motion.
- Keep mobile geometry/DPR budgets unchanged and advance the PWA namespace to Build 57 / cache v57.

## Build 56 — Dynamic breathing

- Add `shapeMotionTarget()` to `motion-spring.js`: quiet/mid values keep detail while the boosted top end is soft-compressed to reserve visible headroom for real peaks.
- Change signal-gated phase to a sub-linear activity curve so low/moderate passages retain motion without creating autonomous animation.
- Recalibrate **Pulse Reactor** with lower target ceilings, slower springs and signed bass/impact recoil; the same 3/4 ring, 14/24 segment and 10/18 spoke budgets remain.
- Recalibrate **Bass Fracture** without adding geometry: rupture spends less time pinned open, plate motion uses signed recoil/glide and cracks crawl through moderate energy instead of only appearing at maximum impact.
- Recalibrate **Gravity Lens** with compressed warp/shear/caustic targets and more continuous low-level precession, breathing and curved-stream drift while keeping the central horizon readable.
- Recalibrate **Bio Structure** so body inflation is less peak-dominated and spine sway, rib flex, membrane drift and nerve travel remain visible through groove-level energy.
- Keep **Spectrum**, **Neon Shatter** and **Liquid Chrome** untouched.
- Preserve the single shared-Spectrum FFT feed, deterministic geometry, no private RAF/timer loops and no `Math.random()` motion.
- Advance the PWA namespace to Build 56 / cache v56 so Build 55 motion calibration cannot remain stale in installed PWAs.

## Build 55 — Motion & elasticity + Bio Structure

- Add shared `motion-spring.js` state for deterministic short-memory inertia, velocity and overshoot keyed per Canvas/context; it owns no animation loop.
- Rework **Pulse Reactor** without adding geometry: stronger breathing core, propagated ring waves, elastic segment wobble and signal-gated spoke sway keep the hierarchy readable but visibly alive.
- Rework **Bass Fracture** without adding geometry: mobile motion scale rises to `1.58`, rupture gets spring overshoot, plates gain sway/lag and fault lines gain short signal-driven propagation.
- Rework **Gravity Lens** without adding geometry: spring warp/shear, orbital precession, band breathing and curved stream drift create continuous field motion while the central horizon stays anchored.
- Add **Bio Structure** as the seventh sanctioned Audio Lab preset: a living spine/rib mesh where bass inflates the body, mids flex branches and highs/transients travel as luminous nerve impulses.
- Give Bio Structure an explicit mobile budget of 5 ribs / 8 vein impulses / 6 spine nodes at DPR 1.05; desktop uses 8 / 14 / 9.
- Keep Spectrum sanctuary-protected and keep Neon Shatter / Liquid Chrome unchanged.
- Keep every isolated renderer on Spectrum's shared analyser feed first, deterministic, free of private RAF/timers and free of `Math.random()` motion.
- Advance the PWA shell to cache namespace v55 and cache both `motion-spring.js` and `bio-structure.js`.

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
- Persist admin mode for the installed desktop PWA launches after a deliberate `?admin=1` opt-in; `?admin=0` clears it.

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
