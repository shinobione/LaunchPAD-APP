# SHINOBIWAN LaunchPAD

> Current accepted application build: `2026.08.10.87` — release `phase-ux-c2-5-a-global-touch-polish-20260810`.  
> Current development candidate: `2026.08.10.88` — `PHASE UX C2.5-B · Canonical Album Read Model`.

Installable music PWA for the SHINOBIWAN catalog: playback, albums, synchronized lyrics, Audio Lab visuals, favorites, queues, Track DNA, Canvas/Studio experiences and shareable track cards.

## PHASE UX C2.5-A — Albums scalability frontend

Build 68 established the scalable Albums baseline: tracklists are collapsed by default, each populated card exposes `Show N tracks` / `Hide tracks`, opening one list closes the previously expanded one, and the toggle keeps native keyboard behavior with `aria-expanded` + `aria-controls`. Real-user visual review confirmed that this presentation is substantially cleaner than the previous always-expanded page.

Build 69 refines that accepted direction without changing the Album data model. `Show N tracks` now promotes the selected Album into an animated **Album Focus** layout: on wide desktop the active project occupies the dominant panel while sibling Albums move into a compact, still-clickable dock; narrower layouts keep the active Album first without forcing a fragile side rail. View Transitions are progressive-only and reduced-motion aware.

Discography Era selection creates a virtual playback context. Once a track from that Era is played, the existing queue engine resolves the Era tracks as a reconstructible `era:` collection, labels the player context `Era queue`, and keeps Next / Previous inside that Era just like Album playback.

Build 70 is the narrow-screen Album Focus follow-up found during real-user mobile smoke. When a lower Album is expanded on mobile/tablet, the runtime waits for the reorder/View Transition to finish and then follows the selected Album to its new position, accounting for the sticky topbar. Desktop Album Focus is unchanged; closing an Album does not force a scroll; reduced-motion preference remains respected.

Build 71 introduced explicit Era playback, but real-user smoke showed that its header placement and mobile affordance remained too subtle. The queue behavior itself was valid; the presentation was not yet sufficiently discoverable.

Build 72 moves `Play Era · N tracks` into a dedicated **Selected Era** strip directly below the carousel, reduces mobile card width so continuation is visible, adds real Previous / Next controls plus a `Swipe or use arrows to explore eras` instruction, makes the active Era visually unmistakable with a `SELECTED` badge, and recenters only after the real catalog-filter event has settled. The same reconstructible `era:` queue remains unchanged.

Build 72 also promoted the supplied SHINOBIWAN artwork already stored in the repo: the compact sidebar wordmark became slightly larger and gold, `assets/Lune-ShinoBiWan.png` replaced the generated About wordmark, and an experimental wide-desktop Home Ninja treatment was introduced.

Build 73 removed that Ninja and introduced the Android audio-clock heartbeat. Its first explicit video recovery pass also disabled native loop and attempted to recover `waiting` / `stalled` states. Real-user smoke then proved that the pre-boundary recovery itself could interrupt the video roughly 0.14 seconds before its natural end and that automatic `video.load()` retries could create protected-media request churn severe enough to interfere with later audio seeks.

Build 74 keeps the successful Build 73 audio-clock heartbeat but isolates Track Video recovery completely from the canonical audio path. Track Video recovery no longer calls `video.load()`, no longer seeks before the real media boundary, and no longer reacts directly to `waiting`, `stalled` or `suspend`. A normal `ended` event owns that separate Track Video loop restart; a bounded watchdog may reset only a confirmed terminal stall within the final 0.75 seconds after the video has genuinely stopped progressing.

Build 75 corrected the remaining cross-owner Lyrics Studio collision found during real-user Android smoke. Feature 11 now stabilizes only `video.track-video-player`, leaving Lyrics Studio as the sole owner of its Canvas lifecycle. The real-user Build 75 smoke nevertheless proved that ownership isolation alone was insufficient: the Canvas could still enter a spinner, expose its cover/poster and leave later canonical-audio seeks waiting.

