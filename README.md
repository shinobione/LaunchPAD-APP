# SHINOBIWAN LaunchPAD

> Current application build: `2026.08.09.71` — release `phase-ux-c2-5-a-era-play-mobile-20260809`.

Installable music PWA for the SHINOBIWAN catalog: playback, albums, synchronized lyrics, Audio Lab visuals, favorites, queues, Track DNA, Canvas/Studio experiences and shareable track cards.

## PHASE UX C2.5-A — Albums scalability frontend

Build 68 established the scalable Albums baseline: tracklists are collapsed by default, each populated card exposes `Show N tracks` / `Hide tracks`, opening one list closes the previously expanded one, and the toggle keeps native keyboard behavior with `aria-expanded` + `aria-controls`. Real-user visual review confirmed that this presentation is substantially cleaner than the previous always-expanded page.

Build 69 refines that accepted direction without changing the Album data model. `Show N tracks` now promotes the selected Album into an animated **Album Focus** layout: on wide desktop the active project occupies the dominant panel while sibling Albums move into a compact, still-clickable dock; narrower layouts keep the active Album first without forcing a fragile side rail. View Transitions are progressive-only and reduced-motion aware.

Discography Era selection creates a virtual playback context. Once a track from that Era is played, the existing queue engine resolves the Era tracks as a reconstructible `era:` collection, labels the player context `Era queue`, and keeps Next / Previous inside that Era just like Album playback.

Build 70 is the narrow-screen Album Focus follow-up found during real-user mobile smoke. When a lower Album is expanded on mobile/tablet, the runtime waits for the reorder/View Transition to finish and then follows the selected Album to its new position, accounting for the sticky topbar. Desktop Album Focus is unchanged; closing an Album does not force a scroll; reduced-motion preference remains respected.

Build 71 polishes the **Era** workflow. Selecting exactly one Era now reveals a dedicated `Play Era · N` action. It starts the same existing virtual `era:` queue from the Era's first title instead of requiring a track card to be launched first. The button disappears again for `All eras` or any state without one unambiguous Era. On mobile, the Era selector becomes a wider snap carousel, deliberately reveals neighboring content, centers the chosen Era and includes a visible `Swipe to explore eras →` affordance so horizontal navigation is discoverable.

`Play album` and `Open project →` remain available, and the individual Album detail page remains complete and unchanged. Build 71 is LaunchPAD frontend-only: no Track Manager change, no Worker deployment, no R2 mutation, no canonical Album schema, no migration and no `catalog/index.json` change. See [`docs/PHASE-UX-C2-5-A-ALBUMS-SCALABILITY.md`](docs/PHASE-UX-C2-5-A-ALBUMS-SCALABILITY.md), [`docs/PHASE-UX-C2-5-A-ALBUM-FOCUS-ERA-QUEUE.md`](docs/PHASE-UX-C2-5-A-ALBUM-FOCUS-ERA-QUEUE.md), [`docs/PHASE-UX-C2-5-A-MOBILE-ALBUM-FOCUS-HOTFIX.md`](docs/PHASE-UX-C2-5-A-MOBILE-ALBUM-FOCUS-HOTFIX.md) and [`docs/PHASE-UX-C2-5-A-ERA-PLAY-MOBILE.md`](docs/PHASE-UX-C2-5-A-ERA-PLAY-MOBILE.md).

The Build 71 refinement remains a release candidate until CI, Pages and real-user browser/mobile smoke pass. The final PHASE UX checkpoint is not created, C2.5-B is not started, C3 remains suspended, and Phase 7 is not started.

## Production PHASE UX C2 backend

Track Manager `v5.16` / Studio bridge `v1.8` is the deployed private backend. It was deployed from `1bbe0293e4e17968bb7e191f58e7ae1cdd95dadf` by admin-only workflow `31324447727`; the recorded Worker Version ID is `5a83c6dd-cfb4-4be6-ab8d-16b5c34bdc2b` and Cloudflare Access remains protected.

The C2 integration accepts request-scoped observed canonical-audio duration evidence from LRC Maker `6.3.6` on the existing Lyrics validation/save routes. Real-user production smoke passed canonical playback, timestamp navigation, synchronized `lyrics.txt` save and canonical reread; the false end-of-audio blocker is gone. `lyrics.txt` remains the only canonical lyrics source and `.lrc` remains optional export/compatibility only.

