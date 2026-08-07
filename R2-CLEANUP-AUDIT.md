# R2 cleanup audit — historical migration snapshot

_Snapshot captured: 2026-08-03. This file is retained only as migration evidence; it is **not** the current deployment/version status. For current architecture and operations use `docs/DEPLOYMENT-TOPOLOGY.md`, `cloudflare/README.md` and `RELEASE-CHECKLIST.md`._

This document records the validated R2 migration and the staged, recoverable cleanup of legacy GitHub media as it stood on 2026-08-03.

At that snapshot, automated Range, metadata and full-transfer gates passed on public Worker v2.4. The complete Android validation had been confirmed and staged cleanup was authorized.

R2 objects were left untouched by the repository-media cleanup. GitHub media removals were performed through dedicated PRs and remain represented in Git history.

## Snapshot automated result

At the time of the audit, the public `launchpad-media` Worker reported version 2.4 and 16 canonical published tracks.

- 16/16 audio URLs accepted HTTP Range requests.
- 16/16 complete audio responses transferred successfully, totaling 87,849,601 verified bytes.
- Full requests returned HTTP 200; byte-range requests returned HTTP 206.
- 16/16 catalog covers used optimized WebP thumbnails.
- All 14 tracks in the original migration manifest were present in R2.
- 10 tracks reported timestamped lyrics.
- `before-the-noise` persisted the corrected genres `Hip-hop`, `Boom Bap`, `Lo-fi`.
- `before-the-noise` persisted theme colors `#ef9542` and `#7f8c83`.
- `before-the-noise` stored its duration canonically as 237 seconds (`03:57` in the Track Manager).
- Carved from Pressure and THICK both resolved to the single `Lyrics — Timestamped` Track-detail status.

The current read-only audit command remains:

```bash
npm run audit:r2
```

Use `npm run audit:r2 -- --full-audio` to download public audio responses in full and compare received byte counts with the totals announced by Range. This verifies complete transport, not audio decoding or human playback.

Use `npm run audit:r2 -- --inventory-only` when network access is unavailable.

The historical snapshot also recorded Track Manager v4.5 as manually deployed behind Cloudflare Access. That version statement is intentionally preserved as history and must not be interpreted as the current Track Manager contract.

## Cleanup state at the snapshot

| Class | Files | Size | Historical action |
| --- | ---: | ---: | --- |
| Bundled MP3 audio | 14 | 76,892,054 bytes | Removed after R2-only Pages and Android approval |
| Per-track covers | 14 | 37,064,826 bytes | Removed after thumbnail/detail-cover verification |
| Bundled lyrics | 10 | 31,603 bytes | Removed after the no-offline decision and R2 lyrics verification |

The candidate total was 113,988,483 bytes. Album artwork, branding, PWA icons, screenshots and other interface assets were outside this deletion set.

After the lyric and catalog cleanup, the tracked repository snapshot was 14.45 MiB. This measured the then-current deployable tree only; historical media remains represented in Git history and therefore can still contribute to clone history size.

## Accepted Android gate

The Android validation on 2026-08-03 covered first-tap playback, continuous playback, system-player identity, cover loading, Lyrics Studio consistency and all 16 R2 tracks present at that time.

Before removing the bundled MP3 files, PR #45 was merged and its public GitHub Pages `catalog.js` was checked directly: 14/14 static audio entries used canonical Worker R2 routes and no `audio/...mp3` path remained. The old migration manifest is pinned to immutable commit `7867d9b60033a3b5573019b670678ecc888feace`, preserving the historical source references used during that migration.

The hard-coded track catalog and duplicated metadata file were replaced by R2-oriented production hydration plus a minimal localhost/CI fixture. The service worker does not precache that fixture.
