
# Changelog

## Unreleased

- Fix legacy Track Manager edits so remote genres, tags, mood, colours and duration override bundled fallback metadata.
- Accept `mm:ss` duration input while storing canonical seconds.
- Refresh the Track Manager interface, grouping, accessibility and distinctive LP favicon; source version is 4.5.
- Add a hidden desktop-only `?admin=1` entry that opens Cloudflare Access in a new tab.
- Add a favorites-only playback queue with **Play favorites**, continuous playback, Shuffle, Repeat and removal handling.
- Preserve first-tap play intent, provide explicit Android Media Session artwork and align Track detail with remote timestamp metadata.
- Replace the duplicate lyrics fields with one live-verified `Lyrics` status and refresh the installed PWA cache.
- Verify the live public Worker v2.3, 16 canonical R2 streams, optimized thumbnails and corrected Before the Noise metadata.
- Deploy public Worker v2.4 so full media requests return HTTP 200, and verify 87,849,601 bytes across all 16 audio transfers.
- Add a read-only cleanup audit while keeping all historical media locked behind explicit mobile approval.
- Pin Wrangler 4.118.0, dry-run both Worker bundles in CI and add a protected manual production deployment workflow.
- Stabilize layout regression fixtures with ordered loading, bounded readiness waits and post-ready geometry baselines.
- Add dedicated track pages with complete tags, catalog metadata and shareable `#track=` routes.
- Make every track cover navigate to its detail page without starting playback.
- Add visual-regression protection for key desktop and mobile views.
- Centralize build and PWA cache versioning.
- Make the Albums editorial order data-driven.
- Consolidate player feature CSS and remove unused legacy files.
- Add SEO, social previews, accessibility and audio-failure recovery.

## 2026-08-02

- Add Track DNA, enriched catalog metadata and a stable Lyrics Studio.
- Add album durations and complete the legacy module migration.
- Add Visual Card, installable PWA support, Favorites and listening history.
- Add queue, Shuffle, Repeat, album playback, Media Session and deep links.

