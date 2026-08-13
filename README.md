# SHINOBIWAN LaunchPAD

Installable music PWA for the SHINOBIWAN catalog: playback, Albums, synchronized lyrics, Audio Lab visuals, favorites, queues, Track DNA, Canvas/Studio experiences and shareable track cards.

## Current accepted state

```text
LaunchPAD           2026.08.12.102 · C3-C REAL USER PASS
Public Worker       v2.7
Public Worker ID    ddd90621-35d4-44b0-9c22-4e5a72291d9b
Track Manager       v5.20
TM Worker ID        78609aff-1f4a-4a21-b618-cb97add0c416
Studio bridge       v1.11
Studio              v0.19.2 · Build 62 · Studio Focus program closeout REAL USER PASS
Track-To-Market     v0.1.5 · Bridge V2 · REAL USER PASS
SonicTrace          V2-E Build 08 · REAL USER PASS
Deep Audio          2.0.3-alpha
LRC Maker           6.3.8
```

Build 102 remains the accepted LaunchPAD public baseline. Track Manager v5.20 is a service correction paired with the accepted Studio closeout; it does **not** create a new LaunchPAD public build. Public Worker v2.7 was not redeployed during that rollout.

Track Manager v5.20 deployment record:

```text
LaunchPAD main      586c71333c902fc2ebef214c63e9234ece9e1711
Workflow run        31714222431
Track Manager       v5.20
Studio bridge       v1.11
TM Worker ID        78609aff-1f4a-4a21-b618-cb97add0c416
Public Worker       unchanged v2.7
```

## Accepted product state

### PHASE UX C2.5

**C2.5-A → C2.5-F is COMPLETE and real-user validated.**

Preserved outcomes include scalable Album presentation, canonical R2 Album data, Studio Album Management, controlled historical Album migration, LaunchPAD canonical Album presentation and virtual Singles semantics.

See:

- [`docs/PHASE-UX-C2-5-CLOSEOUT.md`](docs/PHASE-UX-C2-5-CLOSEOUT.md)
- [`docs/PHASE-UX-C2-5-F-REAL-USER-SMOKE-PASS.md`](docs/PHASE-UX-C2-5-F-REAL-USER-SMOKE-PASS.md)
- [`CHANGELOG-C2-5-CLOSEOUT.md`](CHANGELOG-C2-5-CLOSEOUT.md)

### C3

C3-A Deep Audio, C3-B Catalog Intelligence / V2-E parity and C3-C Premium Feel are **COMPLETE — REAL USER PASS**.

Accepted public baseline: **Build 102**.

Build 102 keeps the 1080 × 1080 Visual Card export flow deterministic for Share / Download / Copy and provides visible success/info/error feedback. The final real-user Visual Card smoke passed on 2026-08-12.

See:

- [`docs/PHASE-UX-C3-C-CLOSEOUT.md`](docs/PHASE-UX-C3-C-CLOSEOUT.md)
- [`docs/PHASE-UX-C3-C-REAL-USER-SMOKE-PASS.md`](docs/PHASE-UX-C3-C-REAL-USER-SMOKE-PASS.md)
- [`docs/PHASE-UX-C3-C11-BUILD102-VISUAL-CARD-FEEDBACK.md`](docs/PHASE-UX-C3-C11-BUILD102-VISUAL-CARD-FEEDBACK.md)

## Studio / Phase 7 handoff

```text
LaunchPAD C3-C          Build 102 REAL USER PASS
Track-To-Market Build45 Bridge V2 REAL USER PASS
Phase 7-A               Studio Build 46 REAL USER PASS
Phase 7-B               Studio Build 51 REAL USER PASS
Studio Focus Slice 1    Studio Build 53 REAL USER PASS
Studio Focus Slice 2    Studio Build 56 REAL USER PASS
Studio Focus Slice 3    Studio Build 58 REAL USER PASS
Studio Focus Slice 4    Studio Build 61 REAL USER PASS
Studio Focus closeout   Studio Build 62 REAL USER PASS
Track Manager           v5.20 · Studio bridge v1.11
Phase 7-C               CLOSED / NOT STARTED
```

Studio Focus closeout acceptance includes the final Visuals palette save smoke on `Magnetic Midnight`, stable palette layout, `Album track` artist-facing wording and `Sonic` workflow wording.

## Data contracts — quick reference

Albums:

```text
albums/<album-id>/manifest.json
```

Ordered `album.trackIds` owns Album membership and artistic order. Virtual Singles remains isolated from canonical Album manifests.

Lyrics:

```text
tracks/<slug>/lyrics.txt
```

Recognized timestamps inside `lyrics.txt` define synchronization. `.lrc` remains optional compatibility/export only.

SonicTrace:

```text
tracks/<slug>/analysis/sonictrace/latest.json
tracks/<slug>/analysis/sonictrace/history/<analysisId>.json
```

## Product roles

- LaunchPAD — public listener experience.
- Studio — artist production cockpit/orchestrator.
- Track Manager — canonical track/Album management service.
- SonicTrace — audio intelligence.
- LRC Maker — lyrics synchronization.
- Cloudflare R2 — canonical catalog/media/data store.

The same R2 track slug is used as canonical `trackId` across the toolchain.

## Audio Lab / player baseline

The accepted Build 102 lineage preserves native HTML5 audible playback, decoded-buffer visual metering, the accepted Audio Lab preset set, queue/favorites/seek/loop behavior and the C3-C responsive player/navigation cleanup.

Historical per-build detail remains in dedicated docs and Git history rather than being duplicated here.

## Acceptance policy

**CI GREEN ≠ DEPLOYED CANDIDATE ≠ REAL USER PASS.**

Real-user acceptance is recorded only after the deployed behavior is actually exercised. Phase 7-C remains **CLOSED / NOT STARTED**.
