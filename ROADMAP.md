# LaunchPAD roadmap

> Current application build: `2026.08.08.65` — release `studio-private-read-bridge-20260808`.

The repository cleanup/reconciliation phase is complete. This roadmap now tracks product/runtime work rather than historical migration chores.

## Baseline — complete

- [x] `main` is the only normal application source branch; named `safety/*` branches are rollback references only.
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
- [x] Build 58 adds adaptive low-frequency onset detection so kicks/bass can be measured against a local baseline inside dense passages.
- [x] Build 59 separates detected onset from ordinary renderer clamps and applies a direct post-pose visual impact lane with reserved headroom.
- [x] Build 60 adds Void Bloom as the eighth isolated preset using the same shared FFT + kinetic phase + direct-impact architecture.
- [x] Build 61 adds Creep Signal as the ninth preset and establishes a deliberately non-radial, screen-traversing motion language.
- [x] Build 62/62.1 polishes Studio/Audio Lab/mobile-player layout and advances the visible build/cache marker correctly.
- [x] Build 63 adds SonicTrace to the persistent desktop admin shortcut strip with the same shared admin gate as LRC Maker and Track Manager.
- [x] Build 64 corrects SonicTrace's live PWA styling so the cyan/teal `ST` control uses the same pill geometry and behavior as the two existing admin tools.
- [x] Build 65 defines the GET-only, Access-authenticated Track Manager bridge for SHINOBIWAN Studio without weakening existing write protection.
- [x] Build 65 corrects the shared lyrics contract: timestamped canonical `lyrics.txt` is synchronized; a duplicate `.lrc` file is not required.
- [x] All Markdown documentation is version-coupled to `js/build-config.js` through CI.

## P0 — Studio integration safety

- [x] Create restoration snapshots before cross-repository integration: `safety/pre-studio-integration-20260808-1048` for LaunchPAD/Track Manager, SonicTrace and LRC Maker.
- [x] Keep Phase 4A additive: new `/api/studio/*` namespace only; no rewrite of existing Track Manager routes.
- [x] Keep Phase 4A GET/OPTIONS only and advertise `write: []`.
- [x] Keep Studio GET data behind Cloudflare Access and allow browser CORS only from `https://shinobione.github.io`.
- [x] Add a CI regression guard that fails if the Studio namespace acquires write methods or loses the legacy same-origin write guard.
- [ ] Merge Build 65 only after all LaunchPAD/Cloudflare/overflow validations are green.
- [ ] Deploy the **admin Worker only** from merged `main`, through the protected Cloudflare environment.
- [ ] Verify existing Track Manager operations after Worker deploy before connecting Studio to the new bridge.
- [ ] Connect Studio to `/api/studio/health` first in a separate Studio PR/release, then progressively consume private read data.
- [ ] Design Phase 4B write integration separately; no browser secret, wildcard CORS or direct weakening of `enforceSameOrigin()` is acceptable.

## P0 — real-device validation

- [x] Validate Build 51 Neon Shatter on desktop and Android: paused = settled, playing = visibly driven by kicks/bins, no autonomous loop feel.
- [x] Validate Build 51 Liquid Chrome on desktop and Android: real FFT deformation is visible and stable.
- [x] Confirm Spectrum still reacts exactly as before and remains the stable reference.
- [x] Validate Build 52 Pulse Reactor baseline on desktop and Android: shared-FFT reaction and mobile smoothness confirmed.
- [x] Validate Build 53 Pulse Reactor breakup and Bass Fracture shared-FFT behavior on desktop/mobile.
- [x] Validate Build 54 Pulse Reactor/Bass Fracture/Gravity Lens readability and baseline performance on desktop/mobile.
- [x] Validate Build 55 signal reactivity and spring motion on Pulse Reactor, Bass Fracture, Gravity Lens and Bio Structure.
- [x] Validate Build 56 real-device behavior and record that soft-knee compression made the four elastic modes feel less alive/ample despite correct FFT reaction.
- [x] Validate Build 57 continuous travel on Pulse Reactor, Bass Fracture, Gravity Lens and Bio Structure; real-device feedback confirms they move/turn/undulate through the groove.
- [x] Validate Build 58 real-device behavior and record that adaptive onset detection alone did not create visible hits because the renderer targets could already be near their clamp ceiling.
- [x] Validate Build 59 Pulse Reactor/Bass Fracture/Gravity Lens/Bio Structure direct impact on real devices: continuous travel remains and kick/bass hits now create distinct visual excursions.
- [x] Validate Build 60 Void Bloom architecture/CI with shared FFT, kinetic motion, Direct Impact and explicit 7-petal / 7-vein mobile budget.
- [ ] Validate Build 60 Void Bloom visually on desktop + Android: groove motion stays alive and kick/bass direct impact remains obvious.
- [ ] Validate Build 61 Creep Signal on desktop: whole network continuously crawls, branches whip independently and kick/bass onsets lunge/shear the structure.
- [ ] Validate Build 61 Creep Signal on Android: 9-node / 6-branch / 7-pulse budget remains fluid while the Direct Impact lunge stays obvious.
- [ ] Confirm all kinetic modes stop phase progression and settle their amplitude/impact after pause.
- [ ] Verify switching all nine presets repeatedly does not lose analyser data.
- [ ] Continue background-playback testing for artefacts with Audio Lab open/closed.
- [ ] Verify multi-track switching keeps the shared/fallback FFT analysis synchronized across several tracks.

