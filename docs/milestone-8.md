# Milestone 8 — SVG icons and badge hierarchy

## Unified icon system

- Inline SVG only, `currentColor`, homogeneous 1.8 stroke.
- Main navigation, player, route, share and visual-switcher controls are normalized.
- Minimum click/tap target: 40 px desktop, 44 px mobile.
- Icons are decorative (`aria-hidden`) while controls retain explicit labels.

## Badge hierarchy

1. **Status** — CLEAN, EXPLICIT, LYRICS, LYRICS SYNCED, VIDEO, UPCOMING. DRAFT appears only in Track Manager.
2. **Parent genre** — exactly one editorial parent genre.
3. **Secondary tags** — maximum three visible tags followed by `+X`; technical Spotify Canva/R2/thumbnail tags are removed.

## Track Manager

- Version 5.7.
- Same SVG language and three-level badge hierarchy.
- Automatic Cloudflare deployment and verification after merge to `main`.

## Runtime

- Public application Build 35 / PWA cache v35.
