# Branch cleanup audit — Build 40

_Audit date: 2026-08-07_

## Why this exists

The repository accumulated emergency recovery branches, milestone branches, agent branches, migration branches and deployment experiments while GitHub Pages, Cloudflare Pages, Workers/R2 and external prototyping were evolving at the same time.

That branch history is useful in Git history and merged pull requests; it does **not** need to remain as 100+ live branch refs.

At this audit the repository exposed **146 branches**. `main` is now the only application source of truth.

## Branch population observed

The audit found, among other groups:

- 69 `agent/…` branches;
- 16 `feature/…` branches;
- 5 `refactor/…` branches;
- many `fix/…` and `hotfix/…` branches;
- historical `docs/…`, `chore/…`, `backup/…`, `ci/…` and recovery branches;
- one `migration/cloudflare-pages` branch;
- one `release/cloudflare-catalog-cutover` branch;
- historical `gh-pages` and `gh-pages-reset-probe` refs.

Most implementation branches correspond to merged pull requests. Their commits remain permanently recoverable through Git history and the PR timeline after branch deletion.

## Keep

After the repository-consolidation PR is merged, the intended long-lived branch set is:

```text
main
```

`chore/repo-consolidation-v40` is temporary and should be deleted after its PR merges.

## High-confidence deletion candidates

These refs are obsolete deployment/recovery or already-merged work and should not remain as active architecture:

```text
gh-pages
gh-pages-reset-probe
fix/github-pages-v40
fix/cloudflare-ui-stability-v38
fix/ui-navigation-polish-20260807
backup/gh-pages-broken-20260806
hotfix/navigation-recovery
repair/pages-ci-final
tmp/noop
migration/cloudflare-pages
release/cloudflare-catalog-cutover
```

The same rule applies to the merged milestone/feature/fix/agent branches represented by closed merged PRs.

## Safe deletion rule

A remote branch is safe to delete when **one** of these is true:

1. its pull request is merged into `main`;
2. its pull request is closed and explicitly superseded by another merged PR;
3. it is an obsolete recovery/deployment branch and no active workflow/config references it;
4. its head is already contained in current `main` and it has no independent work that must be preserved.

Do **not** mass-delete a branch with no PR/history check merely because its prefix looks old.

## Recommended GitHub cleanup sequence

1. Merge the Build 40 repository-consolidation PR.
2. Open **Repository → Branches**.
3. Delete branches GitHub marks as merged.
4. Delete the explicit obsolete recovery refs listed above after confirming no workflow references them.
5. Review the small remainder of branches with no merged PR one by one.
6. Delete `chore/repo-consolidation-v40` last.
7. Leave only `main` unless a genuinely active branch is still being worked on.

If local Git is available, stale local references can then be pruned with:

```bash
git fetch --prune origin
```

## Why `gh-pages` can go

GitHub Pages now uses the Actions workflow artifact produced from `main`. The workflow does not check out or deploy application source from `gh-pages`.

Deleting the historical `gh-pages` ref therefore removes a misleading second code line; it does not remove the current GitHub Pages deployment model.

## Prevention

- Prefer repository setting **Automatically delete head branches** after pull requests merge.
- Keep temporary work under clear `feature/`, `fix/` or `chore/` branches.
- Never use a recovery branch as a permanent deployment source.
- Never keep a special host branch containing runtime changes absent from `main`.
- Treat a branch as disposable after its PR is merged; Git history already preserves the work.

## Connector limitation during this cleanup

The GitHub integration used for the Build 40 reconciliation can create/update branches and files but does not expose a branch-ref deletion operation. Repository files, workflows, deployment topology and validation can be cleaned automatically; final deletion of remote branch refs therefore has to be done through GitHub’s branch UI (or an authenticated local/API command) after this vetted audit.
