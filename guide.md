# SHINOBIWAN LaunchPAD — catalog guide

_Current application baseline: Build `2026.08.07.40`._

The production catalog is managed in Cloudflare R2 through the private LaunchPAD Track Manager. `js/catalog.js` contains album/editorial presentation data only; production track metadata and media are not maintained by hand in the PWA.

## Open the Track Manager

The private administration Worker is protected by Cloudflare Access:

```text
https://launchpad-r2-api.jerryquinet.workers.dev/
```

Use it from a desktop browser. The public `launchpad-media` Worker is read-only and must never be used for uploads.

LaunchPAD can expose a private local shortcut on desktop: open the public PWA once with `?admin=1`. The resulting **Track Manager** control opens Cloudflare Access in a new tab and remains invisible to ordinary visitors. Use `?admin=0` to clear the opt-in.

Repository Track Manager contract: **v5.7**. Public media Worker contract: **v2.6**.

## Add or edit a track

Choose **Ajouter un titre** and complete the release form:

- title and permanent slug;
- draft or published status;
- release type, year and exact release date when known;
- album ID and album title;
- genres, moods, themes and era;
- languages, BPM, key and confidence;
- duration and content rating;
- primary and secondary accent colours;
- audio, original cover, optional lyrics and optional video/Canvas.

The Track Manager can derive metadata from structured TXT/Lyrics input and can extract a cover palette on explicit request. Review inferred values before publication.

When a cover is uploaded, the browser can generate the optimized WebP thumbnail used by public catalog cards.

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

Durations may be entered in `mm:ss` form; fractional seconds supported by the current Track Manager validation are preserved when present and normalized into the canonical manifest representation.

## Publication quality

Use **draft** while metadata/media is incomplete. Before publishing, run the Track Manager quality control and resolve blocking errors.

The public catalog exposes publishable active entries; draft/archived/inactive states are not ordinary public releases.

Track Manager quality checks can cover, depending on available assets:

- required audio/cover presence;
- generated thumbnail state;
- manifest/R2 reference consistency;
- lyrics readability and timestamp state;
- duration/media geometry evidence;
- editorial metadata and musical-key confidence;
- content rating and release metadata.

Saving a track and rebuilding the public catalog are related but distinct operations. Rebuild `catalog/index.json` whenever manifest or derived lyrics/media metadata must be reflected in public catalog summaries.

## Lyrics formats

Plain lyrics are supported, as are synchronized lyrics in forms including:

```text
[00:12.50] A bracketed LRC line
[00:12:500] Milliseconds separated by a colon
00:12.50 A timestamp and lyric on one line
00:12.50
A timestamp followed by its lyric on the next line
```

Structured metadata may appear before a line containing exactly:

```text
LYRICS:
```

The catalog rebuild derives public lyrics/timestamp flags from the actual R2 lyrics asset. Track Detail exposes one Lyrics status and Lyrics Studio uses the same canonical asset, so both should agree after a correct rebuild.

## Metadata conventions

### Dates

Use ISO `YYYY-MM-DD`. Leave the value empty rather than inventing an approximate date.

### Languages

Current catalog conventions include:

```text
English
French
Vietnamese
```

Separate multiple languages with commas in Track Manager.

### BPM and key

Use the analyzed BPM and English note notation for keys, for example:

```text
C major
F# minor
Bb major
```

Treat low key-analysis confidence as a review flag rather than fabricated certainty.

### Content rating

Use the Track Manager’s current Clean / Explicit / Unrated state. `Unrated` means the content rating has not yet been reviewed.

### Accents

Use six-digit hexadecimal colours such as `#d450ff`. They theme track/player surfaces and visual identity. Cover extraction is a helper; curated values may be kept manually.

The saved R2 manifest is authoritative.

## Cover optimization

Use the Track Manager cover/thumbnail optimization action for tracks lacking a proper `thumbnail.webp` or when intentionally regenerating thumbnails.

The optimized thumbnail is stored beside the original cover. Original cover assets remain available for detailed/full artwork views.

## Batch import

The current Track Manager supports grouped file/folder import. Review every detected group before confirmation, especially:

- audio/cover/lyrics/video role assignment;
- generated slug/title;
- album inference;
- structured TXT metadata;
- duplicate/existing slug handling;
- quality warnings.

New/incomplete imports should remain drafts until reviewed.

## Repository validation

```bash
npm ci
npm run validate
npm run check:wrangler
```

For R2/media auditing when specifically needed:

```bash
npm run audit:r2
npm run audit:r2 -- --full-audio
```

The audit is read-only. Full-audio mode verifies public transfer behavior; it is not a substitute for real-device playback testing.

## Deployment boundaries

Application/web deployment and Worker/R2 publication are separate states:

- application source merges into GitHub `main`;
- GitHub Pages publishes the canonical validated static artifact from `main`;
- Cloudflare Pages staging mirrors the same `main` application runtime;
- Worker code deploys separately through **Deploy Cloudflare Workers**;
- R2 catalog/media changes happen through Track Manager and explicit catalog rebuilds.

Do not report “deployed” without saying which of those states changed.

See [`docs/DEPLOYMENT-TOPOLOGY.md`](docs/DEPLOYMENT-TOPOLOGY.md), [`RELEASE-CHECKLIST.md`](RELEASE-CHECKLIST.md) and [`cloudflare/README.md`](cloudflare/README.md) for the canonical operational flow.
