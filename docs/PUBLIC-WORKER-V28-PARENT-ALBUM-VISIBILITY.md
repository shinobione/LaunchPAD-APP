# Public Worker v2.8 — canonical parent Album visibility

Date: 2026-08-16

Status: **SOURCE CANDIDATE · NOT DEPLOYED**

## Why

Studio Build100 real-user acceptance exposed a publication-order edge case:

1. canonical Album publication requires all member Tracks to already have `status=published`;
2. Track metadata publication currently validates Track quality only;
3. Public Worker v2.7 exposes any Track manifest whose status is `published`;
4. only canonical Albums whose status is `published` are exposed publicly.

A published Track owned by a draft/archived canonical Album could therefore leak into public `/tracks`, become part of virtual Singles, remain reachable through `/tracks/{slug}` and stream through `/media/...` before its parent Album was published.

## v2.8 contract

Canonical ownership remains **Album `trackIds`**, never the Track-side `album` compatibility cache.

Public visibility becomes:

```text
Track status != published
  -> already hidden by the existing public Worker

Track status == published
  -> no canonical Album owner       -> PUBLIC (standalone / virtual Singles)
  -> owner Album status == published -> PUBLIC
  -> owner Album draft/archived      -> WITHHELD
  -> ownership conflict/corruption   -> WITHHELD (fail closed)
```

The gate applies consistently to:

- `GET /tracks`;
- `GET /tracks/{slug}`;
- `GET /media/{slug}/{kind}/{filename}`.

The owner map is built read-only from canonical `albums/*/manifest.json` objects. It is cached only for the current `catalog/index.json.generatedAt`; every guarded Track or Album mutation already rebuilds the catalog, so a new generation invalidates the in-memory map.

When the canonical parent Album becomes `published`, its already-published member Tracks become publicly visible without changing Track status again.

## Explicit non-scope

Public Worker v2.8 does **not**:

- change Track Manager or Studio bridge versions;
- change Album/Track manifests;
- change R2 schema or write any R2 object;
- change Studio runtime or allocate Studio Build101;
- change LaunchPAD web/PWA Build102;
- trust Track-side `album.id` as ownership authority;
- add automatic retries or mutation behavior.

## Deployment boundary

Source/CI merge is not production deployment. The protected Cloudflare workflow must later run with:

```text
target = public
confirm = DEPLOY
```

Admin deployment must remain skipped. A post-deploy check must prove v2.8 and canonical Album authority before this corrective is considered live.
