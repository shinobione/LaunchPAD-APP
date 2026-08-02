# LaunchPAD Cloudflare architecture

The media catalog uses one private administration Worker and one public read-only Worker, both bound to the `shinobiwan-media` R2 bucket as `MEDIA_BUCKET`.

## Canonical R2 layout

```text
catalog/index.json
tracks/<slug>/manifest.json
tracks/<slug>/audio.<ext>
tracks/<slug>/cover.<ext>
tracks/<slug>/thumbnail.webp # generated 512 px UI artwork
tracks/<slug>/lyrics.txt     # optional
tracks/<slug>/video.<ext>    # optional
```

The public API exposes only manifests whose `status` is `published`.

## Workers

- `public-worker.js` is the source for `launchpad-media`.
- The private Track Manager is deployed to `launchpad-r2-api`, protected by Cloudflare Access, with `POLICY_AUD` and `TEAM_DOMAIN` variables.
- Track Manager v4.2 generates WebP thumbnails and rebuilds the single `catalog/index.json` file.
- Public Worker v2.2 reads that index in one R2 request and serves lightweight thumbnails to the app.
- Media Session intentionally omits per-track artwork so Android uses the installed LaunchPAD PWA icon on notifications and the lock screen.

## Deployment order

1. Deploy Track Manager v4.2 to `launchpad-r2-api`.
2. Run **Optimiser les covers** once so every published track has `thumbnail.webp` and the catalog index is rebuilt.
3. Deploy Public Worker v2.2 to `launchpad-media`.
4. Verify `/health`, `/tracks`, mobile playback and the native PWA media icon.
5. Remove the legacy GitHub audio, per-track covers and lyrics only after the Cloudflare catalog is validated.

Future tracks are created through the Track Manager form. Metadata is stored in `manifest.json`; no hand-written metadata TXT file is required. New cover uploads automatically receive an optimized thumbnail.
