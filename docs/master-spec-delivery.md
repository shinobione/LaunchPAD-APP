# LaunchPAD master specification — final delivery

This document maps the nine requested sections to their production implementation and release gates.

## 1. Routing, navigation and legal protection

- Root/browser/PWA view launches normalize to Home while shareable Track, Album, Lyrics and Studio deep links remain intact.
- Route transitions use only opacity/transform and respect reduced motion.
- The dynamic ShinoBiWan proprietary notice is rendered inside the About build/release panel.

Primary files: `js/features/feature-11.js`, `css/feature-11.css`, `js/features/about/about-controller.js`, `css/about-enhancements.css`.

## 2. Data architecture and catalog ordering

- Legacy and R2 tracks pass through one normalized schema.
- Global ordering uses release date, then created/updated/import order fallbacks.
- Latest Releases excludes future, draft, archived and inactive tracks.
- Recently Added remains independently sorted by technical import date.

Primary files: `js/core/catalog-schema.js`, `js/core/catalog-ordering.js`, `js/core/catalog-store.js`, `js/core/remote-catalog.js`.

## 3. Track Manager controls

- Catalog filters react immediately without losing selected state.
- Palette extraction is an explicit manual editor action.
- Automatic cover changes no longer overwrite a curated palette.
- Track Manager version: **5.7**.

Primary files: `cloudflare/admin-worker.parts/20-m3-track-manager-controls.inject.part`, `cloudflare/admin-worker.parts/21-m8-svg-badges.inject.part`, `scripts/build-admin-worker.mjs`.

## 4. Page/player theme scoping

- Track Detail applies the viewed release palette to the page.
- The global player independently keeps the palette of the actually playing track.

Primary files: `js/features/theme-scope.js`, `css/theme-scope.css`.

## 5. Discography, Eras and track cards

- Filter order: Genre, Language, Content, Energy, Era, secondary filters, Mood.
- Era timeline is generated from R2 metadata and writes shareable URL state.
- Moods/Themes live inside cards.
- Current cards show animated themed borders, Pause/equalizer state and a network loader.

Primary files: `js/features/discography-experience.js`, `css/discography-experience.css`.

## 6. Home editorial and visual switcher

- The latest official release receives the editorial spotlight and direct Play, Track, Lyrics and Studio actions.
- Mobile header places the golden wordmark before the LaunchPAD build frame.
- Neon Shatter is the Home default.
- Desktop arrows and mobile horizontal swipe switch sanctioned visualizers.

Primary files: `js/features/home-editorial.js`, `css/home-editorial.css`, `js/features/visual/visual-engine-live.js`.

## 7. Audio Lab purge, calibration and sanctuary

Sanctioned registry:

- Neon Shatter
- Spectrum
- Liquid Chrome
- Aurora Glass
- Nebula
- Singularity

Spectrum and Liquid Chrome are protected by renderer SHA-256 regression hashes. Aurora remains bound to FFT/kick/RMS/peak/dynamics. Studio media uses `Video` / `Player`, removes residual badges and hardens mobile looping.

Primary files: `js/features/visual/audio-lab-registry.js`, `js/features/visual/audio-lab-sanctuary.js`, `js/features/visual/audio-reactivity.js`, `js/features/visual/visual-engine-core-modes.js`, `js/features/visual/visual-engine-v2.js`, `js/features/visual/visual-engine-live.js`.

## 8. SVG icons and badge hierarchy

- Inline currentColor SVG system with a homogeneous stroke.
- Minimum targets: 40 px desktop, 44 px mobile.
- Level 1 statuses, one Level 2 parent genre, up to three Level 3 tags plus `+X`.
- DRAFT remains private to Track Manager.
- Technical Spotify Canva/R2/thumbnail tags are suppressed.

Primary files: `js/features/svg-icon-system.js`, `css/svg-icon-system.css`, `js/features/badge-hierarchy.js`, `css/badge-hierarchy.css`, `cloudflare/admin-worker.parts/21-m8-svg-badges.inject.part`.

## 9. Release and deployment

- Public application release: **Build 36 / PWA cache v36**.
- Private Track Manager: **v5.7**.
- Public media Worker: **v2.6**.
- Pull-request validation covers syntax, catalog behavior, PWA, Chrome smoke tests, accessibility, layout and Cloudflare dry-runs.
- Merges to `main` that change Worker sources automatically deploy and verify Cloudflare production.
- GitHub Pages rebuilds from `main`.

Final gate: `scripts/test-master-spec.mjs`.
