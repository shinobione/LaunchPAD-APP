# SHINOBIWAN Launchpad architecture

The Launchpad uses a stable modular structure. Active application code no longer depends on legacy root-level compatibility modules, and the boot sequence now shares one build identifier for all dynamic imports and critical styles.

## Active structure

```text
js/
  build-config.js               Single build and PWA cache version; loads the engine
  app-engine.js                 Boot sequence and feature initialization
  app-main.js                   Application composition and delegated events
  catalog.js                    Album and track identity, paths and visual fields
  catalog-metadata.js           Release data, languages, BPM, key, explicit status and duration

  core/
    assets.js                   Versioned asset and stylesheet helper
    catalog-store.js            Enriched catalog selectors and runtime checks
    player-queue.js             Queue, Shuffle and Repeat state
    router.js                   Hash routes and deep links
    share.js                    Native sharing and clipboard fallback
    theme.js                    Per-track colour themes

  features/
    album-detail.js             Dedicated album view and media durations
    lyrics-studio.js            Single immersive Lyrics Studio mode
    media-session.js            Lock-screen and headset controls
    player-experience.js        Single Play-state authority and live Track DNA
    resilience-accessibility.js Audio recovery, language, focus and motion preferences
    queue-ui.js                 Queue panel and player mode controls
    library-memory-shell.js     Early Favorites route shell
    library-memory.js           Favorites, history and playback persistence
    pwa.js                      Installation and update controls
    visual-card.js              Branded 1080 × 1080 share cards

    about/
      about-controller.js       About links and golden wordmark
    audio/
      audio-focus.js            Local/Spotify/SoundCloud audio arbitration
    content/
      content-controller.js     Albums page, manifesto and catalog summary
    lyrics/
      lyrics-engine.js          Synchronized lyrics reader
      wake-lock.js              Keep Lyrics awake during playback
    ui/
      ui-controller.js          Dynamic view and navigation setup
    visual/
      visual-engine.js          Reactive Audio Lab visualizations
```

## Architecture rules

1. Musical identity and asset paths live in `catalog.js`; enriched release metadata lives in `catalog-metadata.js`.
2. All consumers read tracks through `core/catalog-store.js` rather than importing raw data directly.
3. Playback order is controlled by `core/player-queue.js`.
4. Global Play/Pause presentation is synchronized from the real audio element by `features/player-experience.js`.
5. Dynamically generated controls use delegated events or a feature-owned observer.
6. Views are addressable through hash routes.
7. Track colours come from `accent` and `accent2`, with genre fallbacks.
8. Feature behavior lives in `js/features/`; shared state and helpers live in `js/core/`.
9. Audio files and Range requests remain network-only in the service worker.
10. `build-config.js` is the only source of truth for dynamic resource and PWA cache versions.
11. Visual baselines protect the approved desktop and mobile layout.

## Validation

`npm run validate` checks JavaScript syntax, enriched catalog fields, referenced files and service-worker behavior. GitHub Actions additionally checks cleanup rules and opens Home, Favorites, albums, Lyrics Studio, Visual Card, Track DNA and the dynamic Play-control regression test in Chrome.

The detailed editing workflow and accepted metadata values are documented in `guide.md`.
