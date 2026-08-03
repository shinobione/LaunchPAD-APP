
# SHINOBIWAN LaunchPad — catalog guide

The production catalog is managed in Cloudflare R2 through the private LaunchPAD Track Manager. Manual edits to `js/catalog.js` and `js/catalog-metadata.js` are now legacy fallback work, not the normal publishing workflow.

## Open the Track Manager

The private administration Worker is protected by Cloudflare Access:

```text
https://launchpad-r2-api.jerryquinet.workers.dev/
```

Use it from a desktop browser. The public `launchpad-media` Worker is read-only and must never be used for uploads.

LaunchPAD can expose a private local shortcut on desktop: open the public PWA once with `?admin=1`. The resulting **Track Manager** control opens Cloudflare Access in a new tab and remains invisible to ordinary visitors. Use `?admin=0` to clear the opt-in.

## Add a track

Choose **Ajouter un titre** and complete the release form:

- title and permanent slug;
- draft or published status;
- release type, year and date;
- album ID and album title;
- genres, moods, themes and era;
- languages, BPM, key and confidence;
- duration and explicit status;
- primary and secondary accent colours;
- audio, original cover, optional lyrics and optional video.

When a cover is uploaded, the browser also generates a 512 × 512 WebP thumbnail for catalog cards.

The Worker creates this structure automatically:

```text
tracks/<slug>/manifest.json
tracks/<slug>/audio.<ext>
tracks/<slug>/cover.<ext>
tracks/<slug>/thumbnail.webp
tracks/<slug>/lyrics.txt      # optional
tracks/<slug>/video.<ext>     # optional
```

Do not rename a published slug. It is the permanent catalog and share-link identifier.

Enter duration as `mm:ss`, for example `03:57`. The Track Manager converts it to canonical seconds in `manifest.json` and formats it back to `mm:ss` when the track is reopened.

## Publish safely

A published track requires at least:

- a title;
- an audio file;
- an original cover.

Use **draft** while metadata or media is incomplete. The public Worker exposes only tracks whose manifest status is `published`.

Saving, deleting, importing or rebuilding the catalog refreshes `catalog/index.json`.

## Lyrics formats

Plain lyrics are supported, as are synchronized lyrics in these formats:

```text
[00:12.50] A bracketed LRC line
[00:12:500] Milliseconds separated by a colon
00:12.50 A timestamp and lyric on one line
00:12.50
A timestamp followed by its lyric on the next line
```

Optional metadata may appear before a line containing exactly:

```text
LYRICS:
```

The catalog rebuild derives `lyricsAvailable` and `timestampsAvailable` from the actual file. Track detail exposes a single `Lyrics` status and Lyrics Studio uses the same file, so both must agree after an index rebuild.

## Metadata conventions

### Dates

Use ISO `YYYY-MM-DD`. Leave the value empty rather than inventing an approximate date.

### Languages

Supported values are:

```text
English
French
Vietnamese
```

Separate multiple values with commas in the Track Manager.

### BPM and key

Use an integer BPM between 30 and 240. Musical keys use English note notation:

```text
C major
F# minor
Bb major
```

`keyConfidence` ranges from `0` to `1`. Values below `0.5` should be checked in the DAW.

### Explicit status

- `Clean` — reviewed and not explicit;
- `Explicit` — reviewed and explicit;
- `Unrated` — not reviewed yet.

### Accents

Use six-digit hexadecimal colours such as `#d450ff`. They theme the player, Track DNA and Audio Lab.

For migrated tracks, reopen the entry after saving and verify both swatches. Remote manifest values are authoritative over the bundled fallback catalog.

## Cover optimization

Use **Optimiser les covers** after importing historical tracks or whenever a track lacks `thumbnail.webp`.

The action:

1. downloads the protected original cover;
2. creates a 512 × 512 WebP thumbnail;
3. uploads it beside the original;
4. rebuilds `catalog/index.json` after all tracks are complete.

Original covers are retained for detailed views.

## Validation and deployment

Repository validation:

```bash
npm ci
npm run validate
npm run check:wrangler
```

Before any legacy-media cleanup, run the read-only live audit:

```bash
npm run audit:r2
npm run audit:r2 -- --full-audio
```

The full-audio mode downloads every public audio response without modifying R2 and verifies its byte count. It does not replace Android decoding and listening tests.

Worker source lives in `cloudflare/public-worker.js` and `cloudflare/admin-worker.parts/`. A merge does not deploy it. From `main`, dispatch **Deploy Cloudflare Workers** and select `public`, `admin` or `both`. The protected GitHub environment supplies the Cloudflare account ID and API token.

Deploying code does not rebuild `catalog/index.json`. Rebuild only when the release or parser change requires it, then report the merge, Worker deployment and index rebuild separately. Track Manager v4.5 is confirmed live from a manual dashboard deployment; the repository workflow still awaits its first production run.

See `RELEASE-CHECKLIST.md` for the complete publication order and `ROADMAP.md` for remaining migration work.

