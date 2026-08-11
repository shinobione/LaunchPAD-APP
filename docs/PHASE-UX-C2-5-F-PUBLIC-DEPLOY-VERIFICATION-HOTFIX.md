# PHASE UX · C2.5-F — Public deploy verification hotfix

Date: 2026-08-11

## Scope

This is an operations-only hotfix for the C2.5-F public Worker rollout verification. It does **not** change LaunchPAD Build 89 runtime behavior, public Worker v2.7 behavior, Track Manager v5.19 / Studio bridge v1.11, or canonical R2 data.

## Production incident

Manual Cloudflare workflow run `31485890830` deployed only the public Worker from source SHA:

`97dfc3429003fd3ad62dba6cf44f6c3978d298b0`

Confirmed deployment facts:

- `DEPLOY_TARGET=public`;
- private Track Manager deploy/record/verify steps were skipped;
- public `launchpad-media` deployment succeeded;
- recorded public Worker Version ID: `ddd90621-35d4-44b0-9c22-4e5a72291d9b`;
- post-deploy verification failed after 10 attempts because `/health` temporarily lacked the expected `albumAuthority` marker.

The failed job did not roll the Worker back and did not mutate R2.

## Root cause

The verifier allowed only approximately 20 seconds of edge propagation time:

- 10 attempts;
- 2 seconds between attempts.

A later read-only live probe from GitHub Actions confirmed the already-deployed Worker had converged and was healthy:

- `/health`: HTTP 200, Worker `2.7`, `albumAuthority=canonical-r2`, `canonicalAlbums=3`;
- `/tracks`: HTTP 200, `30` public tracks, `3` canonical Albums, `albumAuthority=canonical-r2`;
- `/albums`: HTTP 200, `3` canonical Albums, `albumAuthority=canonical-r2`.

The production failure was therefore a deployment-verification false negative caused by propagation timing, not a C2.5-F runtime failure.

## Hotfix

`scripts/verify-cloudflare-deployment.mjs` now:

- retries public readiness up to 60 times;
- waits 3 seconds between retries;
- therefore tolerates up to 180 seconds of normal edge convergence;
- validates the expected Worker body/header version before Album authority, so a stale edge is diagnosed as stale rather than as an Album contract failure;
- records the last observed status/version/authority/count and includes it in the final error if convergence never occurs.

The C2.5-F regression guard now asserts these deployment-verification invariants.

## Versioning

No product/runtime version bump is appropriate for this hotfix:

- LaunchPAD remains `2026.08.11.89`;
- public Worker remains `v2.7`;
- Track Manager remains `v5.19`;
- Studio bridge remains `v1.11`.

Only deployment verification tooling and documentation change.

## Safety

- no public Worker source change;
- no admin Worker source change;
- no R2 put/delete;
- no catalog rebuild;
- no Album migration write;
- no player/Lyrics/Audio Lab/Canvas change;
- C3 remains not started;
- Phase 7 remains not started.

## Status

Public Worker v2.7 is live and healthy. C2.5-F still requires the final real-user LaunchPAD Build 89 smoke before the milestone is declared complete.
