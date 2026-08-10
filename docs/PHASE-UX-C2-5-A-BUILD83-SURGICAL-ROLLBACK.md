# PHASE UX C2.5-A — Build 83 surgical rollback

**Status:** IMPLEMENTED CANDIDATE — CI / REAL-USER ANDROID SMOKE PENDING  
**LaunchPAD build:** `2026.08.10.83`  
**Release:** `phase-ux-c2-5-a-surgical-rollback-20260810`  
**Cache:** `shinobi-launchpad-v83`  
**Safety checkpoint:** `safety/pre-build83-surgical-rollback-20260810-0928`  
**Feature branch:** `fix/build83-surgical-rollback`

## Why Build 83 exists

Real-user smoke proved two regressions survived Builds 78–82:

1. Favorite and Queue actions in the mobile mini-player were still promoted to the parent Lyrics/Studio route.
2. Lyrics Studio Canvas had accumulated multiple media owners and recovery strategies; on Android this produced loop failure, poster/cover fallback, buffering and media contention.

Git history identified the architectural pivots rather than only the latest symptoms:

- Build 62 made the whole mobile Lyrics surface aggressively route to Studio in capture phase while `.current-track` itself was also a `data-view-target="lyrics"` container.
- Build 49 added autoplay/retry/lifecycle/manual-loop recovery around a video that already had a native loop.
- `smart-canvas.js` also still registered the Lyrics Studio video and could independently pause/play/release its source.

Build 83 therefore rolls back **only those ownership decisions** while preserving the modern UI and all validated later functionality.

## Mini-player routing contract

The full `.current-track` container is no longer a route target.

Only `.current-track-identity` — the cover + title/metadata area — owns `data-view-target="lyrics"`.

Favorite and Queue controls are siblings of that route target. They no longer depend on event-propagation exceptions to remain functional.

The temporary Build 82 nested-interactive routing workaround has been removed.

Expected behavior:

- cover/title → Lyrics Studio on mobile;
- Favorite → toggle favorite in place;
- Queue → open Queue in place;
- transport controls → remain transport controls.

## Lyrics Studio Canvas contract

Build 83 restores the simple pre-Build-49 media ownership model inside the current Studio UI:

- one `<video class="lyrics-studio-canvas-video">`;
- direct canonical `track.video` source;
- `muted`;
- `playsInline`;
- native `loop=true`;
- `preload='none'`;
- one explicit `playCanvas()` entry point;
- no Blob transport;
- no manual `ended` loop;
- no retry timer;
- no `waiting`/`stalled` recovery;
- no `loadeddata`/`canplay` replay;
- no `pageshow`/`visibilitychange` replay;
- no Canvas pause/resume coupled to canonical audio seeking;
- no Android-specific source disable.

The modern Studio route, responsive layout, collapsed mobile track panel, poster/cover presentation and Build 77 single-commit audio seek are preserved.

## Smart Canvas ownership

`smart-canvas.js` now manages only:

`video.track-video-player`

It no longer registers or releases `video.lyrics-studio-canvas-video`.

This makes Lyrics Studio the **single owner** of its Canvas media element.

## Preserved boundaries

Build 83 does **not** modify:

- canonical audio source or Range backend;
- canonical `lyrics.txt` contract;
- Track Manager / Studio bridge;
- public media Worker;
- Cloudflare Access;
- R2 data;
- Album schema / C2.5-B;
- SonicTrace backend / C3;
- Phase 7.

No Worker deploy and no R2 mutation are required.

## Regression guards

CI must now fail if any of the following return:

- `.current-track` itself becomes `data-view-target="lyrics"`;
- Build 82 nested-interactive workaround becomes necessary again;
- Blob transport / `URL.createObjectURL()` for Lyrics Studio Canvas;
- local Canvas recovery timers;
- manual `ended` loop;
- `waiting` / `stalled` recovery;
- Canvas/audio seek coupling;
- Android `MOBILE SAFE VISUAL` source disable;
- Smart Canvas registering Lyrics Studio Canvas.

## Required real-user smoke

On Android with a track that has synchronized lyrics and a Canvas:

1. confirm Build `2026.08.10.83`;
2. from Favorites, click the mini-player Favorite control — remain on Favorites and see the track enter/leave the list;
3. click mini-player Queue — Queue opens without Lyrics/Studio navigation or scroll jump;
4. click only cover/title — Studio opens intentionally;
5. in Studio, verify Canvas is visible again;
6. let Canvas complete at least five native loops;
7. confirm no black frame → poster/cover takeover at loop boundary;
8. perform several slider seeks and timestamp-line seeks;
9. confirm audio transport and lyrics remain responsive;
10. verify Track page video still loops normally.

Until this smoke passes, Build 83 remains a candidate and the final PHASE UX checkpoint remains uncreated.

## Stop lines

- C2.5-B+: unchanged / not advanced by this hotfix.
- C3 SonicTrace engine work: unchanged / suspended.
- Final PHASE UX checkpoint: **NOT CREATED**.
- Phase 7: **NOT STARTED**.
