# LaunchPAD roadmap

> Current application build: `2026.08.07.50` — release `audiolab-signal-first-20260807`.

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
- [x] Audio Lab's audible player is isolated from the analysis graph.
- [x] Audio Lab analysis uses a separately fetched/decoded copy synchronized to playback.
- [x] Build 50 moves Neon Shatter/Aurora Glass to raw-FFT-first geometry and gives Liquid Chrome/Singularity a moderate footprint gain.
- [x] All Markdown documentation is version-coupled to `js/build-config.js` through CI.

## P0 — real-device validation

- [ ] Validate Build 50 Neon Shatter on desktop and Android: paused = settled, playing = visibly driven by kicks/bins, no autonomous loop feel.
- [ ] Validate Build 50 Aurora Glass on desktop and Android with the same criteria.
- [ ] Confirm Liquid Chrome's moderate enlargement is enough without becoming visually oversized.
- [ ] Confirm Singularity's wider rings/horizon make real reactions legible without dominating the canvas.
- [ ] Continue background-playback testing for artefacts with Audio Lab open/closed.
- [ ] Verify multi-track switching keeps decoded FFT analysis synchronized across several tracks.

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
6. Audio Lab effects are validated against real FFT behavior, not merely visual motion.
