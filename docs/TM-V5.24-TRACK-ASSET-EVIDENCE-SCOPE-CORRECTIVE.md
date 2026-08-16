# Track Manager v5.24 — Track asset evidence scope corrective

Date: 2026-08-16  
Status: **IMPLEMENTED CANDIDATE · CI PENDING · NOT DEPLOYED**

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

## Safety

```text
Canonical LaunchPAD main  bc82fea12edc7cbd1b7b054c697a553694e76322
Safety checkpoint         safety/pre-tm524-track-asset-evidence-scope-corrective-20260816
Corrective branch         agent/tm524-track-asset-evidence-scope-corrective
Diagnostic branch         diagnostic/tm523-fresh-draft-asset-upload
Production Worker deploy  NONE before exact-head CI + merge
Public Worker deploy      NONE planned
R2 manual mutation        NONE
```

`CI GREEN != MERGED != ADMIN WORKER DEPLOYED != REAL USER PASS`.
