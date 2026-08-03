
# LaunchPAD roadmap

_Last updated: 2026-08-03_

## Current production state

- GitHub Pages serves the installable LaunchPAD PWA.
- Cloudflare R2 is the canonical media store.
- The private `launchpad-r2-api` Worker provides the Track Manager behind Cloudflare Access.
- The public `launchpad-media` Worker exposes published metadata and Range-enabled media streams.
- Sixteen tracks are published in the canonical `tracks/<slug>/` layout.
- Each track has a manifest, original cover and audio file; optimized WebP thumbnails are used by catalog cards.
- The public Worker is live on v2.4. Full requests return HTTP 200, Range requests return HTTP 206, and the read-only audit transferred all 16 audio files successfully (87,849,601 bytes) while retaining 16/16 optimized thumbnails.
- GitHub Pages serves the favorites queue, desktop-only admin entry, PR #23 Android/PWA fixes and the unified `Lyrics` timestamp status.
- Track-detail coherence is confirmed for Carved from Pressure and THICK. The physical Android full-catalog acceptance pass is not signed off yet, so historical-media cleanup remains blocked.
- The bundled GitHub catalog and media still exist as a temporary safety fallback until mobile validation is complete.

## Step 7 — stabilization and consolidation

### P0: synchronized-lyrics metadata

- [x] Identify the mismatch between the Lyrics reader and Track detail.
- [x] Make the public Worker accept bracketed LRC timestamps and standalone `mm:ss.xx` timestamp lines.
- [x] Read `timestampsAvailable` from the catalog index for `/tracks` responses.
- [x] Prepare the Track Manager catalog rebuild that derives timestamp flags from every lyrics file.
- [x] Confirm public Worker v2.3 in production.
- [x] Confirm the rebuilt public index reports timestamp metadata for ten tracks.
- [x] Verify the public API flags for THICK, Carved from Pressure and The Throne Resonates.
- [x] Confirm Track Manager v4.5 through the protected live Worker after the manual dashboard deployment.
- [x] Unify Track detail into one authoritative `Lyrics` status and confirm Carved from Pressure and THICK report `Timestamped`.
- [ ] Complete the final Lyrics Studio and full-catalog Android device pass.
- [ ] Complete the first reviewed repository-driven Track Manager deployment.

### P1: repository cleanup

- [ ] Confirm final mobile playback, Media Session icon, thumbnails and synchronized lyrics.
- [x] Add a read-only R2 audit and exact legacy deletion inventory.
- [x] Add an opt-in full-audio transfer pass that compares every downloaded byte count with the Range total.
- [x] Deploy public Worker v2.4 and complete the 16/16 full-audio transfer pass (87,849,601 bytes).
- [ ] Remove legacy MP3 files from the GitHub repository.
- [ ] Remove duplicated per-track covers and lyrics retained only as fallbacks.
- [ ] Remove `fallbackFile` and the bundled-audio recovery layer.
- [ ] Replace the hard-coded track catalog with a minimal offline snapshot or generated catalog fixture.
- [ ] Update service-worker precache lists after media removal.
- [ ] Verify repository size and GitHub Pages deployment after cleanup.

### P1: Worker source control and CI/CD

- [x] Version the public media Worker in `cloudflare/public-worker.js`.
- [x] Version the private Track Manager Worker as ordered source parts in `cloudflare/admin-worker.parts/`.
- [x] Add a reproducible build and syntax-check script for the dashboard-compatible private Worker bundle.
- [x] Add Worker syntax and catalog-index checks to the existing CI validation command.
- [x] Pin Wrangler and add configuration for both Workers.
- [x] Dry-run the exact public and private bundles in CI.
- [x] Add a protected, manual production deployment workflow from `main`.
- [ ] Configure the `cloudflare-production` secrets and complete the first reviewed workflow deployment.

### P2: desktop Track Manager access

- [x] Add an opt-in desktop-only Track Manager entry inside LaunchPAD.
- [x] Keep the entry hidden for normal public visitors.
- [x] Persist admin mode locally after opening LaunchPAD with `?admin=1` (`?admin=0` clears it).
- [x] Open the protected Cloudflare Access URL in a separate tab.

### P2: favorites playback

- [x] Add **Play favorites** to the Favorites view.
- [x] Build a queue containing only favorite track IDs.
- [x] Continue automatically through that queue when a track ends.
- [x] Preserve Shuffle and Repeat behavior inside the favorite queue.
- [x] Add regression tests for queue order and track removal while playing.

### P2: documentation

- [x] Rewrite `README.md` around the R2-first architecture.
- [x] Update `ARCHITECTURE.md` with both Workers, R2, catalog indexing and thumbnails.
- [x] Rewrite `guide.md` around the Track Manager rather than manual catalog edits.
- [x] Update `RELEASE-CHECKLIST.md` for Cloudflare publication and PWA cache refreshes.
- [x] Update the Cloudflare operating documentation.
- [x] Keep this roadmap synchronized with completed preparation work.
- [x] Record the manually deployed Track Manager v4.5 and unified production lyrics status.

## Definition of migration complete

The Cloudflare migration is finished when:

1. all sixteen tracks play exclusively from R2;
2. all catalog cards use optimized R2 thumbnails;
3. Lyrics Studio and Track detail agree on timestamp availability;
4. Android playback starts on the first tap and exposes the expected PWA media identity;
5. legacy GitHub media and fallback code are removed;
6. both Workers are versioned and have completed a reviewed repository-driven deployment;
7. CI validates the PWA and Worker sources;
8. user and developer documentation describes the production architecture accurately.

