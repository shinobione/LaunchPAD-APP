# PHASE UX C2.5-A — Build 82 Mini-player Action Routing Hotfix

Status: IMPLEMENTED CANDIDATE — REAL-USER MOBILE SMOKE PENDING

## Release

- Build: `2026.08.10.82`
- Release: `phase-ux-c2-5-a-mini-player-action-routing-20260810`
- Cache: `shinobi-launchpad-v82`
- Safety checkpoint: `safety/pre-build82-mini-player-action-routing-20260810-0849`
- Feature branch: `hotfix/build82-mini-player-action-routing`

## Real-user regression observed in Build 81

On Android/mobile, the compact player Favorite (`♥`) and Queue (`≡`) controls visually reacted but did not execute their intended actions. Tapping either control navigated to the current track's Lyrics Studio instead, producing the characteristic page movement:

1. switch to Lyrics/Studio;
2. scroll to the top of the Lyrics view;
3. auto-scroll back to the currently active lyric line.

Favorite state was therefore not persisted and Queue never received ownership of the click.

## Root cause

`js/ui-polish-v62.js` installs a mobile click listener in the **capture phase** before `app-main.js`, `library-memory.js` and Queue UI are initialized.

The compact player container is intentionally marked `data-view-target="lyrics"` so tapping the track identity opens Lyrics. Favorite and Queue, however, are interactive buttons nested inside that same routed container.

The previous capture handler used the closest `[data-view-target="lyrics"]`, so a tap on either nested button matched the parent current-track container. It then called `preventDefault()` + `stopImmediatePropagation()` and forced `#studio=<trackId>` before Favorites or Queue could receive the click.

This explains both regressions with one event-routing conflict.

## Build 82 fix

The mobile Lyrics capture router now detects whether the original tap belongs to a nested interactive control.

Interactive descendants include buttons, links, inputs/selects/textareas, summary controls, explicit `[role="button"]` controls and editable elements.

If such a nested control exists inside the routed Lyrics surface, the capture router returns immediately **before** calling `preventDefault()` or `stopImmediatePropagation()`.

Result:

- tapping the current-track identity still opens Lyrics Studio;
- tapping Favorite remains owned by Library Memory;
- tapping Queue remains owned by Queue UI;
- transport or future embedded player controls cannot be promoted accidentally to the parent Lyrics action.

## Regression guard

`scripts/test-navigation-recovery.mjs` now requires:

- the nested-interactive guard to exist;
- the routed container vs nested control distinction;
- the escape guard to execute before the mobile route handler prevents/stops the click.

The existing Build 81 protections remain intact:

- Android Lyrics Studio Canvas source-disable;
- Track video decoder teardown on route exit;
- Queue stacking/focus protection;
- dynamic Favorites catalog membership.

## Scope / safety

Frontend-only LaunchPAD hotfix.

No changes to:

- Cloudflare Worker runtime;
- Track Manager v5.16 / Studio bridge v1.8;
- public Worker v2.6;
- R2 data or media;
- canonical Album model / C2.5-B;
- SonicTrace / C3;
- PHASE UX final checkpoint;
- Phase 7.

No Worker deployment is expected or authorized for this release.

## Required real-user smoke

After GitHub Pages publishes Build 82, verify on Android/mobile with a currently playing track (Lab-Grown Gold is the reported reproducer):

1. From Favorites or any other LaunchPAD view, tap the compact-player `♥`.
   - The current view must **not** change to Lyrics/Studio.
   - The heart state must toggle.
   - Opening Favorites must show the saved track.
2. Tap the compact-player `≡`.
   - The current view must **not** change to Lyrics/Studio.
   - Queue must open visibly above the current UI.
   - No `top → active lyric line` jump may occur.
3. Tap the non-control track identity area of the compact player.
   - Lyrics Studio must still open normally.
4. Repeat Favorite and Queue from within Lyrics Studio.
   - The actions must remain local to their buttons.

Build 82 remains a candidate until this exact real-device smoke passes.