Build 76 isolated the Canvas **transport**: Lyrics Studio fetches the short video once through CORS, materializes it as a browser Blob and plays a local `blob:` source. Real-user Android smoke confirmed that this reduced post-seek failure severity, but did not close the issue: Canvas could still stall into its poster, audio could still take roughly 15 seconds to resume after a seek, and Lyrics auto-scroll could slowly chase the new position instead of snapping cleanly.

Build 77 attacks those three mechanisms directly. The mobile seek range now previews position/lyrics while the finger moves but performs **one real media seek only when the gesture commits**, preventing a stream of `currentTime` changes and Range reposition requests. Lyrics synchronization pauses its scroll clock during a seek and recenters exactly once after settlement. Canvas keeps the local Blob transport but drops Android native loop; it uses a manual local-only loop, bounded decoder recovery and an audio-first circuit breaker. During a seek the decorative Canvas remains paused through `seeked` and only resumes after the canonical audio emits a real `playing` event.

Real-user Build 77 smoke proved that the Android/MIUI secondary video decoder could still fail specifically inside mobile Lyrics Studio: the Canvas could go black, expose the poster/cover and leave the canonical audio/Media Session controls in a degraded state. Build 78 therefore stops treating the decorative MP4 as critical on this exact device/mode path. **Android + <=760 px + Lyrics Studio** uses a decoder-safe animated artwork surface (`MOBILE SAFE VISUAL`) and keeps the original real Canvas video disabled. Desktop, non-Android and non-Studio video behavior remain unchanged. The same Android Studio guard also gives timestamped lyric-line taps a capture-phase single-seek contract and deterministic post-seek recentering.

The first real-user Build 78 smoke exposed a critical integration regression: entering Lyrics Studio on Android could crash the application. Build 79 fixed that recursion/crash, but subsequent real-device passes showed that the safe-visual approach itself was too invasive for the established Studio/player ownership model.

Builds 80–84 progressively removed those invasive guards and isolated the remaining routing/ownership issues instead of adding more media recovery. Build 83 restored the simple single-owner Lyrics Studio Canvas model and separated mini-player Favorite/Queue actions from Studio routing; Build 84 isolated `Show Track` from Canvas playback commands and scroll recentering. Builds 85–86 then locked the final passive Studio loop parity and mobile player action polish without taking ownership of canonical audio/video lifecycle. Build 87 added only the global Android/Chromium touch-highlight cleanup while preserving those validated media contracts.

**Build 87 passed real-user Android/PWA smoke on 2026-08-10.** The touch-selection rectangles are removed across LaunchPAD and the inherited Show Track / Collapsed / Track Video / Favorites / Queue / seek behavior remained functional. C2.5-A is therefore REAL-USER VALIDATED. The brief black paint frame noted at one native Canvas loop boundary remains a cosmetic note only and did not block acceptance.

See the C2.5-A release documents through [`docs/PHASE-UX-C2-5-A-BUILD87-GLOBAL-TOUCH-POLISH.md`](docs/PHASE-UX-C2-5-A-BUILD87-GLOBAL-TOUCH-POLISH.md) and the explicit smoke record [`docs/PHASE-UX-C2-5-A-BUILD87-REAL-USER-SMOKE-PASS.md`](docs/PHASE-UX-C2-5-A-BUILD87-REAL-USER-SMOKE-PASS.md).

## PHASE UX C2.5-B — Canonical Album Read Model

Build 88 is the current development candidate. It starts from the accepted Build 87 line and establishes the **read/projection layer only** for first-class Albums:

```text
albums/<album-id>/manifest.json
albums/<album-id>/cover/<filename>
albums/<album-id>/thumbnail/thumbnail.webp
```

When a canonical Album exists, ordered `album.trackIds` is the intended membership/order authority. Existing track `album.id/title` remains compatibility cache during migration, and current hardcoded Albums remain fallback until each project is migrated. `catalog/index.json` remains a rebuildable `schemaVersion: 1` projection.

