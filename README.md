
# SHINOBIWAN Launchpad

An installable, responsive music application for the SHINOBIWAN catalog: album pages, synchronized lyrics, reactive visuals, queues, favorites and shareable Visual Cards.

**Production:** https://shinobione.github.io/LaunchPAD-APP/

## Verified status

| Component | Repository state | Production state |
| --- | --- | --- |
| PWA | Favorites-only queue, desktop admin access, Android media fixes and an R2-only catalog are merged | GitHub Pages serves the latest service-worker release from `main` |
| Public media Worker | v2.4 source and Wrangler config are merged | `/health` reports v2.4; full requests return HTTP 200 and Range requests return HTTP 206 |
| Private Track Manager | v4.5 source and Wrangler config are merged | Protected by Access; v4.5 is confirmed live after a manual dashboard deployment |
| R2 media | Read-only Range and opt-in full-transfer audits are merged | 16/16 full audio transfers pass: 87,849,601 bytes verified, plus 16/16 optimized thumbnails |
| Cloudflare delivery | Pinned Wrangler validation and manual deployment workflow are merged | The repository workflow has not yet performed a production deployment |

The first-tap playback, Android media icon, cover loading and timestamp-status regressions are validated on the target Android device. Carved from Pressure and THICK expose the same single `Lyrics — Timestamped` status, and the validated historical media have been removed from GitHub.

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
- `cloudflare/admin-worker.parts/` — versioned private Track Manager source.
- `cloudflare/wrangler.*.jsonc` — reproducible service names, entry points and R2 bindings.
- `cloudflare/migration-manifest.json` — historical migration source data.
- `cloudflare/README.md` — R2 layout, bindings and deployment notes.
- `ROADMAP.md` — stabilization, cleanup and post-migration work.

The private Track Manager runs at `launchpad-r2-api` behind Cloudflare Access. On a desktop pointer device, open LaunchPAD once with `?admin=1` to persist a private local entry; `?admin=0` removes it. Ordinary visitors never see the control.

## Local development

```bash
python3 -m http.server 4173
```

Open `http://127.0.0.1:4173/`. A local HTTP server is required for ES modules, audio metadata and the service worker.

Local development deliberately loads a four-track fixture from `js/catalog-fixture.js` so browser tests do not depend on Cloudflare availability. Production never loads that fixture and requires the canonical public R2 catalog.

## Validation

```bash
npm ci
npm run validate
npm run check:wrangler
```

Validation covers JavaScript syntax, catalog integrity, both exact Wrangler bundles and service-worker behavior. GitHub Actions additionally runs browser smoke tests, accessibility checks and desktop/mobile visual-regression screenshots.

The live cleanup audit is read-only:

```bash
npm run audit:r2
npm run audit:r2 -- --full-audio
```

## Project map

- `js/app-engine.js` — boot sequence and remote-catalog hydration.
- `js/app-main.js` — playback, routing and application composition.
- `js/catalog.js` — album and editorial journey definitions only.
- `js/catalog-fixture.js` — minimal localhost/CI track fixture; never loaded in production.
- `js/core/catalog-store.js` — hydrated catalog state and selectors.
- `js/core/remote-catalog.js` — public Cloudflare catalog adapter.
- `js/features/` — user-facing features.
- `cloudflare/` — Worker source, migration data and deployment documentation.
- `R2-CLEANUP-AUDIT.md` — verified legacy-media inventory and deletion gate.
- `css/` — base, feature and responsive layers.
- `guide.md` — catalog and release workflow.
- `ARCHITECTURE.md` — technical structure.
- `RELEASE-CHECKLIST.md` — safe publication workflow.
- `ROADMAP.md` — remaining migration and product work.

## PWA cache updates

The service worker uses a release namespace in `sw.js`. Change it whenever JavaScript, CSS, static HTML or remote-catalog behavior must be forced onto existing installations.

`js/build-config.js` remains the version source for dynamically imported application resources.

## Deployment

Merges to `main` are published through GitHub Pages. Worker source is not deployed by a merge: dispatch **Deploy Cloudflare Workers** from `main`, choose `public`, `admin` or `both`, and use the protected `cloudflare-production` environment.

The GitHub environment must contain `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_API_TOKEN`. A Worker deployment does not rebuild `catalog/index.json`; perform that explicit Track Manager action only when required. Track Manager v4.5 is currently live from a manual Cloudflare dashboard deployment; the first successful repository-driven deployment remains to be recorded.

Do not merge unless both `Validate Launchpad` and `Validate Cloudflare Workers` are green. Report source merge, GitHub Pages publication, Worker deployment and R2 index rebuild as separate states.

