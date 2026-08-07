# LaunchPAD deployment topology

_Last reconciled: 2026-08-07 — Build 2026.08.07.40_

## One source of truth

`main` is the only authoritative application source.

No deployment branch, hosted editor, dashboard copy or generated bundle is allowed to become a second source of truth. Feature branches are temporary and must either be merged into `main` or deleted after their work is finished.

```text
                         GitHub repository
                              main
                               |
                      validated Build 40
                               |
                +--------------+--------------+
                |                             |
                v                             v
        GitHub Pages                    Cloudflare Pages
        public web host                 staging / preview host
                |                             |
                +--------------+--------------+
                               |
                         Browser / PWA
                               |
                  +------------+------------+
                  |                         |
                  v                         v
          public media Worker        private admin Worker
          launchpad-media            launchpad-r2-api
                  |                         |
                  +------------+------------+
                               |
                        Cloudflare R2
                      shinobiwan-media
```

## Canonical Build 40

The current application release is defined only in `js/build-config.js`:

```text
id       20260807-unified-v40
cache    shinobi-launchpad-v40
display  2026.08.07.40
release  unified-v40-20260807
```

Both web hosts must publish files generated from the same checkout of `main` and must expose that build metadata.

## Web hosting

### GitHub Pages

Primary public URL:

```text
https://shinobione.github.io/LaunchPAD-APP/
```

GitHub Pages is deployed by `.github/workflows/deploy-github-pages.yml` after a successful push to `main` or a manual dispatch. The workflow builds and validates the same static runtime used by Cloudflare Pages before uploading the Pages artifact.

The historical `gh-pages` branch is no longer a deployment source. It can be deleted after repository branch cleanup; the workflow deployment is authoritative.

### Cloudflare Pages

Staging URL:

```text
https://shinobiwan-launchpad-staging.pages.dev/
```

Cloudflare Pages is a host for the application shell, not a source repository. It tracks `main` and currently uses the compatibility build command:

```bash
node scripts/build-cloudflare-pages.mjs && node scripts/validate-cloudflare-pages-build.mjs
```

Those scripts copy and validate the application verbatim. They must never patch JavaScript, CSS, HTML or PWA files during deployment.

`dist/cloudflare-pages/` is therefore a generated artifact, never a hand-edited source directory.

## Backend services

### Public Worker

- service: `launchpad-media`
- source: `cloudflare/public-worker-v26.js` / versioned public Worker source
- current contract: v2.6
- purpose: public catalog, track detail and Range-capable media delivery
- R2 binding: `MEDIA_BUCKET`

### Private Track Manager Worker

- service: `launchpad-r2-api`
- source: `cloudflare/admin-worker.parts/`
- current Track Manager contract: v5.7
- protected by Cloudflare Access
- purpose: upload/edit/publish tracks, derive metadata and rebuild the public catalog
- R2 binding: `MEDIA_BUCKET`

Worker deployment and web-host deployment are intentionally separate operations.

## R2

`shinobiwan-media` is the canonical media and track-manifest store.

```text
catalog/index.json
tracks/<slug>/manifest.json
tracks/<slug>/audio.<ext>
tracks/<slug>/cover.<ext>
tracks/<slug>/thumbnail.webp
tracks/<slug>/lyrics.txt      # optional
tracks/<slug>/video.<ext>     # optional
```

The repository contains application code and deterministic local/CI fixtures, not a second production music catalog.

## Lovable

Lovable is treated as an external prototyping/experimentation environment only. It is **not** an authoritative deployment source for LaunchPAD unless a future migration is explicitly approved and completed through `main`.

Code that exists only in Lovable is not production code. Any Lovable change intended for LaunchPAD must return to the GitHub repository, pass CI and merge into `main` before deployment.

## Release flow

```text
feature/fix branch
       |
       v
pull request + CI
       |
       v
      main
       |
       +--> GitHub Pages
       |
       +--> Cloudflare Pages staging

Worker changes:
main --> protected manual Deploy Cloudflare Workers workflow --> Workers

Catalog/media changes:
Track Manager --> R2 --> rebuild catalog/index.json when required
```

## Rules that prevent another split-brain state

1. `main` is the only source of truth.
2. GitHub Pages never checks out `gh-pages` or another recovery branch.
3. Cloudflare Pages tracks `main`; it does not contain unique runtime patches.
4. Deployment scripts may copy/validate the runtime but may not mutate it.
5. A branch named `fix/`, `agent/`, `migration/`, `release/` or `hotfix/` is temporary.
6. Merged temporary branches should be deleted.
7. Build numbers advance in one place: `js/build-config.js`.
8. CI tests current behavior, not obsolete historical build numbers.
9. Cloudflare Workers and R2 remain separate backend concerns; publishing the PWA does not implicitly deploy or rebuild them.
10. Lovable is not production authority unless explicitly promoted through GitHub.

## Compatibility debt still visible after v40

A few filenames still contain historical host/version names, notably `build-cloudflare-pages.mjs`, `validate-cloudflare-pages-build.mjs`, `navigation-stability-v39.js` and `ui-stability-v39.css`. They remain temporarily because external deployment configuration and regression-tested runtime wiring still reference them.

They should be renamed/absorbed only in a dedicated refactor after both web hosts have been observed running v40. Their names are legacy debt; their contents are part of the current validated runtime.