Build 88 introduces no Album create/edit/delete/reorder route, no production R2 Album object, no Album artwork migration, no Singles conversion and no public `/albums` Worker cutover. See [`docs/PHASE-UX-C2-5-B-BUILD88-CANONICAL-ALBUM-READ-MODEL.md`](docs/PHASE-UX-C2-5-B-BUILD88-CANONICAL-ALBUM-READ-MODEL.md).

The final PHASE UX checkpoint remains **NOT CREATED**. C2.5-C/D/E/F remain not started, C3 SonicTrace Deep Audio work remains suspended during C2.5, and Phase 7 remains **NOT STARTED**.

## Production PHASE UX C2 backend

Track Manager `v5.16` / Studio bridge `v1.8` is the deployed private backend. It was deployed from `1bbe0293e4e17968bb7e191f58e7ae1cdd95dadf` by admin-only workflow `31324447727`; the recorded Worker Version ID is `5a83c6dd-cfb4-4be6-ab8d-16b5c34bdc2b` and Cloudflare Access remains protected.

The C2 integration accepts request-scoped observed canonical-audio duration evidence from LRC Maker `6.3.6` on the existing Lyrics validation/save routes. Real-user production smoke passed canonical playback, timestamp navigation, synchronized `lyrics.txt` save and canonical reread; the false end-of-audio blocker is gone. `lyrics.txt` remains the only canonical lyrics source and `.lrc` remains optional export/compatibility only.

The C2 deployment skipped every public Worker step, did not change LaunchPAD's then-current public Build 67 runtime, and did not perform an automated production R2 test mutation. The public media Worker remains `v2.6`.

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

## Build 79 highlights

Build 79 is the emergency Android Lyrics Studio crash hotfix discovered by the first real-user Build 78 smoke. Build 78's safe control replacement retained the original `data-lyrics-studio="canvas"` marker, while the global mutation observer continued selecting that same marker. The replacement could therefore be mistaken for a fresh original control, cloned again and replaced repeatedly until the mobile application became unresponsive or crashed.

Build 79 makes that replacement idempotent. The original selector excludes the safe control, the replacement is marked before insertion, existing safe controls are reused, mutation-triggered activation is deduplicated and activation has a re-entry guard. The Build 78 decoder-safe artwork fallback and timestamp-line seek behavior remain otherwise unchanged.

Build 79 changes no Worker, R2 object, canonical Album schema, track manifest, catalog projection, SonicTrace runtime, C3 backend or Phase 7 implementation.

## Build 78 highlights

Build 78 is the Android mobile Lyrics Studio fail-closed correction after real-user Build 77 smoke showed that a secondary MP4 decoder could still black out, fall back to its poster and leave canonical audio/Android Media Session controls degraded. On Android screens up to 760 px, **only inside Lyrics Studio**, the real Studio Canvas video is disabled and replaced with a lightweight animated current-artwork surface. The fallback creates no secondary `<video>` element and never reads the track video URL.

Timestamped lyric-line taps in this mode are intercepted in capture phase so exactly one canonical seek is issued. The active line is updated by the existing lyrics engine through `shinobi:seek-commit`, then the reader performs a deterministic immediate recenter after `seeked`/`playing`. The main Build 77 single-commit slider remains unchanged.

Desktop/non-Android real Canvas video, ordinary Track Video, Media Session metadata, Audio Lab, Album/Era behavior and canonical `lyrics.txt` remain unchanged. Build 78 changes no Worker, R2 object, canonical Album schema, track manifest, catalog projection, SonicTrace runtime, C3 backend or Phase 7 implementation.

## Build 77 highlights

Build 77 follows the failed real-user Android smoke of Build 76. The Blob transport reduced the severity of post-seek failure, but the test still showed three concrete defects: dragging the main seek range issued continuous real `audio.currentTime` changes, Lyrics auto-scroll kept updating while media position was unsettled, and the Android decoder could still fail the Canvas native Blob loop.

