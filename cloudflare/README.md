# LaunchPAD Cloudflare architecture

The media catalog uses one private administration Worker and one public read-only Worker, both bound to the `shinobiwan-media` R2 bucket as `MEDIA_BUCKET`.

## Canonical R2 layout

```text
tracks/<slug>/manifest.json
tracks/<slug>/audio.<ext>
tracks/<slug>/cover.<ext>
tracks/<slug>/lyrics.txt      # optional
tracks/<slug>/video.<ext>     # optional
```

The public API exposes only manifests whose `status` is `published`.

## Workers

- `public-worker.js` is the source for `launchpad-media`.
- The private Track Manager is deployed to `launchpad-r2-api`, protected by Cloudflare Access, with `POLICY_AUD` and `TEAM_DOMAIN` variables.

## Migration

`migration-manifest.json` contains the legacy LaunchPAD catalog and its GitHub source URLs. The Track Manager imports one track per request, which avoids a single long-running migration request.

Migration order:

1. Convert temporary `media/` objects such as `Run to Me` and `Zero-SUM` into the canonical `tracks/` layout.
2. Import the GitHub catalog from `migration-manifest.json`.
3. Verify the public `/tracks` endpoint returns the expected catalog.
4. Remove the old audio, per-track covers and lyrics from the GitHub application repository.

Future tracks are created through the Track Manager form. Metadata is stored in `manifest.json`; no hand-written metadata TXT file is required.
