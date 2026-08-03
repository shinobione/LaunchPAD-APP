
# R2 cleanup readiness audit

_Snapshot: 2026-08-03_

This document records the validated R2 migration and the staged, recoverable cleanup of legacy GitHub media.

Status: automated Range, metadata and full-transfer gates pass on public Worker v2.4. The user confirmed the complete Android validation on 2026-08-03; staged cleanup is authorized.

R2 objects remain untouched. GitHub media removals are performed only in dedicated PRs and remain recoverable from repository history.

## Live automated result

The public `launchpad-media` Worker currently reports version 2.4 and 16 canonical published tracks.

- 16/16 audio URLs accept HTTP Range requests.
- 16/16 complete audio responses transferred successfully, totaling 87,849,601 verified bytes.
- Full requests return HTTP 200; byte-range requests return HTTP 206.
- 16/16 catalog covers use optimized WebP thumbnails.
- All 14 tracks in the original migration manifest are present in R2.
- 10 tracks currently report timestamped lyrics.
- `before-the-noise` persists the corrected genres `Hip-hop`, `Boom Bap`, `Lo-fi`.
- `before-the-noise` persists theme colors `#ef9542` and `#7f8c83`.
- `before-the-noise` stores its duration canonically as 237 seconds (`03:57` in the Track Manager).
- Carved from Pressure and THICK both resolve to the single `Lyrics — Timestamped` Track-detail status.

Run the read-only audit again at any time:

```bash
npm run audit:r2
```

Use `npm run audit:r2 -- --full-audio` to download all 16 audio responses in full and compare every received byte count with the total announced by Range. This verifies complete transport, not audio decoding or human playback.

Use `npm run audit:r2 -- --inventory-only` when network access is unavailable.

`Validate Cloudflare Workers` also compiles both pinned Wrangler bundles, but it does not query or mutate production. Track Manager v4.5 is confirmed live behind Cloudflare Access after a manual dashboard deployment. The repository deployment workflow has not yet completed its first production run.

## Cleanup state

| Class | Files | Size | Future action |
| --- | ---: | ---: | --- |
| Bundled MP3 audio | 14 | 76,892,054 bytes | Removed after R2-only Pages and Android approval |
| Per-track covers | 14 | 37,064,826 bytes | Removed after 14/14 thumbnail and detail-cover verification |
| Bundled lyrics | 10 | 31,603 bytes | Removed after the no-offline decision and R2 lyrics verification |

The candidate total is 113,988,483 bytes. Album artwork, branding, PWA icons, screenshots and other interface assets are outside this deletion set.

After the lyric and catalog cleanup, the tracked repository snapshot is 14.45 MiB. This measures the current deployable tree only; historical media remains recoverable in Git history and therefore still contributes to clone size.

## Accepted Android gate

The user explicitly confirmed on 2026-08-03 that the Android validation is fully successful, including first-tap playback, continuous playback, system-player identity, cover loading, Lyrics Studio consistency and all 16 R2 tracks.

Before removing the bundled MP3 files, PR #45 was merged and its public GitHub Pages `catalog.js` was checked directly: 14/14 static audio entries used the canonical Worker R2 routes and no `audio/...mp3` path remained. The old migration manifest is pinned to immutable commit `7867d9b60033a3b5573019b670678ecc888feace`, so its historical source URLs remain recoverable after cleanup.

The hard-coded track catalog and duplicated metadata file have now been replaced by R2-only production hydration plus a minimal localhost/CI fixture. The service worker does not precache that fixture.
