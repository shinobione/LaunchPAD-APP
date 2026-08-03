
# R2 cleanup readiness audit

_Snapshot: 2026-08-03_

This document prepares the legacy GitHub media cleanup. It does not authorize or perform deletions.

Status: automated R2 transport and metadata gates pass; physical Android acceptance and full-track decoding remain open. Cleanup is not authorized.

## Live automated result

The public `launchpad-media` Worker currently reports version 2.3 and 16 canonical published tracks.

- 16/16 audio URLs accept HTTP Range requests.
- 16/16 catalog covers use optimized WebP thumbnails.
- All 14 tracks in the original migration manifest are present in R2.
- 10 tracks currently report timestamped lyrics.
- `before-the-noise` persists the corrected genres `Hip-hop`, `Boom Bap`, `Lo-fi`.
- `before-the-noise` persists theme colors `#ef9542` and `#7f8c83`.
- `before-the-noise` stores its duration canonically as 237 seconds (`03:57` in the Track Manager).

Run the read-only audit again at any time:

```bash
npm run audit:r2
```

Use `npm run audit:r2 -- --inventory-only` when network access is unavailable.

`Validate Cloudflare Workers` also compiles both pinned Wrangler bundles, but it does not query or mutate production. The manual deployment workflow has not yet been used to confirm the repository Track Manager v4.4 in production.

## Legacy candidates, not yet deleted

| Class | Files | Size | Future action |
| --- | ---: | ---: | --- |
| Bundled MP3 audio | 14 | 76,892,054 bytes | Remove after explicit R2/mobile approval |
| Per-track covers | 14 | 37,064,826 bytes | Remove after thumbnail and detail-cover approval |
| Bundled lyrics | 10 | 31,603 bytes | Remove after Lyrics Studio approval |

The candidate total is 113,988,483 bytes. Album artwork, branding, PWA icons, screenshots and other interface assets are outside this deletion set.

## Remaining manual gate

Automated range checks prove that R2 objects are reachable, not that every full track decodes correctly on the target Android device. Before deletion, explicitly validate:

1. first-tap playback and continuous playback on the installed Android PWA;
2. title, artist and SHINOBIWAN icon in the Android system player and lock screen;
3. fast thumbnail loading and original cover loading on track details;
4. Lyrics Studio and Track details coherence for timestamped tracks;
5. all 16 tracks through a complete R2-only playback pass.

The first-tap intent, explicit Android artwork and timestamp-status fixes are present on GitHub Pages. Treat them as code-complete, not device-approved, until the target Android pass above is signed off.

Only after that approval should a separate cleanup PR remove the files, `fallbackFile`, `audio-fallback.js`, obsolete catalog metadata, and stale service-worker precache entries.

