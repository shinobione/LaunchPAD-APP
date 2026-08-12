# PHASE UX / C3-C — CLOSEOUT CANDIDATE

Updated: 2026-08-12

Current LaunchPAD candidate: `2026.08.12.102`  
Current Studio companion: `v0.15.0 · Build 44`

## Purpose

C3-C is the cross-app interaction-quality / premium-feel slice. It does not change canonical data authority or invent a second workflow engine. The sequence from LaunchPAD Build 91 through Build 102 is deliberately documented here because real-user review materially changed the implementation several times.

## Real-user progression

### Build 91

Initial restrained premium layer. Real-user result: **NOT ACCEPTED — too subtle**.

### Build 92

Made press/release, bloom, player pop and card depth clearly perceptible. Real-user result: interaction became visible, but click bloom was too strong and route transitions were not actually replaying.

### Build 93

Reduced click bloom and removed persistent Audio Lab preset halo. Real-user result: **glow accepted**, route transitions still absent.

### Build 94

Introduced explicit route replay. Real-user result: transitions became visible but were too violent/jittery; `Open project →` also needed a text-link-specific treatment.

### Build 95

Replaced the heavy transition with a clean fade + short translate, tightened desktop/mobile layout, improved Album scalability, Audio Lab sizing, Eras overflow and Show/Hide Tracks integration. Real-user result: broad layout/feel accepted; Lyrics remained wrong.

### Build 96

Restored normal Lyrics auto-scroll and viewport-contained reader behavior. Real-user result: **accepted** (`NIQUELLE`).

### Build 97

Mobile cleanup: removed Home `Recently added`, stabilized mobile Album expansion and replaced the native white Lyrics picker with a bounded dark picker. Real-user result: layout improved, but mobile responsiveness still felt slow.

### Build 98

Moved critical mobile interaction wiring ahead of catalog wait and reconciled Track Detail Moods/Themes early. It did not fully solve perceived mobile latency or the player spinner ownership problem.

### Build 99

Moved the playback fix to `audio-readiness` and suppressed expensive premium motion on touch/coarse-pointer devices. Real-user result: faster menu response, but a boot ownership race made the drawer close itself; pinch zoom and desktop transport focus chrome also needed correction.

### Build 100

Established single-owner mobile menu state, preserved an already-open drawer during module takeover, locked application pinch zoom and removed unintended rectangular desktop bottom-player chrome.

### Build 101

Extended the same player-chrome cleanup to sidebar mini-player Previous/Next. Real-user result: **accepted** (`okay pour les sale carrés`).

### Build 102

Visual Card final interaction corrective:

- pre-encodes the 1080 × 1080 PNG before the Share gesture;
- invokes native file sharing immediately from the user click where file sharing is supported;
- explicitly falls back to PNG download otherwise;
- gives `Shared ✓`, `Downloaded ✓` and `Copied ✓` feedback;
- prevents duplicate legacy action execution;
- keeps the existing CORS-safe artwork export path.

## Current acceptance boundary

All exact-head and post-merge automated gates for Build 102 are green, including LaunchPAD validation/Chrome smoke, horizontal overflow, Worker validation/Wrangler dry-run and GitHub Pages deployment.

**C3-C is not yet marked COMPLETE.** One final real-user Visual Card check remains when the user returns:

1. Share image opens native share where supported or clearly reports the PNG fallback;
2. Download PNG produces one download and visible acknowledgement;
3. Copy track link produces visible acknowledgement and the current canonical Track route;
4. cancelling Share is not treated as an error;
5. the previously accepted mobile menu, player, Lyrics and layout behavior remains intact.

## Safety / rollback

Latest pre-Visual-Card checkpoint:

` safety/pre-build102-visual-card-feedback-20260812-0220 `

Phase-7 authorization boundary checkpoint:

` safety/pre-phase7-authorized-20260812-0230 `

Build 102 merge:

` b68e1343efffc669ab65c671c2c02813e64c5f13 `

## Frozen boundaries

Through Build 102, C3-C has not changed:

- canonical R2 Track/Album authority;
- Track Manager write authority;
- public Worker runtime version;
- SonicTrace engine/schema;
- LRC Maker canonical Lyrics contract;
- Album membership/order semantics;
- queue/favorites/seek/loop/shuffle/repeat semantics;
- Audio Lab signal engine.

## Phase 7 handoff

The user explicitly authorized beginning Phase 7 on 2026-08-12 while this last Visual Card real-user check remains pending. Phase 7 work must therefore start from the separate `safety/pre-phase7-authorized-20260812-0230` boundary and must not rewrite C3-C history as accepted before the pending Visual Card smoke is actually performed.
