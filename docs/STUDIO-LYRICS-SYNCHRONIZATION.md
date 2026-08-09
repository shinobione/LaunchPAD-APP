# Studio Lyrics synchronization — Track Manager v5.16 / Bridge v1.8

Production runs Track Manager `v5.16` / bridge `v1.8`, deployed admin-only from `1bbe0293e4e17968bb7e191f58e7ae1cdd95dadf` by workflow `31324447727` (Worker Version ID `5a83c6dd-cfb4-4be6-ab8d-16b5c34bdc2b`). The public Worker was not deployed and remains `v2.6`.

> Public LaunchPAD build: `2026.08.09.67` — release `post-phase6-track-dna-release-date-20260809`.
> Private Phase 6 backend deployment: run `31288949405`, source `23a7b494b89d4958f573f0889057b53a44aa23b6`, target `admin`, success.

## Authority

`tracks/<slug>/lyrics.txt` remains the **only authoritative lyrics object**. Timestamp tags inside this file determine whether lyrics are synchronized. A separate `.lrc` file is optional export/compatibility material and never contributes to Content Health.

## Context boundary

Studio opens LRC Maker with only:

- `studio=lyrics-v1`;
- the canonical `trackId`;
- a same-origin Studio return path.

Neither lyric text, audio data nor blob URLs are placed in the URL. LRC Maker obtains the protected context from:

```text
GET /api/studio/tracks/<slug>/lyrics/context
```

The response contains the canonical title, protected audio path, lyrics text, manifest revision and opaque R2 ETags. Cloudflare Access and exact credentialed CORS remain mandatory.

## Guarded synchronization save

LRC Maker first calls the non-mutating validation route, then the save route:

```text
POST /api/studio/tracks/<slug>/lyrics/sync/validate
POST /api/studio/tracks/<slug>/lyrics/sync/save
```

Both use `text/plain;charset=UTF-8` JSON to preserve the proven simple-request transport and require:

- exact payload `trackId` equality with the route slug;
- `expectedUpdatedAt` equality with the canonical manifest revision;
- `expectedLyricsEtag` equality with the current R2 object;
- valid UTF-8 text without replacement or NUL characters;
- at least one timestamp;
- a valid timestamp on every non-empty lyric line;
- finite, chronological timestamps;
- an optional finite positive `observedAudioDuration` measured from the loaded protected canonical audio;
- a final timestamp no more than two seconds beyond observed canonical-audio duration when supplied, otherwise manifest duration.

When observed audio and manifest duration materially disagree, the validator returns a warning with both values, tolerance and selected reference. The observed value is request-scoped evidence only: Lyrics validation/save never silently rewrites manifest duration.

The save writes only canonical `lyrics.txt`, advances server-owned manifest revision fields, rebuilds `catalog/index.json`, rereads the manifest and lyrics object, and verifies content plus a changed ETag. Failure attempts restoration of lyrics, manifest and catalog before returning a rollback error.

Client/backend canonical equality normalizes only the agreed text form: optional UTF-8 BOM removal plus `CRLF`/`CR` to `LF`. Real lyric differences remain blocking.

## Native synchronization behavior

The final Phase 6 LRC Maker workflow is intentionally the native flow:

- **simple click** selects a lyric line only;
- **double-click** on an existing timestamp is the explicit seek/reposition action;
- **Space** timestamps the selected line at the current audio time, then advances selection exactly one line.

This behavior is shared by standalone and embedded LRC Maker. The direct seek-on-simple-click experiment from 6.3.2 is retired.

## Explicit exclusions

- no iframe;
- no production R2 write during source/build validation;
- no manifest schema change;
- no `.lrc` persistence requirement;
- no SonicTrace data mutation from Lyrics;
- no whole-track mutation route;
- no Phase 7 work.

## Production validation

The C2 real-user smoke with LRC Maker `6.3.6` passed canonical audio playback, line/timestamp navigation, synchronized canonical `lyrics.txt` save and canonical reread. The former false "last timestamp exceeds audio duration" blocker is gone. Observed duration remains request-scoped evidence and does not silently rewrite manifest duration.

The canonical contract remains unchanged: `tracks/<slug>/lyrics.txt` is the only authoritative lyrics source; timestamp tags inside it define synchronization; `.lrc` remains optional export/compatibility only.

The final PHASE UX checkpoint is not created, C3 is suspended pending C2.5, and Phase 7 is not started.

### Historical Phase 6 validation

The authenticated production smoke test was completed after LRC Maker 6.3.4 and Studio 0.9.5 Build 20 deployment. Standalone + embedded native timing flow and guarded canonical save/reread were validated successfully.

Final Phase 6 checkpoint:

```text
safety/phase6-complete-20260809-0513
```
