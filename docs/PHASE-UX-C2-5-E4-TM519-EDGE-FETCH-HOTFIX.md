# PHASE UX · C2.5-E4 — Track Manager v5.19 edge fetch hotfix

## Scope

This milestone fixes one production-only incompatibility discovered by the first authorized C2.5-E Album migration attempt. It does not broaden migration scope.

## Production evidence

`Neon Heartbreaks` migration returned HTTP 500 with `ALBUM_MIGRATION_ROLLBACK` because Cloudflare Workers rejected `redirect: "error"` on the pinned GitHub cover fetch.

The returned rollback proof was:

```json
{"manifestRemoved":true,"coverRemoved":true,"catalogRestored":true}
```

Therefore the failed attempt left no canonical Album behind and restored the catalog projection.

## Hotfix design

The final Worker bundle uses:

```js
redirect: "manual"
```

and explicitly rejects all 3xx responses before reading the image body. This preserves the original security intent: the migration must not silently follow a redirect away from the pinned `raw.githubusercontent.com` URL.

The following checks remain unchanged:

- HTTPS only;
- hostname must be `raw.githubusercontent.com`;
- URL path must start with the immutable migration source SHA;
- JPEG/PNG/WebP only;
- maximum cover size 20 MiB;
- one Album per explicit migration request;
- fresh state token required;
- exact candidate set required;
- explicit artistic-order confirmation required when source ordering is ambiguous;
- typed `MIGRATE <album-id>` confirmation required;
- rollback on publication or verification failure;
- Singles excluded.

## Contract

- Track Manager: `5.19`
- Studio bridge: `1.11`
- migration intent: unchanged, `album-migration-apply-v1`

## Safe deployment order

1. Merge only after exact-head CI is green.
2. Deploy with workflow target `admin` only.
3. Verify Track Manager reports v5.19 and Cloudflare Access remains protected.
4. Confirm public Worker is skipped.
5. Refresh Studio dry-run.
6. Retry only `Neon Heartbreaks` with the already-approved order:
   1. Before the Noise
   2. Low Bitrate Love
   3. Real Love Doesn’t Rush
7. Verify `CANONICAL / DONE`, canonical reread, cover, track order, catalog projection and Singles untouched before authorizing any second Album.

## Stop line

C2.5-F, C3 and Phase 7 remain locked.
