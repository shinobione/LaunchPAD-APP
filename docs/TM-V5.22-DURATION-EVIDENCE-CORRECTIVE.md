# Track Manager v5.22 / Studio bridge v1.12 — Canonical audio duration evidence corrective

Date: 2026-08-14
Status: **CANDIDATE — CI GREEN / NOT DEPLOYED / REAL USER PASS PENDING**

## Trigger

Studio v0.19.3 Build 70 real-user smoke on `uNTouCHaBLe` exposed a canonical contradiction after a verified master-audio replacement:

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

` safety/pre-tm522-duration-evidence-fix-20260814-0215 `

Source base:

`a5ecc96f5c91e3288eec727a5ea74f455a3a2fa4`

Feature branch:

`agent/tm522-duration-evidence-fix`

PR:

`#232 — Track Manager v5.22 — canonical audio duration evidence repair`

## Candidate evidence

Exact candidate head before documentation closeout:

`5e7b456e74b3d4bcfe087652421f37356ccc0d24`

Successful workflows on that head:

- `31756854782` — Validate Cloudflare Workers — SUCCESS
- `31756854777` — Validate Launchpad — SUCCESS
- `31756854795` — Validate Horizontal Overflow — SUCCESS

Documentation changes require a fresh exact-head CI before merge.

## Deployment gate

After fresh CI is green and `main` is confirmed unchanged:

1. merge only the exact tested PR head;
2. dispatch `Deploy Cloudflare Workers` with `target=admin` and `confirm=DEPLOY`;
3. verify Track Manager **v5.22** and Studio bridge **v1.12** from the deployed admin Worker;
4. do **not** deploy public Worker v2.7;
5. deploy the corresponding Studio Build 71 client evidence plumbing;
6. repeat the `uNTouCHaBLe` browser smoke.

Acceptance requires the browser smoke. `CI GREEN != DEPLOYED != REAL USER PASS`.
