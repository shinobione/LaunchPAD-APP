# C2.5-F public deploy verification hotfix

- Date: 2026-08-11
- Runtime identity unchanged: LaunchPAD `2026.08.11.89`, public Worker `v2.7`, Track Manager `v5.19`, Studio bridge `v1.11`

## Fixed

- Increased the public post-deploy readiness window from roughly 20 seconds to up to 180 seconds.
- Expected Worker version is now validated before canonical Album authority so stale edge propagation is diagnosed correctly.
- Final verifier errors now include the last observed Worker status/version/Album authority/count.
- Added a C2.5-F regression guard for the propagation-safe verification policy.

## Incident record

Cloudflare workflow run `31485890830` successfully deployed public Worker Version ID `ddd90621-35d4-44b0-9c22-4e5a72291d9b` from SHA `97dfc3429003fd3ad62dba6cf44f6c3978d298b0`, while all admin deployment steps were skipped. The job failed only because the original short verification window observed a transient pre-convergence `/health` response.

A subsequent read-only GitHub Actions probe confirmed the live Worker at `v2.7` with `3` canonical Albums on `/health`, `/tracks`, and `/albums`.

No R2 write, catalog rebuild, admin deployment, or runtime behavior change is included in this hotfix.
