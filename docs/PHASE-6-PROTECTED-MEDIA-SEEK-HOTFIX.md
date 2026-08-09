# Phase 6 — Protected media seek hotfix

Current LaunchPAD public build: **2026.08.08.66**  
Current LaunchPAD release: **studio-metadata-validation-20260808**

## Problem

The embedded LRC Maker engine can select a timestamped lyric line and set the active `HTMLAudioElement.currentTime`, but the canonical protected media route previously returned the complete R2 object for every request and did not honor HTTP byte ranges.

For canonical audio loaded through Track Manager, this made browser seeking unreliable: clicking a timestamped lyric line could fall back near the beginning of the audio instead of the requested timestamp.

## Fix

The private Track Manager media route now supports a single HTTP byte range for protected canonical media:

- advertises `Accept-Ranges: bytes`;
- accepts normal, open-ended and suffix byte ranges;
- returns `206 Partial Content` with `Content-Range` and the exact ranged `Content-Length`;
- returns `416 Range Not Satisfiable` with `Content-Range: bytes */<size>` for invalid ranges;
- uses R2 ranged reads instead of downloading the complete object for a ranged request;
- exposes the range response headers to the exact Studio origin;
- keeps Cloudflare Access JWT verification and the existing exact-origin credentialed CORS boundary.

No catalog, manifest, lyrics, SonicTrace analysis or media object is mutated by this change.

## Phase 6 behavior restored

In both standalone and embedded LRC Maker, selecting a timestamped line can drive the media element to that timestamp. In the embedded Studio workflow, the protected canonical audio endpoint can now satisfy the browser's seek/range requests instead of forcing a full-object response.

## Regression guard

`scripts/test-studio-protected-media-range.mjs` verifies:

- range parsing for explicit, open-ended and suffix ranges;
- invalid/multi-range rejection;
- `206`, `416`, `Accept-Ranges` and `Content-Range` contracts;
- R2 `offset`/`length` ranged reads;
- exact-origin CORS exposure of range headers;
- Access JWT verification still precedes the protected media route.

This is a Phase 6 stabilization hotfix only. Phase 7 remains out of scope.
