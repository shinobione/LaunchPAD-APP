# SHINOBIWAN LaunchPAD

Installable music PWA for the SHINOBIWAN catalog: playback, Albums, synchronized lyrics, Audio Lab visuals, favorites, queues, Track DNA, Canvas/Studio experiences and shareable track cards.

## Current production / candidate state

```text
LaunchPAD candidate   2026.08.12.102
Release               phase-ux-c3-c11-visual-card-feedback-20260812
C3-C status           final Visual Card real-user smoke pending

Public Worker         v2.7
Worker Version ID     ddd90621-35d4-44b0-9c22-4e5a72291d9b
Track Manager         v5.19
Studio bridge         v1.11
Studio                v0.16.0 · Build 46 · Phase 7-A candidate
Track-To-Market       v0.1.5 · Bridge V2
SonicTrace            V2-E Build 06
Deep Audio            2.0.1-alpha
LRC Maker             6.3.8

Album authority       canonical-r2
Singles               virtual collection
```

Build 102 is a frontend-only Visual Card corrective layered on the real-user-tested C3-C sequence through Build 101. It pre-encodes the current 1080 × 1080 PNG before the Share gesture, adds deterministic single-owner Share / Download / Copy actions and exposes visible success/info/error feedback. Automated LaunchPAD/Chrome, horizontal-overflow, Worker dry-run and GitHub Pages gates are green. **Build 102 remains a candidate until the user performs the final Visual Card smoke.**

Studio Phase 7-A Build 46 is now a separate live candidate. Its authorization does not retroactively convert LaunchPAD Build 102 into a real-user pass.

This README is the current-state map. Historical build-by-build implementation detail remains in the dedicated docs/changelogs and Git history.

## PHASE UX C2.5 — status

**C2.5-A → C2.5-F is COMPLETE and real-user validated.**

Delivered and preserved:

- scalable Album presentation and mobile/player hardening;
- canonical R2 Album read model;
- guarded Track Manager Album writes;
- Studio Album Management + New Track binding;
- controlled migration of the three historical Albums;
- LaunchPAD canonical Album public cutover through Worker v2.7;
- virtual Singles semantics.

See:

- [`docs/PHASE-UX-C2-5-CLOSEOUT.md`](docs/PHASE-UX-C2-5-CLOSEOUT.md)
- [`docs/PHASE-UX-C2-5-F-REAL-USER-SMOKE-PASS.md`](docs/PHASE-UX-C2-5-F-REAL-USER-SMOKE-PASS.md)
- [`CHANGELOG-C2-5-CLOSEOUT.md`](CHANGELOG-C2-5-CLOSEOUT.md)

## C3 — current state

C3-A Deep Audio and C3-B Catalog Intelligence / V2-E parity are **COMPLETE — REAL USER PASS**.

The remaining PHASE UX boundary is **C3-C Premium Feel**, whose real-user loop materially changed LaunchPAD between Builds 91 and 102.

### C3-C real-user progression

- **Build 91** — initial premium layer; not accepted because it was too subtle.
- **Build 92** — stronger press/bloom/depth; interaction visible, but bloom too strong and route transitions effectively absent.
- **Build 93** — click glow tuned down and Audio Lab persistent halo removed; glow accepted.
- **Build 94** — route replay made visible; real-user result was too jittery/violent.
- **Build 95** — clean fade + short translate, desktop/mobile layout cleanup, Audio Lab sizing, Album scalability and integrated Show/Hide Tracks; broadly accepted, Lyrics still needed repair.
- **Build 96** — normal Lyrics auto-scroll + viewport-contained reader; real-user accepted (`NIQUELLE`).
- **Build 97** — mobile Home/Albums/Lyrics picker cleanup; layout improved, responsiveness still felt slow.
- **Build 98** — earlier mobile interaction wiring and Track Detail Moods/Themes reconciliation; partial improvement only.
- **Build 99** — stall-aware playback state + reduced expensive premium motion on touch devices; exposed a menu ownership race and remaining control chrome.
- **Build 100** — single-owner mobile menu, preserved early-open state, locked application pinch zoom, cleaned bottom-player rectangular chrome.
- **Build 101** — extended player-chrome cleanup to sidebar mini-player Previous/Next; real-user accepted (`okay pour les sale carrés`).
- **Build 102** — Visual Card Share / Download / Copy becomes deterministic and visibly acknowledged; final real-user Visual Card smoke pending.

Full handoff: [`docs/PHASE-UX-C3-C-CLOSEOUT-CANDIDATE.md`](docs/PHASE-UX-C3-C-CLOSEOUT-CANDIDATE.md).

