# Changelog

## Unreleased

- Add **Feature 09 — Editorial catalog filters** with combinable R2-powered Era, Energy, Mood, Genre, Language, release type, Canvas, Lyrics, synchronized Lyrics, Explicit/Clean and Year filters, responsive mobile drawer, active chips, result counts, reset action and shareable URL state.
- Fix Track Manager v4.9 Lyrics badges by carrying the authoritative R2 quality result into every catalogue card, correctly distinguishing absent, invalid, unsynced and timestamped Lyrics.
- Upgrade Track Manager to v4.8 with explicit Lyrics badges on every track card: red when lyrics are absent or invalid, yellow when lyrics are present without timestamps, and green when timestamped lyrics are available.
- Fix Track Manager v4.7 quality checks for cover-only edits by safely ignoring generated assets without file inputs, while keeping R2 thumbnail inspection and publication controls intact.
- Fix Track Manager v4.7 quality checks so selected audio and Lyrics are never reported as absent during metadata edits, manual control and publication share one non-stalling media analysis, and `ALBUM:` TXT metadata automatically creates an album-track with a normalized album ID.
- Upgrade Track Manager to v4.7 with grouped file/folder imports, automatic audio/cover/Lyrics/Canvas association, TXT metadata previews, thumbnail generation, editable mappings, explicit existing-track completion and best-effort rollback for newly created tracks.
- Upgrade Track Manager to v4.6 with authoritative R2 quality reports, browser-side media measurements, optional Lyrics/Canvas status, duplicate and orphan detection, draft-safe saving and explicit publication blocking for broken tracks.
- Mark tracks with video using responsive **CANVAS** badges, lazy single-preview animation, mobile preview controls, quick Studio access, fixed-cover fallbacks and reduced-motion/data-saving safeguards across Home, Discography and Favorites cards.
- Add smart Canvas lifecycle management: pause silent loops when hidden or offscreen, resume them when useful, respect reduced-motion/data-saving signals, enforce one active Canvas and release video resources on route or track changes without touching audio playback.
- Add an audio-safe PWA update prompt with **Mettre à jour / Plus tard**, one-time reload protection, session dismissal and visible build metadata in About.
- Add shareable `#studio=track-slug` routes that reopen Lyrics Studio directly, preserve browser history and no longer depend on temporary storage handoffs.
- Align Lyrics controls into one responsive state-driven group, remove sticky mobile hover states, keep lyric auto-scroll inside its reader and add direct **Studio** entry from Track detail pages.
- Integrate each 9:16 Canvas directly into the Track detail hero and the existing Lyrics Studio track panel, removing the oversized standalone video section and keeping responsive mobile sizing bounded.
- Present uploaded 9:16 MP4/WebM assets as compact, silent looping Spotify Canvases on Track detail pages and inside responsive Lyrics Studio without interrupting music playback.
- Display uploaded MP4/WebM track videos on demand from Track detail pages and keep the played-track summary growing beyond the twelve-item recent-history window.
- Autofill Track Manager metadata from structured Lyrics TXT headers while preserving the original timestamped lyrics file and existing form values.
- Improve Track Manager thumbnail generation with 1024 px supersampling, high-quality 512 px output, adaptive WebP compression, preserved framing for non-square artwork and an explicit full-catalog regeneration option.
- Harden repository-driven Cloudflare deployments with explicit production confirmation, structured Wrangler version tracing, post-deployment smoke tests and a protected rollback workflow.
- Make the production catalog R2-only, replace fourteen duplicated track definitions with a four-track localhost/CI fixture and remove `catalog-metadata.js` from the PWA precache.
- Remove the ten bundled lyric fallbacks after validating their public R2 endpoints.
- Fix legacy Track Manager edits so remote genres, tags, mood, colours and duration override bundled fallback metadata.
- Accept `mm:ss` duration input while storing canonical seconds.
- Refresh the Track Manager interface, grouping, accessibility and distinctive LP favicon; source version is 4.7.
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