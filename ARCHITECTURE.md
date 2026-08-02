# SHINOBIWAN Launchpad architecture

The Launchpad now uses a stable modular structure. Active application code no longer depends on legacy root-level compatibility modules.

## Active structure

```text
js/
  app-engine.js                 Boot sequence, cache versions and critical styles
  app-main.js                   Application composition and delegated events
  catalog.js                    Album and track data

  core/
    catalog-store.js            Catalog selectors and runtime checks
    player-queue.js             Queue, Shuffle and Repeat state
    router.js                   Hash routes and deep links
    share.js                    Native sharing and clipboard fallback
    theme.js                    Per-track colour themes

  features/
    album-detail.js             Dedicated album view and real media durations
    lyrics-studio.js            Immersive lyrics controls
    media-session.js            Lock-screen and headset controls
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

1. Catalog data is accessed through `core/catalog-store.js`.
2. Playback order is controlled by `core/player-queue.js`.
3. Dynamically generated controls use delegated events from `app-main.js`.
4. Views are addressable through hash routes.
5. Track colours come from `accent` and `accent2`, with genre fallbacks.
6. Feature behavior lives in `js/features/`; shared state and helpers live in `js/core/`.
7. Audio files and Range requests remain network-only in the service worker.
8. Album durations are read from MP3 metadata at runtime and cached for the session.

## Validation

GitHub Actions checks JavaScript syntax, catalog fields, referenced files, PWA behavior, migrated module paths and browser rendering of Home, Favorites, album pages, Lyrics Studio and Visual Card.
