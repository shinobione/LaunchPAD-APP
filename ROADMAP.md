# LaunchPAD roadmap

_Last reset: 2026-08-07 — Build 41 after repository cleanup_

This roadmap starts from the post-reconciliation architecture. Historical migration checklists were intentionally removed from the active roadmap; completed work remains available in Git history.

## Baseline — complete

- [x] Reconcile the divergent Cloudflare v39 and GitHub `main` lines.
- [x] Establish Build `2026.08.07.40` as the reconciliation baseline, then advance to Build `2026.08.07.41` for Visual Card export/mobile Home corrections.
- [x] Restore the Cloudflare Pages build scripts to canonical `main`.
- [x] Fix single-owner Track Detail routing and remove the Home/Track DNA detour.
- [x] Stop parser-loaded stylesheets from being rewritten after first paint.
- [x] Preserve the validated Audio Lab viewport/sanctuary behavior.
- [x] Modernize stale regression tests so they validate current contracts rather than historical build numbers.
- [x] Repair GitHub Pages so it deploys the validated application artifact directly from `main`.
- [x] Make GitHub `main` the only application-code source of truth.
- [x] Document GitHub Pages, Cloudflare Pages, Workers, R2 and Lovable boundaries.
- [x] Repair Visual Card Share/Download PNG for R2-hosted artwork with a CORS-safe pre-canvas image path.
- [x] Restore LAUNCHPAD-first mobile Home order and stable latest-release action buttons.

## P0 — repository consolidation

- [ ] Confirm Cloudflare Pages staging visibly reports Build `2026.08.07.41` after the current `main` deployment.
- [x] Confirm GitHub Pages workflow deploys from canonical `main`.
- [x] Delete obsolete remote feature/fix/agent/migration branches after verifying they are merged or abandoned.
- [x] Delete the historical `gh-pages` branch and keep workflow deployment authoritative.
- [x] Enable automatic deletion of merged head branches.
- [x] Rename the GitHub Pages workflow away from the old emergency/recovery filename.
- [x] Confirm only the six canonical CI/deployment workflows remain.
- [x] Audit root/docs files for duplicated or contradictory migration instructions.
- [x] Remove the completed branch-cleanup and one-time R2 cleanup audit artifacts from the active tree.
- [x] Remove unused legacy branding/PWA assets while preserving current app-icon assets.
- [x] Add a repository-cleanliness regression guard so dead audits/assets/workflows do not quietly return.
- [x] Reduce historical build-marker comments in `js/build-config.js`; current metadata now represents Build 41 only.
- [ ] Absorb/rename `navigation-stability-v39.js` and `ui-stability-v39.css` into permanent non-versioned runtime modules after a dedicated regression pass.
- [ ] Rename host-specific static build filenames (`build-cloudflare-pages.mjs`, validator, output directory) to host-neutral names after Cloudflare Pages dashboard configuration is changed atomically.
- [ ] Retire the Track Manager's legacy GitHub/R2 migration backend and `migration-manifest.json` only through a dedicated backend refactor; those routes are still wired into current Worker source and are not safe cosmetic deletions.

## P1 — deployment discipline

- [x] Keep every application change on a temporary branch and merge through a green PR.
- [x] Auto-delete merged branches in GitHub repository settings.
- [x] Treat Cloudflare Pages as a staging mirror of `main`, not an editable application source.
- [x] Treat GitHub Pages as a workflow artifact deployment from `main`, not a `gh-pages` source branch.
- [x] Keep Worker deployment protected/manual and separate from PWA deployment.
- [ ] Record the first fully repository-driven deployment of each Worker after current secrets/environment settings are verified.
- [ ] Stop dashboard source editing once Worker GitHub deployments are confirmed reproducible.

## P1 — product stability

- [ ] Continue Audio Lab regression testing for newly added presets through the shared reactivity layer.
- [x] Keep Spectrum and Liquid Chrome sanctuary hashes intentional and reviewed.
- [ ] Test direct Track/Lyrics/Studio deep links on desktop and mobile after every routing refactor.
- [x] Keep PWA update behavior to one prompt / one activation / one reload.
- [ ] Continue Android playback and Media Session smoke checks for player changes.
- [ ] Verify Visual Card sharing/download on desktop and mobile whenever cover/media CORS behavior changes.

## P2 — catalog and Track Manager

- [ ] Complete catalog metadata for tracks that still have analysis/review warnings.
- [x] Keep Track Manager as the only publishing interface for production track manifests/media.
- [ ] Rebuild `catalog/index.json` only when manifest/lyrics-derived metadata requires it.
- [x] Keep the public Worker read-only and the private Worker behind Cloudflare Access.
- [ ] In a dedicated Track Manager refactor, remove dormant migration UI functions and legacy import API routes together with their manifest/config dependencies, then redeploy/verify the admin Worker.

## P2 — Lovable decision

Lovable is currently **not** part of the production authority chain and there is no Lovable deployment workflow or runtime dependency in the repository.

Choose one future direction explicitly:

- [ ] **Keep Lovable as prototype-only** and periodically port useful UI experiments back to GitHub PRs; or
- [ ] **Plan a real migration** with a defined target architecture, cutover branch, CI parity and rollback plan.

Until one of those choices is deliberately made, no LaunchPAD feature is considered shipped merely because it exists in Lovable.

## Definition of repository cleanup complete

The repository-level cleanup is complete now that:

1. `main` is the only persistent application source branch;
2. GitHub Pages/Cloudflare Pages are configured to use `main` rather than a recovery source;
3. `gh-pages` and the historical temporary-branch backlog are gone;
4. only canonical workflows remain and none deploy from Lovable;
5. architecture/README/release docs agree on the topology and Build 41 baseline;
6. completed one-time migration/branch audit documents and scripts are gone from the active tree;
7. unused duplicate branding/PWA assets are gone;
8. versioned compatibility shims still active in boot/deployment are explicitly documented rather than blindly removed;
9. Workers/R2 remain clearly separate backend deployment/data concerns;
10. Lovable has an explicit prototype-only role unless deliberately promoted later.

The remaining items above are **runtime/backend refactors or operational verification**, not repository garbage collection.
