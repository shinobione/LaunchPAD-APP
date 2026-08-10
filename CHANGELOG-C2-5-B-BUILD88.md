# C2.5-B · Build 88

Release: `2026.08.10.88` · `phase-ux-c2-5-b-canonical-album-read-model-20260810`

## Added
- Canonical Album schema normalizer for Album / EP / Collection.
- Canonical Album read precedence with legacy `catalog.js` fallback.
- Ordered `album.trackIds` membership/order semantics.
- Optional browser hydration from an additive `albums[]` catalog payload.
- Private Track Manager R2 Album read model and asset state.
- Additive Album projection in `catalog/index.json` while preserving `schemaVersion: 1`.
- Regression guard `scripts/test-canonical-album-read-model.mjs`.

## Preserved
- Build 87 real-user validated touch/player/mobile behavior.
- Build 86/85 media and Studio loop protections.
- Existing public Worker API surface.
- Track Manager v5.16 / Studio bridge v1.8 production deployment until separately authorized.
- Existing track manifests and `lyrics.txt` contract.
- Legacy Albums and Singles fallback.

## Not included
- No Album create/edit/delete/reorder write route.
- No Album asset upload route.
- No R2 Album migration.
- No Singles conversion.
- No public canonical Album cutover.
- No C3 SonicTrace Deep Audio work.
- No Phase 7 work.
