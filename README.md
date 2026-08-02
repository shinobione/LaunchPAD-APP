# SHINOBIWAN Launchpad

An installable, responsive music application for the SHINOBIWAN catalog: album pages, synchronized lyrics, reactive visuals, queue controls, favorites, offline shell support and shareable Visual Cards.

**Production:** https://shinobione.github.io/LaunchPAD-APP/

## Local development

```bash
python3 -m http.server 4173
```

Open `http://127.0.0.1:4173/`. A local HTTP server is required for ES modules, audio metadata and the service worker.

## Validation

```bash
npm install
npm run validate
```

GitHub Actions additionally runs browser smoke tests, accessibility checks and desktop/mobile visual-regression screenshots.

## Project map

- `js/catalog.js` — album and track identity, paths and visual fields.
- `js/catalog-metadata.js` — language, BPM, key, explicit status, duration and release dates.
- `js/core/` — shared state, routing, queue and asset helpers.
- `js/features/` — user-facing features.
- `css/` — base, feature and responsive layers.
- `guide.md` — adding or editing music metadata.
- `ARCHITECTURE.md` — technical structure.
- `RELEASE-CHECKLIST.md` — safe publication workflow.

## Cache updates

The single build identifier lives in `js/build-config.js`. Increment both `id` and `cache` whenever a release changes JavaScript, CSS, the PWA shell or static HTML.

## Deployment

Merges to `main` are published through GitHub Pages. Do not merge unless the `Validate Launchpad` workflow is green.
