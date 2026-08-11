# CHANGELOG — PHASE UX / C3-C.1 — LaunchPAD Build 92

Build: `2026.08.11.92`
Release: `phase-ux-c3-c1-premium-feel-20260811`
Date: 2026-08-11

## Context

Build 91's premium interaction pass was technically clean but failed real-user perception: the difference was described as minimal and not convincingly premium.

Build 92 is the corrective slice. It makes feedback materially more visible while keeping all application behavior unchanged.

## Added

- stronger shared C3-C.1 motion/easing tokens;
- durable pointer press/release classes;
- pointer-position cyan/violet click bloom;
- spring pop on player controls and play overlays;
- stronger CTA hover/press depth;
- illuminated active nav/filter treatment;
- stronger interactive card lift/depth;
- track/queue row micro-travel;
- stronger input focus treatment;
- deeper route-entry transition;
- keyboard Enter/Space presentation feedback;
- explicit reduced-motion fallback;
- Build 92 regression test;
- PWA shell caching for Build 92 CSS + JS;
- dedicated rollback checkpoint `safety/pre-c3-c1-premium-feel-build92-20260811-2029`.

## Preserved

- player/queue/loop/seek behavior;
- favorites behavior;
- routing ownership;
- Album authority and palette semantics;
- Workers and R2;
- Track Manager;
- SonicTrace;
- Lyrics Studio;
- Audio Lab signal logic;
- Phase 7 STOP.

## Acceptance status

Automated validation: pending at branch creation.
Real-user smoke: pending.

C3-C must not be marked complete until Build 92 is perceptibly premium in the live LaunchPAD and the user explicitly accepts the feel.
