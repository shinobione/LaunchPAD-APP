# Track Manager v5.22 / Studio bridge v1.12 — Canonical audio duration evidence corrective

Date: 2026-08-14
Status: **COMPLETE — DEPLOYED / REAL USER PASS THROUGH STUDIO BUILD71**

## Trigger

Studio v0.19.3 Build70 real-user smoke on `uNTouCHaBLe` exposed a canonical contradiction after a verified master-audio replacement:

- the browser and embedded Lyrics Studio read the canonical audio at about **3:55**;
- the last canonical lyrics timestamp is **03:48.593**;
- Track Manager quality still reported `Durée — La durée doit être supérieure à zéro` and `Synchronisation — Le dernier timestamp dépasse la fin du morceau`.

The user did not supply a bad audio file or invalid lyrics. The canonical Track manifest still carried a zero/missing duration while the audio object itself was healthy.

## Root cause

Track Manager v5.21 `asset-upload-v1` verified and persisted the audio object plus the new manifest revision but did not derive or persist `manifest.duration`.

Metadata `validate` / `save` reused `inspectTrackQuality()` without browser audio evidence. The quality layer therefore fell back to the stale manifest duration, so a valid timestamp at 03:48.593 was compared against a zero duration.

## v5.22 contract

Track Manager v5.22 / Studio bridge v1.12 keeps all existing authorities and adds **audio evidence**, not a new generic metadata field or write route.

- browser-measured audio duration is bounded to a finite positive value up to 12 hours and rounded to milliseconds;
- evidence is accepted separately from the generic Studio metadata allowlist;
- derived duration is persisted only when the Track already has a canonical audio asset;
- metadata validation applies the same evidence before quality inspection and reports `duration` as a derived changed field when repair is required;
- metadata save applies the reviewed evidence under the existing `expectedUpdatedAt` stale guard, protected save path, rollback and canonical reread verification;
- future audio uploads may supply `audioDuration` / `audioReadable` in the existing multipart `asset-upload-v1` request so the canonical manifest receives duration at the same verified revision;
- quality checks use the same evidence for duration coherence and final-lyrics-timestamp bounds.

## Explicit non-changes

- no generic Studio/R2 writer;
- no new mutation route;
- no manual editable `duration` metadata field;
- no Album membership/order change (`album.trackIds` remains sole authority);
- no Lyrics authority change (`lyrics.txt` remains canonical);
- no SonicTrace contract change;
- no public Worker change;
- no media migration or catalog rebuild merely from deploying Worker code.

## Safety / rollback

Pre-change checkpoint:

`safety/pre-tm522-duration-evidence-fix-20260814-0215`

Source base:

`a5ecc96f5c91e3288eec727a5ea74f455a3a2fa4`

Feature branch:

`agent/tm522-duration-evidence-fix`

PR:

`#232 — Track Manager v5.22 — canonical audio duration evidence repair`

## Exact tested / deployment evidence

```text
Exact tested head      888d29e9b7064346311ed3c959669a327505204d
Validate Workers       31757006174 · SUCCESS
Validate LaunchPAD     31757006198 · SUCCESS
Validate Overflow      31757006309 · SUCCESS
Merge                  be7d970f6577e0e54eade04a5ef764a733baed42
Deploy run             31789368122 · SUCCESS
Deploy target          admin
Track Manager          v5.22
Studio bridge          v1.12
Worker Version ID      df00e4c7-bfa1-45a3-b3e8-bd2640e0a159
Public Worker          v2.7 · deployment steps SKIPPED
```

The deployment workflow explicitly ran with `DEPLOY_TARGET=admin`. Public Worker deploy/record/verify steps were skipped.

## Real-user acceptance

The matching Studio client landed as **Studio v0.19.3 · Build71**.

Studio evidence:

```text
Studio tested head     4298a07e13983786833240dd69a61a72dc09636e
Studio CI              31757665434 · SUCCESS
Studio merge           0b3c3d452076708c698de71d9c691b5e459f7c17
Studio Pages           31789774785 · SUCCESS
User verdict           @GitHub BUILD71 PASS · 2026-08-14
```

The deployed end-to-end stack therefore completed the full acceptance chain:

`CI GREEN → DEPLOYED → REAL USER PASS`.

This confirms the canonical duration-evidence corrective through Studio Build71. Historical v5.21 repair records remain valid predecessor evidence and are not rewritten.

## Acceptance policy

**CI GREEN != DEPLOYED != REAL USER PASS.**

TM v5.22 / bridge v1.12 has now completed all three stages through the accepted Studio Build71 browser smoke.
