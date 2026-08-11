# SHINOBIWAN LaunchPAD

Installable music PWA for the SHINOBIWAN catalog: playback, Albums, synchronized lyrics, Audio Lab visuals, favorites, queues, Track DNA, Canvas/Studio experiences and shareable track cards.

## Current production state

```text
LaunchPAD build       2026.08.11.89
Current main          c128113638dde45e845393eff9bf931d92567adb
Public Worker         v2.7
Worker Version ID     ddd90621-35d4-44b0-9c22-4e5a72291d9b

Track Manager         v5.19
Studio bridge         v1.11

Studio                v0.12.2 · Build 37
SonicTrace            V2-E Build 05
LRC Maker             6.3.8

Public tracks         30
Canonical Albums      3
Album authority       canonical-r2
Singles               virtual collection
```

This README is the current-state map. Historical build-by-build implementation detail remains in the dedicated docs/changelogs and Git history.

## PHASE UX C2.5 — status

**C2.5-A → C2.5-F is COMPLETE and real-user validated.**

Final C2.5-F acceptance on 2026-08-11:

- desktop: PASS;
- mobile: PASS;
- Neon Heartbreaks visible as canonical Album;
- Coal to Diamond visible as canonical Album;
- Love Letters from Saigon visible as canonical Album;
- Singles visible as the virtual fourth project;
- Album covers render;
- the global player remains active while browsing Albums.

See:

- [`docs/PHASE-UX-C2-5-CLOSEOUT.md`](docs/PHASE-UX-C2-5-CLOSEOUT.md)
- [`docs/PHASE-UX-C2-5-F-REAL-USER-SMOKE-PASS.md`](docs/PHASE-UX-C2-5-F-REAL-USER-SMOKE-PASS.md)
- [`CHANGELOG-C2-5-CLOSEOUT.md`](CHANGELOG-C2-5-CLOSEOUT.md)

## Important stop line

PHASE UX as a whole is **not yet closed**.

Next PHASE UX milestone is **C3 — SonicTrace Deep Audio / V2-E parity**, which is **NOT STARTED** by this documentation closeout.

Phase 7 remains **LOCKED / NOT AUTHORIZED**. Do not implement, scaffold, branch, merge or deploy Phase 7 without explicit user authorization after final PHASE UX closeout.

## Canonical Album architecture

```text
albums/<album-id>/manifest.json
albums/<album-id>/cover/<filename>
albums/<album-id>/thumbnail/thumbnail.webp
```

Frozen rules:

- Album ID is immutable canonical storage identity;
- ordered `album.trackIds` is authoritative membership + artistic order;
- track `album.id/title` is compatibility cache during migration, not authority;
- `catalog/index.json` is a rebuildable projection, not Album authority;
- Singles is virtual and derived from tracks not owned by a canonical Album.

Current canonical R2 Album set:

- `neon-heartbreaks`;
- `coal-to-diamond`;
- `love-letters-from-saigon`.

## C2.5 history in one screen

### C2.5-A — scalable Albums + frontend/mobile/player polish

Builds 68–87 established scalable Album presentation, Album Focus/Era behavior, Android/PWA/Lyrics Studio hardening and the accepted global-touch baseline. Build 87 passed real-user Android/PWA smoke and remains the sanctuarized UX baseline inherited by later builds.

### C2.5-B — canonical Album read model

Build 88 introduced the canonical R2 Album read/projection model without creating a second catalog authority.

### C2.5-C — guarded Album writes

Track Manager gained protected Album list/read/create/edit/membership/order/assets operations with stale-write protection, ownership guards and transactional rollback.

### C2.5-D — Studio Album Management + New Track binding

Studio gained Album management and safe canonical Album binding. Unknown Album requests block Review; draft creation is explicit; Singles remains a safe no-membership fallback.

### C2.5-E — controlled migration

The three historical Album projects were migrated to canonical R2 through a dry-run-first, one-Album-at-a-time guarded workflow with state fingerprints and rollback. Singles transitioned to virtual semantics.

