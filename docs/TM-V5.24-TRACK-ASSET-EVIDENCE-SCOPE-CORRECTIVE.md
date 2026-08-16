# Track Manager v5.24 — Track asset evidence scope corrective

Date: 2026-08-16  
Status: **DEPLOYED · REAL USER VERIFIED · ACCEPTED CORRECTIVE**

## Real-user trigger

Studio `v0.19.19 · Build97` successfully created the real canonical draft `pixels-promises`, but the first MP3 upload and the first JPEG cover upload both returned:

```text
ASSET_SAVE_ROLLBACK · HTTP 500
```

Track Manager v5.23 remained reachable and authenticated. The draft was visible canonically in Track Manager.

## Reproduction

A diagnostic branch built the exact current TM v5.23 bundle from canonical `main` and executed the real `createStudioTrack()` + `uploadStudioTrackAsset()` functions against a strongly-consistent in-memory R2 model.

Diagnostic run `31916576113` reproduced the failure immediately after successful draft creation:

```text
ReferenceError: uploadEvidence is not defined
    at uploadStudioTrackAsset(...)
```

A second diagnostic run `31916652865` proved the builder-placement defect:

- the only `const uploadEvidence` declaration was inside `uploadStudioAlbumAsset()`;
- `uploadStudioTrackAsset()` used `uploadEvidence` without declaring it.

The v5.22 wrapper had used a generic first-occurrence replacement for the shared `file / validateUploadFile` fragment. Since the generated source orders canonical Album assets before Phase4 Track assets, the evidence declaration landed in the wrong function. The old builder guard only checked that `audioDuration` existed somewhere in the bundle, so the scope error escaped static validation and was inherited by v5.23.

## Corrective scope

TM v5.24 / Studio bridge v1.14 is intentionally narrow:

1. build from accepted v5.23;
2. prove the v5.23 regression signature before mutation;
3. remove the misplaced Track-audio evidence declaration from Album asset upload;
4. inject that declaration inside `uploadStudioTrackAsset()` only;
5. retain the existing duration-evidence application, quality checks, guarded R2 transaction, canonical reread and rollback logic;
6. enforce exactly one declaration in the final bundle and prove it belongs to the Track function;
7. execute a dynamic regression covering the observed real state: `album-track` + transitional `Singles`, then first MP3 and first JPEG.

## Explicit non-goals

This corrective does **not**:

- change R2 schema or existing R2 data;
- weaken asset rollback or canonical reread verification;
- add automatic write retries;
- change Album asset semantics;
- change Public Worker v2.7;
- change LaunchPAD public runtime;
- modify Studio runtime in this backend PR;
- mark Studio Build97 REAL USER PASS.

## Accepted receipts

```text
Original accepted main    bc82fea12edc7cbd1b7b054c697a553694e76322
Safety checkpoint         safety/pre-tm524-track-asset-evidence-scope-corrective-20260816
Corrective PR             #238
Corrective merge          aaa28c90c95b6d5dbe76e34a840d95e194e0cc65
Diagnostic run            31916576113 · reproduced ReferenceError
Placement proof run       31916652865 · proved declaration in wrong function
Protected deploy run      31919397012 · SUCCESS · target admin
Track Manager             v5.24
Studio bridge             v1.14
Worker Version ID         53abb651-4f3c-46a7-a37a-055f35d340b9
Cloudflare Access check   PASS
Public Worker deploy      SKIPPED · v2.7 unchanged
R2 deployment mutation   NONE · deploy did not rebuild catalog/index.json or mutate media
Real-user verdict         MP3 + COVER + MP4 + TXT PASS MADAFAKA · 2026-08-16
Safety post-acceptance    safety/post-tm524-real-user-pass-20260816
```

The exact fresh-draft regression (`album-track` + transitional `Singles` → first MP3 → first JPEG) passes in the v5.24 bundle, and the genuine `Pixels & Promises` continuation additionally verified MP4 + TXT in production. No automatic write retry was added and the existing rollback/canonical reread safety model remains intact.

TM v5.24 / bridge v1.14 is **REAL USER VERIFIED**.
