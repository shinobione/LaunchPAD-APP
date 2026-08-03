# LaunchPAD roadmap

_Last updated: 2026-08-03_

## Current production state

- GitHub Pages serves the installable LaunchPAD PWA.
- Cloudflare R2 is the canonical media store.
- The private `launchpad-r2-api` Worker provides the Track Manager behind Cloudflare Access.
- The public `launchpad-media` Worker exposes published metadata and Range-enabled media streams.
- Sixteen tracks are published in the canonical `tracks/<slug>/` layout.
- Each track has a manifest, original cover and audio file; optimized WebP thumbnails are used by catalog cards.
- The bundled GitHub catalog and media still exist as a temporary safety fallback until mobile validation is complete.

## Step 7 — stabilization and consolidation

### P0: synchronized-lyrics metadata

- [x] Identify the mismatch between the Lyrics reader and Track detail.
- [x] Make the public Worker accept bracketed LRC timestamps and standalone `mm:ss.xx` timestamp lines.
- [x] Read `timestampsAvailable` from the catalog index for `/tracks` responses.
- [x] Prepare the Track Manager catalog rebuild that derives timestamp flags from every lyrics file.
- [ ] Deploy the private and public Worker versions containing the fix.
- [ ] Rebuild `catalog/index.json` once in production.
- [ ] Verify THICK, Carved from Pressure and The Throne Resonates in Track detail and Lyrics Studio.

### P1: repository cleanup

- [ ] Confirm final mobile playback, Media Session icon, thumbnails and synchronized lyrics.
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
- [ ] Add Wrangler configuration for both Workers.
- [ ] Replace manual dashboard copy/paste deployments with reviewed deployments from GitHub.

### P2: desktop Track Manager access

- [ ] Add an opt-in desktop-only Track Manager entry inside LaunchPAD.
- [ ] Keep the entry hidden for normal public visitors.
- [ ] Persist admin mode locally after opening LaunchPAD with `?admin=1`.
- [ ] Open the protected Cloudflare Access URL in a separate tab.

### P2: favorites playback

- [ ] Add **Play favorites** to the Favorites view.
- [ ] Build a queue containing only favorite track IDs.
- [ ] Continue automatically through that queue when a track ends.
- [ ] Preserve Shuffle and Repeat behavior inside the favorite queue.
- [ ] Add browser tests for queue order and track removal while playing.

### P2: documentation

- [x] Rewrite `README.md` around the R2-first architecture.
- [x] Update `ARCHITECTURE.md` with both Workers, R2, catalog indexing and thumbnails.
- [x] Rewrite `guide.md` around the Track Manager rather than manual catalog edits.
- [x] Update `RELEASE-CHECKLIST.md` for Cloudflare publication and PWA cache refreshes.
- [x] Update the Cloudflare operating documentation.
- [x] Keep this roadmap synchronized with completed preparation work.

## Definition of migration complete

The Cloudflare migration is finished when:

1. all sixteen tracks play exclusively from R2;
2. all catalog cards use optimized R2 thumbnails;
3. Lyrics Studio and Track detail agree on timestamp availability;
4. Android playback starts on the first tap and exposes the expected PWA media identity;
5. legacy GitHub media and fallback code are removed;
6. both Workers are versioned and deployable from the repository;
7. CI validates the PWA and Worker sources;
8. user and developer documentation describes the production architecture accurately.
