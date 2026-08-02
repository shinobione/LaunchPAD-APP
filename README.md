# SHINOBIWAN Launchpad

An installable, responsive music application for the SHINOBIWAN catalog: album pages, synchronized lyrics, reactive visuals, queues, favorites, offline shell support and shareable Visual Cards.

**Production:** https://shinobione.github.io/LaunchPAD-APP/

## Production architecture

LaunchPAD is split into three services:

- **GitHub Pages** serves the PWA interface.
- **Cloudflare R2** stores canonical audio, covers, thumbnails, lyrics and release manifests.
- **Cloudflare Workers** expose a private Track Manager and a public read-only media API.

The public application loads its catalog from:

```text
https://launchpad-media.jerryquinet.workers.dev/tracks
```

Media is streamed from R2 with HTTP Range support. Catalog cards use optimized 512 px WebP thumbnails, while original artwork remains available for detailed views.

## Cloudflare components

- `cloudflare/public-worker.js` — public catalog and media streaming Worker.
- `cloudflare/migration-manifest.json` — historical migration source data.
- `cloudflare/README.md` — R2 layout, bindings and deployment notes.
- `ROADMAP.md` — stabilization, cleanup and post-migration work.

The private Track Manager runs at `launchpad-r2-api` behind Cloudflare Access. Its source is scheduled to move into the repository as part of the current consolidation phase.

## Local development

```bash
python3 -m http.server 4173
```

Open `http://127.0.0.1:4173/`. A local HTTP server is required for ES modules, audio metadata and the service worker.

Local development deliberately uses the bundled catalog so browser tests do not depend on Cloudflare availability.

## Validation

```bash
npm install
npm run validate
```

Validation covers JavaScript syntax, catalog integrity, Cloudflare Worker structure and service-worker behavior. GitHub Actions additionally runs browser smoke tests, accessibility checks and desktop/mobile visual-regression screenshots.

## Project map

- `js/app-engine.js` — boot sequence and remote-catalog hydration.
- `js/app-main.js` — playback, routing and application composition.
- `js/core/catalog-store.js` — merged catalog state and selectors.
- `js/core/remote-catalog.js` — public Cloudflare catalog adapter.
- `js/features/` — user-facing features.
- `cloudflare/` — Worker source, migration data and deployment documentation.
- `css/` — base, feature and responsive layers.
- `guide.md` — catalog and release workflow.
- `ARCHITECTURE.md` — technical structure.
- `RELEASE-CHECKLIST.md` — safe publication workflow.
- `ROADMAP.md` — remaining migration and product work.

## PWA cache updates

The service worker uses a release namespace in `sw.js`. Change it whenever JavaScript, CSS, static HTML or remote-catalog behavior must be forced onto existing installations.

`js/build-config.js` remains the version source for dynamically imported application resources.

## Deployment

Merges to `main` are published through GitHub Pages. Cloudflare Worker changes require a separate Worker deployment until repository-driven Worker CI/CD is implemented.

Do not merge unless the `Validate Launchpad` workflow is green.