The seek range now has a capture-phase single-commit contract. `input` events preview time/progress and update lyric selection without changing the media position; `pointerup`/`change` commits one canonical seek. Lyrics synchronization stops its animation clock while seeking, avoids scroll during preview, waits for media settlement and then recenters the active line once with an immediate bounded reader scroll.

Canvas remains on the Build 76 local Blob transport but uses a manual local-only `ended → 0 → play` loop instead of native loop. `waiting`, `stalled` and `error` can trigger at most two local decoder recoveries; if the decoder remains unhealthy, Canvas degrades to `CANVAS PAUSED` rather than continuing to churn. During audio seeking Canvas stays paused through `seeked` and only resumes after the real canonical audio `playing` event.

Build 77 changes no Worker, R2 object, canonical Album schema, track manifest, catalog projection, SonicTrace runtime, canonical Lyrics contract or Phase 7 scope.

## Build 76 highlights

Build 76 is the Android Lyrics Studio **transport isolation** correction discovered by real-user smoke of Build 75. The screenshot sequence proved that the Canvas could play initially, enter a spinner state, expose its own cover/poster and then leave a later canonical-audio seek stuck waiting. Build 75 had fixed ownership, but not the shared remote media transport.

Lyrics Studio performs one CORS GET of the short Canvas video, converts it to a browser Blob and attaches a local `blob:` object URL to the video element. Real-user smoke later proved that native Blob looping could still fail on Android, so Build 77 supersedes only the loop/seek policy while preserving the local transport itself.

Build 76 changed no Worker, R2 object, canonical Album schema, track manifest, catalog projection, SonicTrace runtime, canonical Lyrics contract or Phase 7 scope.

## Build 75 highlights

Build 75 is the Android Lyrics Studio ownership correction discovered by real-user smoke of Build 74. The track cover appearing inside the Canvas frame is the Canvas video's own poster, not a different component. That symptom proved the Lyrics Studio media element had stopped at the loop boundary.

The root cause found at that step was overlapping ownership: Feature 11 still selected `video.lyrics-studio-canvas-video` and applied its own loop/reset/play recovery even though `lyrics-studio.js` already owned the Canvas. Build 75 narrowed Feature 11 to `video.track-video-player` only. Real-user smoke later showed that this ownership fix alone did not eliminate the shared transport failure; Build 76 superseded it with local-Blob Canvas transport isolation.

Build 75 kept Build 74 Track Video terminal-only recovery and the Build 73 audio-clock heartbeat. It changed no Worker, R2 object, canonical Album schema, track manifest, catalog projection, SonicTrace runtime, canonical Lyrics contract or Phase 7 scope.

## Build 74 highlights

Build 74 is the second Android/mobile video-loop correction, based directly on real-user smoke of Build 73. The root cause was in the stabilization layer itself: a `timeupdate` branch restarted the video around 0.14 seconds before its natural end, and `waiting` / `stalled` recovery could call `video.load()`. On protected media, repeated reloads could create enough request churn that subsequent audio seeks also waited indefinitely.

The recovery layer is now deliberately weaker and safer. It never calls `video.load()`, never seeks before the real boundary, and does not respond directly to `waiting`, `stalled` or `suspend`. The ordinary `ended` event resets the separate Track Video surface. If Android stalls immediately before `ended`, the watchdog waits for confirmed lack of progress and only then permits a terminal reset when the Track Video is within the final 0.75 seconds. The canonical audio element is not modified by any Track Video recovery operation.

Build 74 retains the Build 73 audio-clock heartbeat and Ninja removal. It changes no Worker, R2 object, canonical Album schema, track manifest, catalog projection, SonicTrace runtime or Phase 7 scope.

## Build 73 highlights

Build 73 is the Android/mobile media correction discovered during real-user Lyrics Studio smoke. The Home Ninja pseudo-column is removed completely after it obscured the established Home hero; `NinJa-ShinoBiWan.png` remains only as an unused repository asset. The larger gold sidebar wordmark and About Moon art remain untouched.

