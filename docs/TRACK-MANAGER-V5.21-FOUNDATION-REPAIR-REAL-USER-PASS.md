# Track Manager v5.21 — Foundation Regression Repair REAL USER PASS

Status: **ACCEPTED · REAL USER PASS for repair scope**  
Date: 2026-08-13  
Studio bridge: **v1.11**  
Public Worker: **v2.7 unchanged**

## Scope

Track Manager v5.21 is the private admin-Worker half of the Studio Foundation Regression Repair.

It preserves Track Manager as the protected canonical write authority and adds only the repair behavior required by Studio:

- protected read-only Album media route for canonical Album cover/thumbnail presentation;
- removal of `album` from the generic Studio metadata write allowlist so Track-side Album compatibility cache cannot be mutated independently of canonical Album membership operations;
- existing stale/revision protections, confirmations and canonical rereads remain intact;
- Studio bridge remains v1.11;
- public Worker and public LaunchPAD runtime are unchanged.

## Exact deployment evidence

```text
LaunchPAD code main   813eb845b563b9a176c23f490d7fc044d4a0abc3
Deploy run            31728992790 · SUCCESS · admin target
TM Worker Version ID  0e1b9a3f-eabd-432e-8872-24ff0a9c085f
Public Worker         v2.7 · unchanged
```

The deployment workflow is code-only and does not rebuild `catalog/index.json` or mutate R2 media.

## Real-user acceptance evidence

The deployed TM5.21 authority was exercised through the accepted Studio repair sequence:

- private Album artwork was reread and rendered in Studio;
- guarded Album membership repair was exercised against canonical `album.trackIds` authority;
- guarded canonical `lyrics.txt` upload succeeded after the Studio crash corrective;
- Studio v0.19.3 Build 67 completed the Foundation Regression Repair and received the final real-user pass.

Track Manager v5.21 is therefore accepted for the Foundation Regression Repair scope. It does not create a new LaunchPAD public build.

Build 68 is a later Studio-only Home presentation corrective and does not change TM5.21.

Rollback/checkpoint:

```text
safety/post-tm521-foundation-repair-rup-20260813-2208
```