The C2 deployment skipped every public Worker step, did not change LaunchPAD's then-current public Build 67 runtime, and did not perform an automated production R2 test mutation. The public media Worker remains `v2.6`. The final PHASE UX checkpoint is not created, C3 is suspended pending C2.5, and Phase 7 is not started.

See [`docs/STUDIO-LYRICS-SYNCHRONIZATION.md`](docs/STUDIO-LYRICS-SYNCHRONIZATION.md) and [`docs/PHASE-6-PROTECTED-MEDIA-SEEK-HOTFIX.md`](docs/PHASE-6-PROTECTED-MEDIA-SEEK-HOTFIX.md).

## Source of truth

**GitHub `main` is the only application-code authority.**

Public / staging hosts:

- GitHub Pages: `https://shinobione.github.io/LaunchPAD-APP/`
- Cloudflare Pages staging: `https://shinobiwan-launchpad-staging.pages.dev/`

Both hosts publish the same validated runtime from `main`. Cloudflare R2 remains the canonical media/catalog store; Workers remain separate backend deployment units. Lovable is prototype-only unless a future migration is explicitly promoted back through GitHub.

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

See [`docs/DEPLOYMENT-TOPOLOGY.md`](docs/DEPLOYMENT-TOPOLOGY.md) for the authoritative hosting map.

## Track Manager v5.13 / Studio bridge v1.5 — final roadmap Phase 4 backend

The public LaunchPAD stayed on **Build 66** while v5.13 was introduced as a private Track Manager Worker-only evolution.

The existing private read, metadata and canonical lyrics contracts remained unchanged. Bridge v1.5 added a separate `manage` capability family for the remaining Track Manager operations named by the SHINOBIWAN Studio roadmap Phase 4:

```json
{
  "read": ["tracks", "track", "lyrics"],
  "validate": ["metadata", "lyrics"],
  "write": ["metadata", "lyrics"],
  "manage": ["track-create", "assets", "catalog-rebuild"]
}
```

New scoped routes:

```text
POST /api/studio/tracks/create
POST /api/studio/tracks/<slug>/assets/<kind>/upload
POST /api/studio/tracks/<slug>/assets/<kind>/delete
POST /api/studio/catalog/rebuild
```

Key rules:

- Cloudflare Access and the exact Studio origin remain mandatory;
- create always starts a new track as `draft` and rejects duplicate slugs;
- uploads operate on exactly one canonical asset kind at a time;
- audio, cover, thumbnail, lyrics TXT and video/Canvas use the existing Track Manager upload validators;
- lyrics upload stays canonical `lyrics.txt`; no `.lrc` persistence is introduced;
- file uploads use browser multipart FormData without custom headers, avoiding the previously proven Access/CORS preflight trap;
- asset operations require canonical `expectedUpdatedAt` stale protection;
- previous R2 objects are temporarily backed up outside the canonical track prefix during replace/delete transactions;
- manifest/catalog publication is verified after operations;
- failures attempt object + manifest + catalog compensation;
- published tracks cannot lose an essential asset or accept an asset change that makes quality non-publishable;
- explicit catalog rebuild requires a literal `REBUILD` confirmation;
- no whole-track deletion is exposed by Studio;
- no legacy all-in-one `saveTrack()` route is opened cross-origin;
- every unrelated legacy Track Manager write retains `enforceSameOrigin()`;
- SonicTrace, LRC Maker and Phase 5 persistence are untouched.

See [`docs/STUDIO-PHASE4-OPERATIONS.md`](docs/STUDIO-PHASE4-OPERATIONS.md).

## Track Manager v5.12 / Studio bridge v1.4 — canonical lyrics ancestry

v5.12 added guarded canonical `lyrics.txt` read/validate/save before the final operational bridge:

- `GET /api/studio/tracks/<slug>/lyrics` exposes canonical text + opaque R2 ETag;
- validate/save require both manifest `expectedUpdatedAt` and `expectedLyricsEtag`;
- validation is non-mutating;
- save is limited to an existing canonical `lyrics.txt`;
- timestamps inside `lyrics.txt` define synchronized state;
- `.lrc` remains optional compatibility/export only;
- successful save updates server-owned manifest revision fields, rebuilds `catalog/index.json`, rereads the stored object/manifest and verifies the changed ETag;
- failure attempts lyrics + manifest + catalog rollback.