### C2.5-F — public canonical cutover

Build 89 switched the public Album authority to canonical R2 through public Worker v2.7. Legacy hardcoded Album data remains only as an isolated degraded fallback if canonical authority is unavailable.

## Public Worker v2.7

Public Worker v2.7 exposes:

```text
/health
/tracks
/albums
/albums/{id}
/albums/{id}/media/{cover|thumbnail}/{filename}
```

The public Worker is read-only. Album/media reads are sourced from canonical R2 authority.

Production evidence:

```text
albumAuthority      canonical-r2
canonicalAlbums     3
publicTracks        30
Worker Version ID   ddd90621-35d4-44b0-9c22-4e5a72291d9b
```

### Deployment verification incident

Workflow `31485890830` successfully deployed Worker v2.7, but its original post-deploy check failed while a Cloudflare edge still exposed the older health shape during a short convergence window.

A later read-only live probe confirmed:

```text
/health  -> HTTP 200 / v2.7 / canonical-r2 / 3 Albums
/tracks  -> HTTP 200 / 30 tracks / 3 Albums / canonical-r2
/albums  -> HTTP 200 / 3 Albums / canonical-r2
```

PR #207 hardened only the deployment verifier to allow up to 180 seconds of edge convergence and to distinguish stale-edge version from a real Album-authority failure. No Worker runtime change or R2 mutation was required.

Post-merge checks on current main passed:

```text
Validate LaunchPAD              31486980001  SUCCESS
Validate Cloudflare Workers     31486979937  SUCCESS
Validate Horizontal Overflow    31486980007  SUCCESS
Deploy LaunchPAD to Pages       31486979942  SUCCESS
```

## Canonical Lyrics contract

```text
tracks/<slug>/lyrics.txt = unique canonical lyrics source
recognized timestamps    = synchronized lyrics
.lrc                      = optional export/compatibility only
```

A missing `.lrc` does not mean lyrics are unsynchronized. `.lrc` is never a second source of truth.

## Source of truth

**GitHub `main` is the only application-code authority.**

Public/staging hosts:

- GitHub Pages: `https://shinobione.github.io/LaunchPAD-APP/`
- Cloudflare Pages staging: `https://shinobiwan-launchpad-staging.pages.dev/`

Cloudflare R2 remains canonical media/catalog/data authority. Workers remain separate backend deployment units.

See [`docs/DEPLOYMENT-TOPOLOGY.md`](docs/DEPLOYMENT-TOPOLOGY.md) for the canonical hosting/deployment topology.

## Architecture at a glance

```text
GitHub main
   |
   +--> GitHub Pages ---------+
   |                          |
   +--> Cloudflare Pages -----+--> LaunchPAD PWA
                                      |
                         +------------+------------+
                         |                         |
                         v                         v
                launchpad-media Worker    launchpad-r2-api Worker
                         |                         |
                         +------------+------------+
                                      |
                               Cloudflare R2
```

Product roles remain frozen:

- LaunchPAD = public listener product;
- Studio = private orchestration cockpit;
- Track Manager = protected write/admin authority;
- SonicTrace = audio intelligence;
- LRC Maker = lyrics synchronization;
- R2 = catalog/media/data authority;
- GitHub = code authority.

## Safety / rollback

C2.5 closeout checkpoint created before documentation changes:

```text
safety/phase-ux-c2-5-complete-20260811-1356
```

The same named checkpoint exists in Studio.

## Verification policy

CI is required, but real-user smoke is the final acceptance signal for user-facing milestones.

Before merging runtime or infrastructure changes, the living documentation contract includes `npm run check:build-docs` alongside the normal validation suite.

Do not mutate production media/R2 data merely to manufacture a frontend smoke test.

Source merge, Pages deployment, Worker deployment and R2/catalog mutation remain separate auditable facts.

## Versioning discipline

A real LaunchPAD runtime release updates build/release/cache markers, affected tests, docs and README together.

A documentation-only closeout does **not** fabricate Build 90 or Worker v2.8.