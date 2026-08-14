# Track Manager v5.23 · Studio bridge v1.13 — Album publish truth

Date: 2026-08-14  
Status: **CANDIDATE — ADMIN WORKER DEPLOY REQUIRED AFTER MERGE**

## Why this corrective exists

A real Studio browser smoke on the canonical Album `Pulse Dominion` exposed a false-positive save:

1. the Album editor changed `Status` from `Draft` to `Published`;
2. `Save metadata` advanced the canonical revision;
3. Studio displayed `Album metadata saved and canonically reread.`;
4. the canonical Album header still reported `ALBUM · DRAFT`;
5. the form later reset to `Draft` after reread.

The existing Worker already protects Album publication with `ALBUM_QUALITY_BLOCKED` and requires title, non-empty tracklist, cover, valid member references and every member Track to be `published`. Those rules are unchanged.

The defect was verification truth: the server-side metadata save reread only checked revision/id/title, so a status mismatch could escape the verification gate. Studio had the same weakness client-side and also discarded structured quality details.

## v5.23 / bridge1.13 contract

TM v5.23 builds on v5.22 and adds a strict Album metadata reread comparison across:

- title;
- type;
- status;
- year;
- releaseDate;
- description;
- heading;
- accent;
- accent2.

If any requested metadata differs from the canonical reread, the Worker treats the save as unverified and enters the existing rollback path. The rollback response includes `verificationDetail` so Studio can report the exact mismatch.

The existing Album quality gate remains unchanged. The v5.23 builder regression proves:

- a member Track still in Draft blocks Album publication;
- a missing Album cover blocks publication;
- cover + valid references + all member Tracks Published makes the Album publishable;
- a requested `status: published` that rereads as `draft` is detected as a status mismatch.

## Safety / topology

```text
Track Manager            v5.23 candidate
Studio bridge            v1.13 candidate
Public Worker            v2.7 unchanged
Album membership         album.trackIds remains authoritative
Album publish rules      unchanged / not weakened
New write route          NONE
Public Worker deploy     NONE
R2 migration             NONE
Manual R2 mutation       NONE
```

Deployment remains the existing protected `Deploy Cloudflare Workers` workflow with `target=admin` and `confirm=DEPLOY` after exact-head CI, merge and anti-drift checks.

`CI GREEN != MERGED != ADMIN WORKER DEPLOYED != REAL USER PASS`.