See [`docs/STUDIO-LYRICS-WRITE.md`](docs/STUDIO-LYRICS-WRITE.md).

## Track Manager v5.11 / Studio bridge v1.3 — metadata-only write ancestry

v5.11 introduced the first real Studio production write while keeping media isolated:

- `POST /api/studio/tracks/<slug>/metadata/save`;
- CORS-simple `text/plain` transport;
- mandatory `expectedUpdatedAt`;
- whitelist-only metadata;
- quality blocking for invalid published proposals;
- canonical manifest write + catalog rebuild + reread verification;
- compensating manifest/catalog rollback on failure;
- no direct media mutation plumbing.

The metadata write was smoke-tested and restored cleanly in the real browser on `soft-addiction`.

See [`docs/STUDIO-METADATA-WRITE.md`](docs/STUDIO-METADATA-WRITE.md).

## Historical: Track Manager v5.10 / Studio bridge v1.2 CORS hotfix

v5.10 kept metadata validation non-mutating and added a CORS-safelisted `text/plain` transport after the real Chrome + Cloudflare Access path showed that the older JSON/custom-header request could be intercepted at preflight.

Exact origin, Access verification, whitelist-only metadata and stale-manifest protection remained mandatory.

See [`docs/STUDIO-VALIDATION-CORS-HOTFIX.md`](docs/STUDIO-VALIDATION-CORS-HOTFIX.md).

## Build 71 highlights

Build 71 adds a dedicated `Play Era · N` action whenever exactly one Discography Era is selected. The action is hidden otherwise and reuses the same reconstructible `era:` collection already supported by the shared queue engine, starting from the first track in that Era without creating an Album or persistent playlist.

On mobile, Era cards are wider and scroll-snap to the viewport, the chosen Era recenters after selection, neighboring content stays partially visible, and an explicit `Swipe to explore eras →` hint makes the horizontal interaction discoverable. Reduced-motion preference disables decorative hint movement.

Build 71 changes no Worker, R2 object, canonical Album schema, track manifest, catalog projection, SonicTrace runtime or Phase 7 scope.

## Build 70 highlights

Build 70 fixes the mobile/tablet viewport gap discovered after Build 69: when an Album card lower in the list is expanded, the card is first reordered to the focused position and the viewport then follows that new position instead of remaining stranded near the bottom of the old layout. The topbar height is accounted for so the Album header/actions remain visible.

The follow-up scroll runs only at widths up to 1180 px and only on expansion. Desktop Album Focus, Hide tracks, Album playback, Open project, Album detail and Era Queue behavior remain unchanged. Reduced-motion preference uses immediate rather than smooth scrolling.

Build 70 changes no Worker, R2 object, canonical Album schema, track manifest, catalog projection, SonicTrace runtime or Phase 7 scope.

## Build 69 highlights

Build 69 is the C2.5-A UX refinement for **Album Focus + Era Queue**. Expanding a tracklist gives the active Album visual priority while keeping sibling Albums accessible in a compact dock on wide screens; narrower layouts move the focused project to the top instead. The layout uses progressive View Transitions when available and respects reduced-motion preferences.

Discography Era filters now double as a virtual playback collection boundary: selecting a single Era attaches an `era:` queue context to its track play controls, the existing catalog resolver reconstructs Era membership from track metadata, and the shared queue/player handles sequential playback without creating or persisting an Album object.

Build 69 changes no Worker, R2 object, canonical Album schema, track manifest, catalog projection, SonicTrace runtime or Phase 7 scope.

## Build 68 highlights

Build 68 is the PHASE UX C2.5-A frontend scalability release for the main Albums view. Album/project cards render compactly with tracklists hidden by default. `Show N tracks` expands one native-button-controlled list at a time, `Hide tracks` collapses it, ARIA state/control relationships remain explicit, keyboard focus is visible, and the mobile action bar prevents button overlap.

The existing album playback queue and `Open project →` route are unchanged, and individual Album detail pages still render their complete tracklists. Build 68 changes no Worker, R2 object, schema, migration, canonical Album authority, SonicTrace runtime or Phase 7 scope.

## Build 67 highlights

