# SHINOBIWAN Launchpad architecture

The Launchpad is being migrated incrementally so existing public URLs and cached modules keep working during the transition.

## Active structure

```text
js/
  app-engine.js                 Boot sequence and critical styles
  app-main.js                   Application composition and event delegation
  catalog.js                    Catalog data (compatibility location)

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
    content/
      content-controller.js     Albums page, manifesto and catalog summary
```

## Compatibility files

Older entry points remain temporarily as wrappers while browser caches expire. They should not receive new feature logic.

- `js/content-v4.js` re-exports the content controller.
- Existing audio, visual, lyrics and About modules remain in place until their migration wave.
- Existing asset paths are preserved during the code refactor to avoid breaking covers, audio and lyrics.

## Rules for new code

1. Catalog data is accessed through `core/catalog-store.js`.
2. Playback order is controlled by `core/player-queue.js`.
3. Dynamically generated controls use delegated events from `app-main.js`.
4. Views are addressable through hash routes.
5. Track colours come from `accent` and `accent2`, with genre fallbacks.
6. New features live in `js/features/` rather than new root-level patch files.

## Next cleanup wave

- Move lyrics, visual, audio-focus and About controllers into feature folders.
- Merge obsolete CSS patches into stable view/component stylesheets.
- Remove compatibility wrappers after the public build has used the new entry points long enough.
