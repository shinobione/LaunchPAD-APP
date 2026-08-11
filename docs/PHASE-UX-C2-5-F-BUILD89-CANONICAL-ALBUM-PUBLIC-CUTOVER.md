# PHASE UX · C2.5-F — Build 89 canonical Album public cutover

Candidate date: 2026-08-11

Candidate release: `2026.08.11.89` — `phase-ux-c2-5-f-canonical-album-public-cutover-20260811`

C2.5-F moves the public LaunchPAD Album read path from transitional `catalog.js` authority to canonical R2 Album manifests now that C2.5-E has migrated all three historical Albums.

## Public Worker v2.7

C2.5-F adds a versioned public wrapper over the validated v2.6 media Worker rather than rewriting the historical track/audio core.

The v2.7 layer is read-only and adds:

- `GET /albums`
- `GET /albums/<album-id>`
- `GET|HEAD /albums/<album-id>/media/cover/<filename>`
- `GET|HEAD /albums/<album-id>/media/thumbnail/<filename>`
- canonical `albums[]`, `albumCount`, and `albumAuthority: "canonical-r2"` on `GET /tracks`
- Album authority/count on public health.

Album data is read from the existing `catalog/index.json` projection produced by the protected Track Manager write layer. The wrapper never writes or deletes R2 objects.

Public Album cover/thumbnail URLs point to the immutable R2 objects referenced by each canonical Album projection; track media/range behavior remains delegated to the validated v2.6 ancestry.

## LaunchPAD authoritative read model

The frontend activates the cutover only when the public Worker explicitly returns:

```json
{
  "albumAuthority": "canonical-r2"
}
```

When that signal exists:

- only canonical R2 Albums are Album authority;
- stale Album definitions in `js/catalog.js` cannot remain visible just because they exist locally;
- `album.trackIds` owns membership and artistic order;
- Album detail and Album playback use that canonical order;
- `catalog.js` remains available only as degraded/offline fallback and for non-authoritative editorial configuration such as `journeyEras`.

When the Worker is unavailable, older, or does not advertise canonical Album authority, LaunchPAD preserves the previous local fallback instead of failing boot.

## Virtual Singles

C2.5-F does **not** create a canonical `albums/singles/manifest.json`.

Under canonical authority, LaunchPAD synthesizes a `Singles` collection locally. Its membership is calculated as:

> every published catalog track that is not claimed by any canonical `album.trackIds`.

This deliberately ignores the transitional track-manifest `album.id/title` cache as an ownership authority.

At the C2.5-E closeout snapshot, 11 tracks belonged to this virtual Singles set.

## Build / cache boundary

Build 89 advances the PWA cache namespace to `shinobi-launchpad-v89`, ensuring the authoritative-read-model code is not mixed with Build 88 cached modules.

The mobile/player/UI contracts accepted in earlier PHASE UX milestones are not redesigned by this cutover.

## Deployment order

C2.5-F intentionally separates code publication from Worker activation:

1. exact-head CI on the feature PR;
2. merge Build 89 to `main` and publish Pages;
3. while public Worker v2.6 is still live, Build 89 remains safely in legacy fallback mode;
4. manually deploy **public Worker only** from that exact merged `main` revision;
5. post-deploy verification must prove Worker v2.7, `canonical-r2` authority, canonical Albums, public Album cover HEAD, and existing track audio Range behavior;
6. real-user LaunchPAD smoke validates the public Album UI/order/Singles behavior.

The admin Worker must remain Track Manager v5.19 / Studio bridge v1.11 and is not part of this deployment.

## Acceptance criteria

C2.5-F is not complete until real-user smoke confirms:

- Build 89 is live;
- Neon Heartbreaks, Coal to Diamond, and Love Letters from Saigon are rendered from canonical R2 data;
- their track orders match the canonical manifests;
- Album covers load through public R2 Album media URLs;
- Singles remains visible as a virtual collection and contains the unclaimed tracks;
- Album playback/queue remains ordered and functional;
- no mobile/player regression is observed;
- public Worker deployment leaves the protected admin Worker untouched.

Until then this document describes a **candidate**, not an accepted public release.
