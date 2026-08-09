# PHASE UX C2.5-A — Era Play + Mobile Discoverability

Release candidate: LaunchPAD Build `2026.08.09.71`

Release key: `phase-ux-c2-5-a-era-play-mobile-20260809`

## Trigger

Real-user C2.5-A smoke confirmed the virtual Era queue worked once a track was started, but two UX gaps remained:

1. selecting an Era did not expose an explicit way to start the Era as a sequence;
2. on mobile the Era rail was visually cramped and did not clearly communicate that more Eras existed horizontally.

## Change

When exactly one Era is selected, the Era header now exposes `Play Era · N`.

The action is not a second playlist engine. It reuses the existing reconstructible `era:` queue context and starts at the first catalog track belonging to that Era. The action is hidden for `All eras` or any state without one unambiguous selected Era.

Mobile Era presentation now uses wider cards, horizontal snap, partial neighboring-card visibility, automatic centering after selection and an explicit `Swipe to explore eras →` affordance. Decorative motion is disabled under reduced-motion preference.

## Frozen boundaries

This slice is LaunchPAD frontend-only.

- no Worker source change;
- no Worker deployment;
- no R2 mutation;
- no `catalog/index.json` change;
- no canonical Album schema;
- no Album migration;
- no C2.5-B start;
- no SonicTrace C3 work;
- no PHASE UX final checkpoint;
- no Phase 7 work.

## Safety

Rollback ref before the slice:

`safe` / `safety/pre-c2-5-a-era-play-mobile-ux-20260809-2037`

Production base SHA:

`fd11212d89efc31c72cf7333132c6aff87119a71`

## Verification

The Albums/Era regression guard now requires:

- explicit Play Era visibility logic;
- reuse of `data-album-context` with the virtual `era:` ID;
- existing queue normalization to context type `era`;
- deterministic Next/Previous sequencing;
- mobile carousel snap and wider cards;
- visible swipe affordance;
- mobile centering of the selected Era.

CI, Pages deployment and real-user desktop/mobile smoke are still required before declaring Build 71 accepted.
