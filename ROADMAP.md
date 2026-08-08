# LaunchPAD roadmap

> Current application build: `2026.08.08.57` — release `kinetic-flow-20260808`.

The repository cleanup/reconciliation phase is complete. This roadmap now tracks product/runtime work rather than historical migration chores.

## Baseline — complete

- [x] `main` is the only persistent application source branch.
- [x] GitHub Pages deploys the validated runtime from `main`.
- [x] Cloudflare Pages is staging only and tracks the same source.
- [x] Historical `gh-pages`, migration/fix backlog and duplicate deployment workflows are gone.
- [x] Worker deployment is explicit/protected and separate from PWA deployment.
- [x] R2 remains the canonical production media/catalog store.
- [x] Track routing is single-owner; no Home/Track DNA detour.
- [x] Visual Card PNG export is CORS-safe.
- [x] Mobile Lyrics can enter the selected track's Studio directly and the bottom navigation remains available.
- [x] Audio Lab's audible player is isolated from the decoded fallback analysis graph.
- [x] Spectrum is the protected reference analyser/render path for custom effects.
- [x] Neon Shatter and Liquid Chrome were rebuilt around real FFT-driven geometry.
- [x] Build 51 established the stable three-preset Audio Lab baseline.
- [x] Build 52 proved the incremental expansion model with Pulse Reactor.
- [x] Build 53 added Bass Fracture and stronger Pulse Reactor peak breakup.
- [x] Build 54 established readability as a first-class visual contract and added Gravity Lens.
- [x] Build 55 added deterministic spring memory/overshoot and Bio Structure without raising geometry budgets.
- [x] Build 56 tested dynamic-headroom compression but real-device feedback showed it reduced visible travel too far.
- [x] Build 57 replaces pose compression with integrated kinetic phase: sustained real audio now drives continuous travel while peaks add extra excursion.
- [x] All Markdown documentation is version-coupled to `js/build-config.js` through CI.

## P0 — real-device validation

- [x] Validate Build 51 Neon Shatter on desktop and Android: paused = settled, playing = visibly driven by kicks/bins, no autonomous loop feel.
- [x] Validate Build 51 Liquid Chrome on desktop and Android: real FFT deformation is visible and stable.
- [x] Confirm Spectrum still reacts exactly as before and remains the stable reference.
- [x] Validate Build 52 Pulse Reactor baseline on desktop and Android: shared-FFT reaction and mobile smoothness confirmed.
- [x] Validate Build 53 Pulse Reactor breakup and Bass Fracture shared-FFT behavior on desktop/mobile.
- [x] Validate Build 54 Pulse Reactor/Bass Fracture/Gravity Lens readability and baseline performance on desktop/mobile.
- [x] Validate Build 55 signal reactivity and spring motion on Pulse Reactor, Bass Fracture, Gravity Lens and Bio Structure.
- [x] Validate Build 56 real-device behavior and record that soft-knee compression made the four elastic modes feel less alive/ample despite correct FFT reaction.
- [ ] Validate Build 57 Pulse Reactor: whole-reactor drift + ring travel remain clearly visible through steady grooves, with kicks adding extra impact rather than being the sole movement source.
- [ ] Validate Build 57 Bass Fracture on mobile and desktop: body roll/translation and plate glide remain obvious between kicks, while rupture still feels forceful.
- [ ] Validate Build 57 Gravity Lens: continuous precession/drift/stream sweep is visible at moderate energy and pauses cleanly when audio stops.
- [ ] Validate Build 57 Bio Structure: spine/ribs/membrane/nerve motion reads as a living organism through steady passages, not only at peaks.
- [ ] Confirm all kinetic modes stop phase progression and settle their amplitude after pause.
- [ ] Verify switching all seven presets repeatedly does not lose analyser data.
- [ ] Continue background-playback testing for artefacts with Audio Lab open/closed.
- [ ] Verify multi-track switching keeps the shared/fallback FFT analysis synchronized across several tracks.

## P1 — Audio Lab expansion

- [x] Establish the rule: add future visual presets one at a time only after each new effect proves real FFT reactivity and pause settling.
- [x] Isolate Pulse Reactor, Bass Fracture, Gravity Lens and Bio Structure in their own renderer modules.
- [x] Give every isolated effect an explicit mobile geometry/DPR budget before merge.
- [x] Establish the readability rule: reduce simultaneous primitives before reducing reaction amplitude.
- [x] Establish spring-memory rule: inertia/overshoot may preserve short motion history, but must be driven by FFT targets and decay to rest.
- [x] Establish the kinetic-motion rule: real sustained audio must produce visible travel, not merely a larger static pose; peaks layer extra excursion on top.
- [x] Establish the integrated-phase rule: phase advances by `speed × dt` while real audio activity exists, rather than multiplying absolute time by a changing activity value.
- [ ] After Build 57 real-device validation, add the next effect against the same Spectrum-shared feed.
- [ ] Prefer amplitude, travel and elastic lag over permanently increasing particle/segment counts.
- [ ] Do not restore Aurora Glass, Nebula or Singularity by name unless they are deliberately rebuilt and pass the current contract.
- [ ] Keep Spectrum untouched as the reference renderer while new effects are developed.

## P1 — compatibility debt

- [ ] Absorb/rename `navigation-stability-v39.js` and `ui-stability-v39.css` into permanent non-versioned runtime modules after a dedicated regression pass.
- [ ] Rename host-specific static build filenames (`build-cloudflare-pages.mjs`, validator/output directory) only after Cloudflare Pages dashboard configuration is changed atomically.
- [ ] Retire Track Manager's legacy migration backend and `migration-manifest.json` through a dedicated backend refactor; do not delete them cosmetically while routes remain wired.
- [ ] Review duplicate compatibility files such as the sanctuary aliases only when imports/tests prove a single canonical path can replace them safely.

## P1 — deployment discipline

- [x] Temporary branch → PR → green CI → merge `main` → auto-delete branch.
- [x] GitHub Pages and Cloudflare Pages publish repository-built artifacts only.
- [x] Worker deployment remains protected/manual.
- [x] Every new build updates every `.md` document and passes `check:build-docs`.
- [ ] Record the next repository-driven public/private Worker production deploy with source SHA and Cloudflare version IDs.

## P2 — catalog / Track Manager

- [ ] Complete metadata for tracks still carrying analysis/review warnings.
- [x] Keep Track Manager as the only publishing interface for production manifests/media.
- [ ] Rebuild `catalog/index.json` only when manifest/lyrics-derived metadata requires it.
- [ ] Remove dormant migration UI/API routes in one coordinated Track Manager refactor, then redeploy/verify the admin Worker.

## P2 — Lovable

Lovable remains prototype-only. A feature is shipped only when it is implemented in this repository, passes CI and merges to `main`.

## Definition of current repository health

The repo is considered structurally healthy when:

1. `main` remains the only persistent source branch;
2. web hosts expose the same build/release;
3. Markdown docs match `js/build-config.js`;
4. Workers/R2 are treated as separate backend/data states;
5. no host-only runtime patch exists outside GitHub;
6. Audio Lab effects are validated against real FFT behavior, not merely visual motion;
7. each new Audio Lab effect has a deliberate mobile performance budget;
8. visual intensity does not come at the cost of readability or mobile smoothness;
9. spring/inertia amplitude decays to rest when the real audio target disappears;
10. sustained musical energy produces visible kinetic travel while peaks retain additional excursion.
