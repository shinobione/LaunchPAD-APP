# Track Manager v5.21 — Foundation Regression Repair candidate

Status: **CANDIDATE — REAL USER PASS PENDING**  
Date: 2026-08-13  
Scope: private/admin Worker only  
Studio dependency: `v0.19.3 · Build 64` candidate  
Public Worker: `v2.7` — unchanged / must not be redeployed

## Why this corrective exists

A real Studio smoke before Phase 7-C runtime Slice 1 exposed three foundation regressions:

1. a canonical Album cover could be successfully written and reread while Studio still rendered initials because Album artwork preview depended on the public Album projection;
2. a Track could expose an Album cache claim while the authoritative `album.trackIds` membership remained empty;
3. Studio's focused Lyrics page no longer exposed the already-existing canonical `lyrics.txt` upload path when lyrics were missing.

The first two require a Track Manager boundary correction; the third is Studio-only.

## v5.21 backend contract

- add authenticated Studio read-only Album media route:
  - `GET /api/studio/albums/<albumId>/media/cover`
  - `GET /api/studio/albums/<albumId>/media/thumbnail`
- media stays behind Cloudflare Access and Studio origin CORS;
- response is `private, no-store`;
- no public Worker route is added;
- no deployment-time R2 mutation is performed;
- Studio bridge remains `v1.11`;
- generic Studio Track Metadata validate/save no longer accepts the track-side `album` cache field;
- Album membership remains exclusively owned by guarded Album operations (`album.trackIds` authority);
- existing `album-track-move-v1` remains the transaction used to add/repair Album membership and track cache together;
- `STALE_MANIFEST`, Album stale guards, quality checks and rollback behavior remain intact.

## Deployment discipline

The candidate must pass repository validation and Wrangler dry-run before merge. After exact-head merge, only the private/admin Worker may be deployed. The public Worker stays on v2.7. Acceptance requires a deployed real-user smoke from Studio Build 64; CI/deployment success alone is not REAL USER PASS.
