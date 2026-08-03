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

### Private Track Manager

- Service: `launchpad-r2-api`.
- Protected by Cloudflare Access.
- Required bindings and variables:
  - `MEDIA_BUCKET` → `shinobiwan-media`
  - `POLICY_AUD`
  - `TEAM_DOMAIN`
- Creates and edits canonical manifests.
- Generates WebP thumbnails.
- Rebuilds `catalog/index.json`.
- During a rebuild, reads each lyrics file and derives `lyricsAvailable` and `timestampsAvailable`.

### Public media API

- Source: `public-worker.js`.
- Service: `launchpad-media`.
- Public read-only access; do not add Cloudflare Access.
- Binding: `MEDIA_BUCKET` → `shinobiwan-media`.
- Reads `catalog/index.json` for the fast `/tracks` response.
- Streams media with HTTP Range support.
- Serves `thumbnail.webp` for catalog cards while preserving original-cover URLs.
- Accepts bracketed LRC timestamps and standalone `mm:ss.xx` lines.

## Timestamp metadata

`/tracks` does not download full lyrics during normal operation. It relies on the derived timestamp flag stored in `catalog/index.json`.

After adding or replacing lyrics, rebuild the index through the private Track Manager. The public Worker can still inspect a full lyrics file for `/tracks/<slug>`, but the index is the authoritative fast-path metadata source.

## Deployment order for parser or index changes

1. Merge the reviewed repository changes after CI passes.
2. Deploy the private Track Manager version that generates the new index fields.
3. Rebuild `catalog/index.json` once.
4. Deploy the matching public Worker.
5. Verify `/health`, `/tracks` and `/tracks/<slug>`.
6. Refresh the installed PWA after its service-worker namespace changes.

## Migration cleanup

Legacy GitHub audio, per-track covers and lyrics remain temporary fallbacks. Remove them only after R2 playback, thumbnails, synchronized lyrics and Android Media Session behavior are validated.

Future tracks are created through the Track Manager form. Metadata is stored in `manifest.json`; no hand-written metadata TXT file is required.
