# LaunchPAD Build 128 — Windows GSMTC track artwork

Build: `2026.09.28.128`  
Cache: `shinobi-launchpad-v128`  
Release: `gsmtc-track-artwork-20260928`

## Fix

Windows/Chrome Media Session now receives the current track's actual cover instead of the generic LaunchPAD app icon. LaunchPAD uses the existing catalog `track.cover` thumbnail first (the WebP URL manually verified via Chrome → Windows GSMTC → SHINO // CONTROL), then `track.fullCover` if no thumbnail is present. Generic app icons remain the fallback for missing, malformed or rejected artwork. Artwork dimensions and MIME types are deliberately not guessed; Chromium can use the response metadata.

The primary HTML audio element remains the only playback authority. Existing Media Session commands and states are retained. Timeline updates are forced after `loadedmetadata`, `durationchange`, `seeked` and `ratechange`, while ordinary `timeupdate` updates remain throttled to roughly one per second.

## Boundaries

No Cloudflare Worker/R2 mutation, new API, new AudioContext, new native Windows integration, SHINO // CONTROL change or UI redesign. A Build 128 cache/service worker release makes the versioned Media Session module update reliably.

## Validation

`scripts/test-media-session.mjs` covers real-cover URL selection, title/artist, no invented dimensions, missing/invalid/rejected-cover fallbacks, playback state, commands, and forced position/duration refresh. It is wired into `npm run validate:media-regressions`. Manual end-to-end WebP display in SHINO // CONTROL was confirmed before implementing this persistent patch.