## P1 — Audio Lab expansion

- [x] Establish the rule: add future visual presets one at a time only after each new effect proves real FFT reactivity and pause settling.
- [x] Isolate Pulse Reactor, Bass Fracture, Gravity Lens, Bio Structure, Void Bloom and Creep Signal in their own renderer modules.
- [x] Give every isolated effect an explicit mobile geometry/DPR budget before merge.
- [x] Establish the readability rule: reduce simultaneous primitives before reducing reaction amplitude.
- [x] Establish spring-memory rule: inertia/overshoot may preserve short motion history, but must be driven by FFT targets and decay to rest.
- [x] Establish the kinetic-motion rule: real sustained audio must produce visible travel, not merely a larger static pose; peaks layer extra excursion on top.
- [x] Establish the integrated-phase rule: phase advances by `speed × dt` while real audio activity exists, rather than multiplying absolute time by a changing activity value.
- [x] Establish the adaptive-onset rule: low-frequency transients are detected relative to a local baseline so dense passages cannot erase kick/bass accents.
- [x] Establish the reserved-impact rule: transient emphasis must have a post-pose lane outside ordinary clamped spring targets.
- [x] Establish the composition-diversity rule: new visual families should not default back to a centered radial object when an equally cheap asymmetric composition is possible.
- [ ] After Build 61 real-device validation, add the next effect against the same Spectrum-shared feed.
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
- [ ] Record the next repository-driven private Worker production deploy with source SHA and Cloudflare version ID.

## P2 — catalog / Track Manager

- [ ] Complete metadata for tracks still carrying analysis/review warnings.
- [x] Keep Track Manager as the only production publishing/write interface until a separately secured Studio write path is proven.
- [ ] Rebuild `catalog/index.json` only when manifest/lyrics-derived metadata requires it.
- [ ] Remove dormant migration UI/API routes in one coordinated Track Manager refactor, then redeploy/verify the admin Worker.

## P2 — Lovable

Lovable remains prototype-only. A feature is shipped only when it is implemented in this repository, passes CI and merges to `main`.

## Definition of current repository health

The repo is considered structurally healthy when:

1. `main` remains the only normal persistent source branch and safety snapshots remain rollback-only;
2. web hosts expose the same build/release;
3. Markdown docs match `js/build-config.js`;
4. Workers/R2 are treated as separate backend/data states;
5. no host-only runtime patch exists outside GitHub;
6. Audio Lab effects are validated against real FFT behavior, not merely visual motion;
7. each new Audio Lab effect has a deliberate mobile performance budget;
8. visual intensity does not come at the cost of readability or mobile smoothness;
9. spring/inertia amplitude decays to rest when the real audio target disappears;
10. sustained musical energy produces visible kinetic travel while low-frequency onsets retain a separate post-pose impact with reserved headroom;
11. the Audio Lab can introduce new composition families without duplicating the same centered radial grammar;
12. Studio integration can fail or be reverted without disabling the standalone Track Manager, LaunchPAD, SonicTrace or LRC Maker.