The main audio element remains the playback source of truth. Feature 11 adds a requestAnimationFrame heartbeat while audio is playing so the already-established `timeupdate` renderer continues updating seek bars, current time, synchronized lyrics and Media Session position even when Android Chromium throttles native media events. The heartbeat does not advance or synthesize audio time; it only rereads the real `audio.currentTime` through the existing listener.

The first Build 73 video-loop strategy is superseded by Builds 74-77 after real-user smoke showed that pre-boundary restart/reload recovery, cross-ownership, shared remote Canvas transport, continuous drag-seeking and Android native Blob looping could destabilize mobile playback. The Build 73 audio-clock heartbeat and brand-art correction remain valid.

Build 73 changed no Worker, R2 object, canonical Album schema, track manifest, catalog projection, SonicTrace runtime or Phase 7 scope.

## Build 72 highlights

Build 72 is the real-user correction to the Build 71 Era presentation. The selected Era now owns a dedicated action strip with a prominent `Play Era · N tracks` control below the carousel instead of a small action in the header. The virtual `era:` queue itself is unchanged.

On mobile, the carousel now shows narrower cards, explicit Previous / Next controls, visible continuation, a strong `SELECTED` state and an instruction that mentions both swipe and arrows. Active-card centering is driven after `shinobi:catalog-filtered` settles and uses the carousel's own horizontal scroll, so it no longer depends on a premature `scrollIntoView()` call.

The sidebar SHINOBIWAN identity is slightly larger and uses the established gold gradient treatment. The About card uses the supplied `Lune-ShinoBiWan.png`. The experimental Home Ninja placement introduced in this build is superseded and removed by Build 73 after real-user review.

Build 72 changes no Worker, R2 object, canonical Album schema, track manifest, catalog projection, SonicTrace runtime or Phase 7 scope.

## Build 71 highlights

Build 71 added a dedicated `Play Era · N` action whenever exactly one Discography Era was selected. The queue implementation remains the ancestry for Build 72, but real-user smoke showed that the header placement and mobile affordance were too subtle, so those presentation details are superseded by Build 72.

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

Reserved first-class Album paths introduced by C2.5-B are:

```text
albums/<album-id>/manifest.json
albums/<album-id>/cover/<filename>
albums/<album-id>/thumbnail/thumbnail.webp
```

No production Album object is created merely by merging the C2.5-B read model.

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

