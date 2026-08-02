# SHINOBIWAN Launchpad architecture

The Launchpad is migrated incrementally so public URLs, cached modules and existing media paths remain stable while the internal structure becomes cleaner.

## Active structure

```text
js/
  app-engine.js                 Boot sequence and critical styles
  app-main.js                   Application composition and delegated events
  catalog.js                    Catalog data

  core/
    catalog-store.js            Catalog selectors and runtime checks
    player-queue.js             Queue, shuffle and repeat state
    router.js                   Hash routes and deep links
    share.js                    Native sharing and clipboard fallback
    theme.js                    Per-track colour themes

  features/
    album-detail.js             Dedicated album view
    lyrics-studio.js            Immersive lyrics controls
    media-session.js            Lock-screen and headset controls
    queue-ui.js                 Queue panel and player mode controls

    about/
      about-controller.js       About links and golden wordmark
    audio/
      audio-focus.js            Local/Spotify/SoundCloud audio arbitration
    content/
      content-controller.js     Albums page, manifesto and catalog summary
    lyrics/
      wake-lock.js              Keep Lyrics awake during playback
      lyrics-engine.js          Feature namespace for the lyrics reader
    ui/
      ui-controller.js          Feature namespace for dynamic view setup
    visual/
      visual-engine.js          Feature namespace for audio visualizations
```

## Compatibility entry points

Small root-level wrappers remain temporarily for previously cached module URLs. They contain no new feature logic:

- `js/content-v4.js`
- `js/about-enhancements.js`
- `js/audio-focus.js`
- `js/lyrics-wake-lock.js`

The larger lyrics, visual and UI engines are exposed through feature namespaces while their final physical move is handled in a later cache-safe cleanup.

## Removed legacy patches

The following files were deleted because their responsibilities now belong to the central catalog/content controllers:

- `js/album-covers.js`
- `js/catalog-count.js`
- `css/about-golden-logo.css`
- `assets/ShinoBiWan-Golden-LOGO-clean.svg`

## Rules for new code

1. Catalog data is accessed through `core/catalog-store.js`.
2. Playback order is controlled by `core/player-queue.js`.
3. Dynamically generated controls use delegated events from `app-main.js`.
4. Views are addressable through hash routes.
5. Track colours come from `accent` and `accent2`, with genre fallbacks.
6. New behavior lives in `js/features/`; shared state and helpers live in `js/core/`.
7. Compatibility wrappers must remain logic-free and may be removed only after the corresponding cache window has passed.

## Remaining cleanup

- Physically move the large lyrics, visual and UI implementations behind their feature entry points.
- Consolidate old CSS correction layers after visual regression coverage is added.
- Remove compatibility wrappers once the public build has used the new paths long enough.
