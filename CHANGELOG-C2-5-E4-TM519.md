# C2.5-E4 — Track Manager v5.19 / Studio bridge v1.11

Date: 2026-08-11

## Incident

The first authorized `Neon Heartbreaks` canonical Album migration reached the real production Worker and failed during pinned GitHub cover import.

Cloudflare Workers rejected `fetch(..., { redirect: "error" })` with:

`Invalid redirect value, must be one of "follow" or "manual".`

The migration transaction rolled back successfully:

- Album manifest removed: true
- imported cover removed: true
- catalog projection restored: true
- Singles untouched

No canonical Album survived the failed attempt.

## Fix

Track Manager v5.19 / Studio bridge v1.11 adds an edge-safe cover-import override:

- `redirect: "manual"` only;
- any HTTP 3xx is explicitly rejected;
- pinned `raw.githubusercontent.com` host validation remains mandatory;
- immutable migration source ref validation remains mandatory;
- no redirect is silently followed.

The guarded migration contract is otherwise unchanged.

## Deployment boundary

- Admin Worker only.
- Public media Worker must remain unchanged.
- Deployment itself performs no Album migration and no R2 media mutation.
- After deployment, only `Neon Heartbreaks` may be retried first.
- `Coal to Diamond` and `Love Letters from Saigon` remain locked until Neon is canonically reread and verified.

## Regression guards

`scripts/test-c2-5-e4-album-migration-edge-fetch.mjs` verifies the edge-safe redirect mode, redirect rejection, pinned source guards and final v5.19 / bridge v1.11 bundle.