Build 102 detail: [`docs/PHASE-UX-C3-C11-BUILD102-VISUAL-CARD-FEEDBACK.md`](docs/PHASE-UX-C3-C11-BUILD102-VISUAL-CARD-FEEDBACK.md).

## Visual Card Build 102 contract

The existing card renderer remains 1080 × 1080 and CORS-safe for Cloudflare/R2 artwork.

Build 102 changes only the export interaction boundary:

- the PNG is prepared as soon as the rendered card is ready;
- `Share image ↗` calls native file sharing directly from the user click when supported;
- unsupported native image share falls back explicitly to PNG download;
- `Download PNG` produces one download and shows `Downloaded ✓`;
- `Copy track link` shows `Copied ✓`;
- successful native share shows `Shared ✓`;
- cancelling native share is an informational state, not an error;
- the legacy bubble listener cannot double-run export actions.

No audio/player, queue, Album, Worker, R2, Track Manager, SonicTrace, Lyrics or Audio Lab semantics are changed by Build 102.

## Phase 7 authorization / handoff

The user explicitly authorized beginning **Phase 7 — End-to-end workflow** on 2026-08-12.

Authorization does **not** retroactively mark the pending Build 102 Visual Card smoke as passed. The boundary is therefore explicit:

```text
C3-C implementation line    through LaunchPAD Build 102
C3-C final user smoke       pending Visual Card confirmation
Phase 7-A                   Studio v0.16.0 · Build 46 live candidate
```

Pre-Phase-7 rollback anchors:

```text
LaunchPAD  safety/pre-phase7-authorized-20260812-0230
Studio     safety/pre-phase7-authorized-post-build45-20260812-0232
```

Phase 7 preserves the frozen product roles: Studio orchestrates; LaunchPAD remains the public listener product; Track Manager remains the protected write authority; SonicTrace and LRC Maker keep their specialist responsibilities; Track-To-Market remains review/ideation authority only; R2 remains canonical authority.

Phase 7-A is deliberately read-only: it derives `Identity → Core media → Lyrics → SonicTrace → Release` readiness and deep-links the user into existing guarded Studio surfaces. It does not mutate LaunchPAD or R2.

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

## Canonical Lyrics contract

```text
tracks/<slug>/lyrics.txt = unique canonical lyrics source
recognized timestamps    = synchronized lyrics
.lrc                      = optional export/compatibility only
```

A missing `.lrc` does not mean lyrics are unsynchronized. `.lrc` is never a second source of truth.

## Public Worker v2.7

The public Worker remains read-only and exposes:

```text
/health
/tracks
/albums
/albums/{id}
/albums/{id}/media/{cover|thumbnail}/{filename}
```

Canonical Album/media reads come from R2 authority. The validated Worker deployment remains:

```text
Worker Version ID   ddd90621-35d4-44b0-9c22-4e5a72291d9b
albumAuthority      canonical-r2
canonicalAlbums     3
```

Builds 90–102 do not require a public Worker runtime change; Worker workflows during these frontend candidates are validation/Wrangler dry-runs unless explicitly documented otherwise.

## Source of truth / topology

**GitHub `main` is the only application-code authority.** Cloudflare R2 remains canonical media/catalog/data authority. Workers are separate deployment units.

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

Product roles:

- LaunchPAD = public listener product;
- Studio = private orchestration cockpit;
- Track Manager = protected write/admin authority;
- SonicTrace = audio intelligence;
- LRC Maker = lyrics synchronization;
- Track-To-Market = release-pack ideation/finalization assistant, not canonical write authority;
- R2 = catalog/media/data authority;
- GitHub = code authority.

See [`docs/DEPLOYMENT-TOPOLOGY.md`](docs/DEPLOYMENT-TOPOLOGY.md).

## Safety / rollback

Recent PHASE UX / handoff checkpoints:

```text
safety/pre-c3-c-premium-feel-20260811-2003
safety/pre-c3-c4-build95-layout-smooth-20260811-2142
safety/pre-build102-visual-card-feedback-20260812-0220
safety/pre-phase7-authorized-20260812-0230
```

Historical C2.5 rollback anchor remains:

` safety/phase-ux-c2-5-complete-20260811-1356 `

## Verification policy

CI is required, but real-user smoke remains the final acceptance signal for user-facing milestones.

Build-synchronized Markdown/runtime validation is part of CI through `npm run check:build-docs`; deployment topology is guarded separately as well.

Do not mutate production media/R2 data merely to manufacture a frontend smoke test. Source merge, Pages deployment, Worker deployment and R2/catalog mutation remain separate auditable facts.

## Versioning discipline

A real LaunchPAD runtime release updates build/release/cache markers, affected tests and dedicated documentation together.

Candidate builds remain candidates until real-user smoke passes; automation never silently advances a subjective UX acceptance boundary.