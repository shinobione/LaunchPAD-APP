# SHINOBIWAN LaunchPAD — catalog guide

> Current application build: `2026.08.08.51` — release `audiolab-three-core-20260808`.

The production catalog is managed in Cloudflare R2 through the private LaunchPAD Track Manager. `js/catalog.js` contains album/editorial presentation data only; production track metadata and media are not maintained by hand in the PWA.

## Open the admin tools

The private Track Manager is protected by Cloudflare Access:

```text
https://launchpad-r2-api.jerryquinet.workers.dev/
```

LaunchPAD exposes private desktop shortcuts after an explicit `?admin=1` opt-in:

- **LRC Maker** — external synchronized-lyrics authoring tool;
- **Track Manager** — private R2/catalog administration.

The opt-in persists for the installed desktop PWA. Use `?admin=0` to clear it.

Repository Track Manager contract: **v5.7**. Public media Worker contract: **v2.6**.

## Add or edit a track

Complete the release form with:

- title and permanent slug;
- draft/published status;
- release type/year/date;
- album/project context;
- genres, moods, themes and era;
- languages, BPM, key and confidence;
- duration and content rating;
- primary/secondary accent colours;
- audio, original cover, optional lyrics and optional Canvas video.

The Track Manager can derive metadata from structured TXT/Lyrics input and extract a cover palette on explicit request. Review inferred values before publication.

Canonical R2 layout:

```text
tracks/<slug>/manifest.json
tracks/<slug>/audio.<ext>
tracks/<slug>/cover.<ext>
tracks/<slug>/thumbnail.webp
tracks/<slug>/lyrics.txt      # optional
tracks/<slug>/video.<ext>     # optional
```

Do not rename a published slug. It is the permanent catalog/share-route identifier.

## Publication quality

Use **draft** while metadata/media is incomplete. Before publishing, run Track Manager quality control and resolve blocking errors.

Saving a track and rebuilding the public catalog are related but distinct. Rebuild `catalog/index.json` whenever manifest or derived lyrics/media metadata must be reflected in public summaries.

## Lyrics formats

Plain lyrics are supported, as are synchronized forms including:

```text
[00:12.50] A bracketed LRC line
[00:12:500] Milliseconds separated by a colon
00:12.50 A timestamp and lyric on one line
00:12.50
A timestamp followed by its lyric on the next line
```

Structured metadata may appear before a line containing exactly `LYRICS:`.

Track Detail exposes one Lyrics state and Lyrics Studio consumes the same canonical asset, so both should agree after a correct catalog rebuild.

## Metadata conventions

- Dates: ISO `YYYY-MM-DD`.
- Languages: use canonical names such as English, French, Vietnamese; comma-separate multiples.
- Keys: English note notation, e.g. `F# minor`; low confidence remains a review flag.
- Content: Clean / Explicit / Unrated.
- Accents: six-digit hex such as `#d450ff`; cover extraction is a helper, not an authority.
- Duration: Track Manager accepts friendly input and stores canonical values.

The saved R2 manifest is authoritative.

## Cover / Canvas

Generate `thumbnail.webp` from the original cover when needed. Keep the original artwork beside it.

Optional Canvas video belongs at `tracks/<slug>/video.<ext>`. Public/Studio presentation is silent, inline and looped; the music player remains independent.

## Batch import

Review every detected group before confirmation, especially audio/cover/lyrics/video association, generated slug/title, album inference, TXT metadata, duplicate handling and quality warnings. Incomplete imports stay drafts.

## Audio Lab note

Audio Lab is not a catalog-authoring feature, but media changes should still be smoke-tested there. Build 51 exposes exactly Neon Shatter, Spectrum and Liquid Chrome. Spectrum is the protected reference FFT view; Neon Shatter and Liquid Chrome consume Spectrum's analyser first and must visibly follow the same signal. The separately fetched/decoded analysis copy remains a fallback while the audible HTML5 player stays outside the analysis graph.

## Repository validation

```bash
npm ci
npm run validate
npm run check:wrangler
```

Every new app build must update every Markdown file to the active build display/release; `check:build-docs` enforces that contract.

## Deployment boundaries

- application source merges into GitHub `main`;
- GitHub Pages publishes the canonical validated static artifact;
- Cloudflare Pages staging mirrors the same runtime;
- Worker code deploys separately through **Deploy Cloudflare Workers**;
- R2 catalog/media changes happen through Track Manager and explicit catalog rebuilds.

See [`docs/DEPLOYMENT-TOPOLOGY.md`](docs/DEPLOYMENT-TOPOLOGY.md), [`RELEASE-CHECKLIST.md`](RELEASE-CHECKLIST.md) and [`cloudflare/README.md`](cloudflare/README.md).
