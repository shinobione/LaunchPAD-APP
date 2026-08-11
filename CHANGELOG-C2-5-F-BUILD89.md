# CHANGELOG — PHASE UX C2.5-F · Build 89

Release candidate: `2026.08.11.89`  
Codename: `phase-ux-c2-5-f-canonical-album-public-cutover-20260811`

## Added

- public Worker v2.7 canonical Album projection and read-only Album routes;
- public R2 Album cover/thumbnail streaming;
- explicit `albumAuthority: canonical-r2` handshake;
- canonical-only Album authority mode in the LaunchPAD catalog store;
- virtual Singles derived from tracks not claimed by canonical `album.trackIds`;
- deployment verification for public Albums, cover HEAD and existing audio Range behavior;
- dedicated C2.5-F regression guard.

## Changed

- LaunchPAD PWA cache namespace advances to `shinobi-launchpad-v89`;
- public Wrangler entry point advances from v2.6 to v2.7;
- public deploy workflow expects Worker v2.7;
- C2.5-B tests now remain historical/behavioral instead of freezing Build 88 forever.

## Preserved

- Track Manager stays v5.19 / Studio bridge v1.11;
- public track/audio/media logic remains delegated to the validated v2.6 ancestry;
- `catalog/index.json` remains schemaVersion 1 and rebuildable;
- no R2 write/delete is introduced by the public Worker;
- `catalog.js` remains a degraded/offline fallback and editorial source, but not Album authority when canonical R2 authority is available;
- mobile layout, player, Lyrics, Audio Lab, Canvas, Favorites and queue behavior are not redesigned;
- C3 and Phase 7 remain locked.

## Deployment

Build 89 Pages publication and public Worker v2.7 deployment are separate gates. The public Worker must be deployed manually with `target=public` only after the exact merged Build 89 head is green.

## Acceptance

Candidate only until real-user public smoke passes canonical Album rendering/order/covers, virtual Singles, Album playback and mobile regression checks.
