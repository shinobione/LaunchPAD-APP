# LaunchPAD Build 90 — Canonical Album palette theme

Date: 2026-08-11
Release: `phase-ux-c3-album-palette-theme-20260811`

## Scope

Small public Album UX slice before resuming the pending C3-A Deep Audio real-user smoke.

Build 90 makes the already-canonical Album palette fields visible in the listener experience:

- `album.accent` becomes the public Album page primary theme color;
- `album.accent2` becomes the secondary theme color;
- both colors are scoped to `#view-album` and never replace the global LaunchPAD theme;
- the Album hero, artwork glow, metadata pills, Play Album CTA, Share CTA, track hover/current state, lyrics marker and play glyph inherit the scoped Album palette;
- missing or malformed palette values fall back to the existing LaunchPAD identity;
- 3-digit and 6-digit HEX input are normalized defensively before use.

## Safety / architecture

No Worker code, Worker version, R2 object, Album membership, track order, player logic, queue logic, Lyrics Studio logic or canonical catalog authority is changed.

Public Worker remains **v2.7** and Track Manager remains **v5.19 / bridge v1.11**.

The canonical model remains:

```text
album.accent   = primary release color
album.accent2  = secondary release color
```

Studio v0.13.2 · Build 40 provides the paired authoring UI with labeled color pickers and validated HEX editing.

## Roadmap status

- C2.5-A → C2.5-F: COMPLETE / real-user validated.
- C3-A Deep Audio: implementation candidate already exists; local-GPU real-user smoke remains pending.
- Phase 7: LOCKED / NOT AUTHORIZED.
