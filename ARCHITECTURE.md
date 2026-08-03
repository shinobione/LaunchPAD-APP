
# SHINOBIWAN Launchpad architecture

LaunchPAD is a modular PWA backed by a canonical Cloudflare R2 media catalog. GitHub Pages serves the interface; Cloudflare Workers manage and publish media stored in R2.

## Runtime topology

```text
Browser / installed PWA
        |
        | GitHub Pages shell, JavaScript and CSS
        v
shinobione.github.io/LaunchPAD-APP
        |
        | GET /tracks, /tracks/<slug>, /media/...
        v
launchpad-media Worker  --->  shinobiwan-media R2 bucket

Private desktop administration
        |
        | ?admin=1 local opt-in, then Cloudflare Access
        v
launchpad-r2-api Worker  --->  same R2 bucket
```

## Canonical R2 structure

```text
catalog/index.json
tracks/<slug>/manifest.json
tracks/<slug>/audio.<ext>
tracks/<slug>/cover.<ext>
tracks/<slug>/thumbnail.webp
tracks/<slug>/lyrics.txt      # optional
tracks/<slug>/video.<ext>     # optional
```

`catalog/index.json` is the fast public catalog snapshot. It contains published manifests plus derived flags such as lyrics and timestamp availability. The original manifest remains the source of truth for a track.

## Application structure

```text
js/
  build-config.js               Dynamic resource version
  app-engine.js                 Boot, catalog hydration and feature initialization
  app-main.js                   Playback, routing and delegated events
  catalog.js                    Temporary bundled fallback catalog
  catalog-metadata.js           Temporary bundled fallback metadata

  core/
    assets.js                   Versioned asset and stylesheet helper
    catalog-store.js            Static/remote merge and catalog selectors
    remote-catalog.js           Public Worker response adapter
    player-queue.js             Queue, Shuffle and Repeat state
    router.js                   Hash routes and deep links
    share.js                    Native sharing and clipboard fallback
    theme.js                    Per-track colour themes

  features/
    lyrics/lyrics-engine.js     Lyrics loading, parsing and synchronization
    media-session.js            Android lock-screen and headset controls
    player-experience.js        Play-state authority and Track DNA
    library-memory.js           Favorites, history and playback persistence
    admin-access.js             Desktop-only local Track Manager entry
    pwa.js                      Installation and update controls
    ...

cloudflare/
  public-worker.js              Public read-only API and Range streaming
  admin-worker.parts/           Ordered private Worker source
  wrangler.public.jsonc         Public production deployment contract
  wrangler.admin.jsonc          Private production deployment contract
  migration-manifest.json       Legacy GitHub-to-R2 migration plan
  README.md                     Worker bindings and deployment notes
```

## Boot sequence

1. `build-config.js` installs the application engine.
2. `app-engine.js` prepares the PWA shell and requests `/tracks` from the public Worker.
3. `remote-catalog.js` maps R2 manifests to LaunchPAD track objects.
4. `catalog-store.js` updates matching bundled entries and appends cloud-only tracks.
5. `app-main.js` renders the hydrated catalog and initializes playback.
6. Favorites can replace the catalog queue with a contextual favorites-only queue without changing Shuffle or Repeat state.
7. `admin-access.js` exposes the private link only after a desktop user opts in locally with `?admin=1`.
8. The service worker provides an offline interface shell; audio Range requests remain network-only.

Localhost intentionally skips the remote catalog so CI and local development remain deterministic.

## Lyrics metadata flow

The Lyrics reader parses the actual `lyrics.txt` file. Track detail exposes one authoritative `Lyrics` value: remote tracks start at `Checking…`, then the full `/tracks/<slug>` response resolves the status to `Timestamped`, `Not timestamped` or `Status unavailable`.

The Track Manager catalog rebuild must inspect each lyrics object and write the derived flag into `catalog/index.json`. The public Worker also validates the flag when a full `/tracks/<slug>` response is requested, avoiding a second contradictory Track-detail field. Both parsers accept:

```text
[00:12.50] A bracketed LRC line
00:12.50 A timestamp and lyric on one line
00:12.50
A timestamp followed by its lyric on the next line
```

## Architecture rules

1. R2 manifests are the canonical music metadata source.
2. All UI consumers read tracks through `core/catalog-store.js`.
3. The public Worker is GET/HEAD/OPTIONS only and has no Cloudflare Access policy.
4. The private Worker is protected by Cloudflare Access and is the only publishing interface.
5. Public catalog cards use `thumbnail.webp`; detailed pages may use the original cover.
6. Audio responses support HTTP Range requests and bypass the PWA cache.
7. Views remain addressable through hash routes.
8. Playback order is controlled by `core/player-queue.js`.
9. Catalog, album and favorites queues remain explicit contexts; an empty contextual queue never falls back silently to the catalog.
10. Feature behavior lives in `js/features/`; shared state and helpers live in `js/core/`.
11. Every shell-changing release receives a new service-worker cache namespace.
12. Worker changes and PWA changes must pass CI before deployment.
13. A merge, GitHub Pages publication, Worker deployment and catalog rebuild are distinct release states.
14. Bundled media remains temporary and must be removed only after the R2-only mobile checks pass.

## Validation

`npm run validate` checks JavaScript syntax, catalog integrity, the public Worker contract and service-worker behavior. `npm run check:wrangler` compiles the exact public and private deployment bundles without deploying. GitHub Actions runs both plus Chrome smoke tests, accessibility checks and desktop/mobile visual-regression captures.

Production deployment is a manual `main` workflow protected by the `cloudflare-production` environment. Wrangler uses the existing `MEDIA_BUCKET` binding and preserves dashboard variables. The workflow does not rebuild the R2 catalog index.

See `guide.md`, `RELEASE-CHECKLIST.md` and `ROADMAP.md` for operational workflows.