Build 67 is a post-Phase-6 public maintenance hotfix for the Home **Track DNA** panel. The public catalog normalizer already provides `releaseDate` as a normalized ISO value. The old Track DNA formatter incorrectly appended another `T00:00:00`, producing an invalid date such as `...ZT00:00:00` and falling back to `Date TBD` even though Track Manager and the track-detail page had the correct release date.

Build 67 now parses the normalized value directly with `new Date(value)`. A regression guard covers both date-only and full ISO inputs, and the PWA cache namespace advances to v67 so installed/browser clients receive the corrected runtime.

This hotfix changes no R2 data, Track Manager route, public media Worker, SonicTrace analysis, lyrics contract or Phase 7 scope.

## Build 66 highlights

Build 66 introduced SHINOBIWAN Studio Phase 4B.1A metadata validation while the public PWA itself stayed stable. Later Track Manager revisions are private Worker-only backend evolutions and intentionally did not advance the public PWA build/cache until Build 67.

## Build 65 highlights

Build 65 introduced the authenticated `/api/studio/*` private-read bridge with exact-origin CORS, Cloudflare Access verification and public fallback support. It also froze the corrected synchronized-lyrics contract: timestamped canonical `lyrics.txt` is already synchronized and a second `.lrc` file is optional.

## Audio Lab protected release history

Builds 52-61 established the currently sanctioned nine-preset shared-FFT Audio Lab line, including Pulse Reactor, Bass Fracture, Gravity Lens, Bio Structure, Void Bloom and Creep Signal while keeping Spectrum as the sanctuary reference path. These visual-runtime contracts are unchanged by Studio/Track Manager integration.

## Build 63 / 64 admin links

Build 63 added SonicTrace to the desktop admin strip; Build 64 corrected its cyan/teal pill styling to match the established Track Manager/LRC Maker geometry. These LaunchPAD UI paths remain unchanged by worker-only Studio integration.

## Canonical media model

Production media lives in R2:

```text
catalog/index.json
tracks/<slug>/manifest.json
tracks/<slug>/audio.<ext>
tracks/<slug>/cover.<ext>
tracks/<slug>/thumbnail.webp
tracks/<slug>/lyrics.txt      # optional; may contain synchronization timestamps
tracks/<slug>/video.<ext>     # optional
```

Temporary Track Manager rollback material may exist during an active scoped asset transaction only under `_studio-backups/<slug>/...`; it is not canonical track data and is removed after success/compensation.

The public application hydrates through the public Worker. Localhost/CI may use deterministic fixtures; production must not silently substitute a bundled production catalog.

## Local development

```bash
npm ci
python3 -m http.server 4173
```

Then open `http://127.0.0.1:4173/`.

A local HTTP server is required for ES modules, media behavior and the service worker.

## Validation

Before merging application or infrastructure changes:

```bash
npm run validate
npm run check:wrangler
npm run check:build-docs
```

`check:build-docs` validates the active build marker in living release documentation. Historical phase/audit Markdown files are immutable snapshots and are no longer rewritten just to mirror a later public build number.

CI checks browser navigation, PWA/service-worker behavior, Audio Lab signal contracts, catalog contracts, Cloudflare bundles, repository cleanliness, current release documentation, Studio bridge security boundaries and desktop overflow regressions.

The Studio bridge guards separately prove that:

- metadata validation remains non-mutating;
- metadata save remains media-isolated;
- canonical lyrics remains manifest+ETag guarded;
- management remains limited to track-create, per-asset upload/delete and explicit catalog rebuild;
- Phase 6 contextual lyrics save remains specialized and canonical;
- protected media reads retain Cloudflare Access and byte-range support;
- whole-track deletion is not exposed;
- legacy unrelated Track Manager writes remain same-origin.

## Release discipline

A public runtime build advances in one place: `js/build-config.js`.

Every public runtime change must advance the build/cache marker and update the living release documentation. Historical phase/audit documents keep the build state they were written to describe. Worker-only contract revisions do not advance the public LaunchPAD build unless public runtime code changes.

Web-host deployment, Worker deployment and R2/catalog mutation remain separate states. Do not report “deployed” without saying which state changed.

## Project map

```text
index.html                    Static application shell
css/                          UI, responsive and feature styles
js/
  build-config.js             Single public application release/version source
  app-engine*.js              Boot/recovery bootstrap
  app-main.js                 Main application composition
  core/                       Shared catalog/router/player/theme state
  features/                   User-facing modules
cloudflare/                   Public/private Worker source and Wrangler configs
scripts/                      Validation, build and deployment tooling
tests/                        Browser regression fixtures
docs/                         Operational and architecture documentation
.github/workflows/            CI and deployment workflows
```