C2.5-B additionally guards canonical Album schema/read/projection semantics while explicitly forbidding Album write/delete routes and public canonical Album cutover.

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
- [`docs/PHASE-UX-C2-5-A-ERA-PLAY-MOBILE.md`](docs/PHASE-UX-C2-5-A-ERA-PLAY-MOBILE.md) — Build 71 explicit Era playback + initial mobile discoverability pass
- [`docs/PHASE-UX-C2-5-A-BUILD72-ERA-BRAND-ART.md`](docs/PHASE-UX-C2-5-A-BUILD72-ERA-BRAND-ART.md) — Build 72 real-user Era affordance correction + supplied brand artwork
- [`docs/PHASE-UX-C2-5-A-BUILD73-MOBILE-MEDIA-STABILITY.md`](docs/PHASE-UX-C2-5-A-BUILD73-MOBILE-MEDIA-STABILITY.md) — Build 73 Android/mobile audio-clock and first video-loop stability pass
- [`docs/PHASE-UX-C2-5-A-BUILD74-VIDEO-LOOP-ISOLATION.md`](docs/PHASE-UX-C2-5-A-BUILD74-VIDEO-LOOP-ISOLATION.md) — Build 74 terminal-only Track Video recovery and protected-audio isolation
- [`docs/PHASE-UX-C2-5-A-BUILD75-CANVAS-SINGLE-OWNER.md`](docs/PHASE-UX-C2-5-A-BUILD75-CANVAS-SINGLE-OWNER.md) — Build 75 Lyrics Studio Canvas ownership isolation
- [`docs/PHASE-UX-C2-5-A-BUILD76-CANVAS-TRANSPORT-ISOLATION.md`](docs/PHASE-UX-C2-5-A-BUILD76-CANVAS-TRANSPORT-ISOLATION.md) — Build 76 local-Blob Canvas transport isolation and audio-seek priority
- [`docs/PHASE-UX-C2-5-A-BUILD77-MOBILE-SEEK-CANVAS.md`](docs/PHASE-UX-C2-5-A-BUILD77-MOBILE-SEEK-CANVAS.md) — Build 77 single-commit seek, settled Lyrics auto-scroll and audio-first local Canvas recovery
- [`docs/PHASE-UX-C2-5-A-BUILD78-ANDROID-STUDIO-SAFE.md`](docs/PHASE-UX-C2-5-A-BUILD78-ANDROID-STUDIO-SAFE.md) — Build 78 Android Studio decoder-safe visual fallback + timestamp-line seek guard
- [`docs/PHASE-UX-C2-5-A-BUILD79-ANDROID-STUDIO-RECURSION.md`](docs/PHASE-UX-C2-5-A-BUILD79-ANDROID-STUDIO-RECURSION.md) — Build 79 Android Studio safe-control recursion/crash hotfix
- [`docs/PHASE-UX-C2-5-A-BUILD80-ANDROID-STUDIO-PASSIVE-GUARD.md`](docs/PHASE-UX-C2-5-A-BUILD80-ANDROID-STUDIO-PASSIVE-GUARD.md) — Build 80 passive Android Studio guard
- [`docs/PHASE-UX-C2-5-A-BUILD81-ANDROID-STUDIO-MEDIA-TEARDOWN.md`](docs/PHASE-UX-C2-5-A-BUILD81-ANDROID-STUDIO-MEDIA-TEARDOWN.md) — Build 81 media teardown / queue / favorites follow-up
- [`docs/PHASE-UX-C2-5-A-BUILD82-MINI-PLAYER-ACTION-ROUTING.md`](docs/PHASE-UX-C2-5-A-BUILD82-MINI-PLAYER-ACTION-ROUTING.md) — Build 82 mini-player action routing pass
- [`docs/PHASE-UX-C2-5-A-BUILD83-SURGICAL-ROLLBACK.md`](docs/PHASE-UX-C2-5-A-BUILD83-SURGICAL-ROLLBACK.md) — Build 83 surgical rollback to a single-owner Studio Canvas
- [`docs/PHASE-UX-C2-5-A-BUILD84-SHOW-TRACK-ISOLATION.md`](docs/PHASE-UX-C2-5-A-BUILD84-SHOW-TRACK-ISOLATION.md) — Build 84 Show Track isolation
- [`docs/PHASE-UX-C2-5-A-BUILD85-STUDIO-LOOP-PARITY.md`](docs/PHASE-UX-C2-5-A-BUILD85-STUDIO-LOOP-PARITY.md) — Build 85 passive Studio loop parity
- [`docs/PHASE-UX-C2-5-A-BUILD86-MOBILE-PLAYER-UI-POLISH.md`](docs/PHASE-UX-C2-5-A-BUILD86-MOBILE-PLAYER-UI-POLISH.md) — Build 86 mobile player UI/action polish
- [`docs/PHASE-UX-C2-5-A-BUILD87-GLOBAL-TOUCH-POLISH.md`](docs/PHASE-UX-C2-5-A-BUILD87-GLOBAL-TOUCH-POLISH.md) — Build 87 global touch polish, real-user validated
- [`docs/PHASE-UX-C2-5-A-BUILD87-REAL-USER-SMOKE-PASS.md`](docs/PHASE-UX-C2-5-A-BUILD87-REAL-USER-SMOKE-PASS.md) — explicit Build 87 smoke closeout
- [`docs/PHASE-UX-C2-5-B-BUILD88-CANONICAL-ALBUM-READ-MODEL.md`](docs/PHASE-UX-C2-5-B-BUILD88-CANONICAL-ALBUM-READ-MODEL.md) — Build 88 C2.5-B candidate contract
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
15. Phase 6 is complete and checkpointed. Any work beyond the PHASE UX closeout must remain separately versioned, reversible and explicitly authorized.
