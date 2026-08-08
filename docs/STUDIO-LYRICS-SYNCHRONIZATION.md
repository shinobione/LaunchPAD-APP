# Studio Lyrics synchronization — Track Manager v5.15 / Bridge v1.7

> Public LaunchPAD build: `2026.08.08.66` — release `studio-metadata-validation-20260808` (unchanged).

## Authority

`tracks/<slug>/lyrics.txt` remains the only authoritative lyrics object. Timestamp tags inside this file determine whether lyrics are synchronized. A separate `.lrc` file is optional export/compatibility material and never contributes to Content Health.

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
- a final timestamp no more than two seconds beyond manifest duration.

The save writes only `lyrics.txt`, advances server-owned manifest revision fields, rebuilds `catalog/index.json`, rereads the manifest and lyrics object, and verifies content plus a changed ETag. Failure attempts restoration of lyrics, manifest and catalog before returning a rollback error.

## Explicit exclusions

- no iframe;
- no production R2 write during source validation;
- no public Worker or LaunchPAD application version bump;
- no manifest schema change;
- no `.lrc` persistence requirement;
- no SonicTrace data mutation;
- no whole-track mutation route.