Useful documents:

- [`ARCHITECTURE.md`](ARCHITECTURE.md) — runtime/module structure
- [`CHANGELOG.md`](CHANGELOG.md) — recent public build history
- [`docs/DEPLOYMENT-TOPOLOGY.md`](docs/DEPLOYMENT-TOPOLOGY.md) — canonical hosting/deployment topology
- [`docs/SHINOBIWAN-STUDIO-CONTRACT.md`](docs/SHINOBIWAN-STUDIO-CONTRACT.md) — Studio integration contract
- [`docs/STUDIO-VALIDATION-CORS-HOTFIX.md`](docs/STUDIO-VALIDATION-CORS-HOTFIX.md) — v5.10 browser validation transport hotfix
- [`docs/STUDIO-METADATA-WRITE.md`](docs/STUDIO-METADATA-WRITE.md) — v5.11 metadata write contract
- [`docs/STUDIO-LYRICS-WRITE.md`](docs/STUDIO-LYRICS-WRITE.md) — v5.12 canonical lyrics contract
- [`docs/STUDIO-PHASE4-OPERATIONS.md`](docs/STUDIO-PHASE4-OPERATIONS.md) — v5.13 final Phase 4 operational contract
- [`docs/PHASE-UX-C2-5-A-ALBUMS-SCALABILITY.md`](docs/PHASE-UX-C2-5-A-ALBUMS-SCALABILITY.md) — Build 68 C2.5-A scalable Albums baseline
- [`docs/PHASE-UX-C2-5-A-ALBUM-FOCUS-ERA-QUEUE.md`](docs/PHASE-UX-C2-5-A-ALBUM-FOCUS-ERA-QUEUE.md) — Build 69 Album Focus + virtual Era queue refinement
- [`docs/PHASE-UX-C2-5-A-MOBILE-ALBUM-FOCUS-HOTFIX.md`](docs/PHASE-UX-C2-5-A-MOBILE-ALBUM-FOCUS-HOTFIX.md) — Build 70 narrow-screen viewport follow-up
- [`docs/PHASE-UX-C2-5-A-ERA-PLAY-MOBILE.md`](docs/PHASE-UX-C2-5-A-ERA-PLAY-MOBILE.md) — Build 71 explicit Era playback + mobile discoverability
- [`RELEASE-CHECKLIST.md`](RELEASE-CHECKLIST.md) — safe release procedure
- [`ROADMAP.md`](ROADMAP.md) — remaining consolidation/product work
- [`cloudflare/README.md`](cloudflare/README.md) — Workers/R2 operations

## Repository rules

1. `main` is the only source of truth.
2. Do not edit production code only in Cloudflare, GitHub Pages, Lovable or generated `dist/` output.
3. Temporary feature/fix branches are disposable; named `safety/*` snapshots are rollback references and must not be developed on.
4. Advance public application versions only in `js/build-config.js`.
5. Update living release documentation for a new public runtime build; preserve historical phase/audit docs as snapshots instead of rewriting their history.
6. Keep Worker deployment, web deployment and R2 catalog rebuild as separate explicit states.
7. Spectrum remains the Audio Lab reference path; every visual effect must consume the real FFT feed rather than independent loop animation.
8. Add Audio Lab presets one at a time, with desktop and mobile budgets defined before merge.
9. Prefer deterministic, signal-derived geometry over random particles when a visual must remain cheap on mobile.
10. Continuous movement and transient impact must stay separate: groove energy owns travel; detected onset creates a post-pose impact with reserved visual headroom.
11. Motion memory/kinetic phase must stop when the real audio target disappears and must never become an autonomous screensaver.
12. New visual families should prefer distinct composition/motion language rather than repeating radial center-object patterns.
13. Historical compatibility files still wired into boot/deployment are removed only through dedicated refactors, not cosmetic cleanup.
14. Studio integration must remain additive and reversible: capabilities are opened one narrowly versioned route at a time, with fallback retained until replacement paths are proven.
15. Phase 6 is complete and checkpointed. Phase 7 must not start without new explicit user authorization.
