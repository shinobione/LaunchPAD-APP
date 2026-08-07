# LaunchPAD roadmap

_Last reset: 2026-08-07 — unified Build 40_

This roadmap starts from the post-reconciliation architecture. Historical migration checklists were intentionally removed from the active roadmap; completed work remains available in Git history.

## Baseline — complete

- [x] Reconcile the divergent Cloudflare v39 and GitHub `main` lines.
- [x] Establish Build `2026.08.07.40` / release `unified-v40-20260807` as the canonical application release.
- [x] Restore the Cloudflare Pages build scripts to canonical `main`.
- [x] Fix single-owner Track Detail routing and remove the Home/Track DNA detour.
- [x] Stop parser-loaded stylesheets from being rewritten after first paint.
- [x] Preserve the validated Audio Lab viewport/sanctuary behavior.
- [x] Modernize stale regression tests so they validate current contracts rather than historical build numbers.
- [x] Repair GitHub Pages so it deploys the validated Build 40 artifact directly from `main`.
- [x] Make GitHub `main` the only application-code source of truth.
- [x] Document GitHub Pages, Cloudflare Pages, Workers, R2 and Lovable boundaries.

## P0 — repository consolidation

- [ ] Confirm Cloudflare Pages staging visibly reports Build `2026.08.07.40` after the `main` reconciliation deployment.
- [x] Confirm GitHub Pages workflow reports `built` from canonical Build 40.
- [ ] Delete obsolete remote feature/fix/agent/migration branches after verifying they are merged or abandoned.
- [ ] Delete the historical `gh-pages` branch after confirming it is no longer referenced by any deployment workflow.
- [x] Rename the GitHub Pages workflow away from the old emergency/recovery filename.
- [ ] Remove obsolete one-off recovery workflows/configuration if any remain after branch audit.
- [ ] Audit root/docs files for duplicated or contradictory migration instructions.
- [ ] Reduce historical build-marker comments in `js/build-config.js` once no regression guard depends on them.
- [ ] Absorb/rename `navigation-stability-v39.js` and `ui-stability-v39.css` into permanent non-versioned runtime modules after a dedicated regression pass.
- [ ] Rename host-specific static build filenames (`build-cloudflare-pages.mjs`, validator, output directory) to host-neutral names after Cloudflare Pages dashboard configuration is changed atomically.

## P1 — deployment discipline

- [ ] Keep every application change on a temporary branch and merge through a green PR.
- [ ] Auto-delete merged branches in GitHub repository settings if desired.
- [ ] Treat Cloudflare Pages as a staging mirror of `main`, not an editable application source.
- [ ] Treat GitHub Pages as a workflow artifact deployment from `main`, not a `gh-pages` source branch.
- [ ] Keep Worker deployment protected/manual and separate from PWA deployment.
- [ ] Record the first fully repository-driven deployment of each Worker after current secrets/environment settings are verified.
- [ ] Stop dashboard source editing once Worker GitHub deployments are confirmed reproducible.

## P1 — product stability

- [ ] Continue Audio Lab regression testing for newly added presets through the shared reactivity layer.
- [ ] Keep Spectrum and Liquid Chrome sanctuary hashes intentional and reviewed.
- [ ] Test direct Track/Lyrics/Studio deep links on desktop and mobile after every routing refactor.
- [ ] Keep PWA update behavior to one prompt / one activation / one reload.
- [ ] Continue Android playback and Media Session smoke checks for player changes.

## P2 — catalog and Track Manager

- [ ] Complete catalog metadata for tracks that still have analysis/review warnings.
- [ ] Keep Track Manager as the only publishing interface for production track manifests/media.
- [ ] Rebuild `catalog/index.json` only when manifest/lyrics-derived metadata requires it.
- [ ] Keep the public Worker read-only and the private Worker behind Cloudflare Access.

## P2 — Lovable decision

Lovable is currently **not** part of the production authority chain.

Choose one future direction explicitly:

- [ ] **Keep Lovable as prototype-only** and periodically port useful UI experiments back to GitHub PRs; or
- [ ] **Plan a real migration** with a defined target architecture, cutover branch, CI parity and rollback plan.

Until one of those choices is deliberately made, no LaunchPAD feature is considered shipped merely because it exists in Lovable.

## Definition of repository cleanup complete

The consolidation is complete when:

1. `main` is the only active application source branch;
2. GitHub Pages and Cloudflare Pages both serve the same current build from `main`;
3. `gh-pages` and obsolete temporary branches are gone;
4. no workflow checks out a recovery/deployment branch as application source;
5. architecture/README/release docs agree on the same topology;
6. no current regression test depends on obsolete release-number comments;
7. versioned emergency runtime shims have been absorbed or explicitly documented as compatibility debt;
8. Workers/R2 remain clearly separate backend deployment/data concerns;
9. Lovable has an explicit role rather than silently acting as a parallel codebase.
