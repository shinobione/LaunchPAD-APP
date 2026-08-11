# PHASE UX · C2.5-E1 — Track Manager v5.18 / Studio bridge v1.10

Status: **CANDIDATE — tooling only, no production Album migration performed.**

## Purpose
Prepare the controlled migration of the three historical release Albums from LaunchPAD's legacy presentation model into first-class canonical R2 Album objects.

## Included
- immutable migration plan for `neon-heartbreaks`, `coal-to-diamond`, and `love-letters-from-saigon`;
- live R2 dry-run based on current track manifests and current canonical Album ownership;
- stale state token between dry-run and apply;
- explicit artistic-order confirmation when current sequence/order/position data cannot prove a unique order;
- one-Album-at-a-time apply only;
- cover import pinned to an immutable GitHub SHA;
- canonical Album reread + publish quality verification;
- rollback of new Album manifest, imported cover and the exact pre-migration `catalog/index.json` body;
- zero normal track-manifest churn when existing compatibility caches already match;
- `Singles` explicitly excluded from canonical Album creation in C2.5-E;
- Track Manager candidate v5.18 / Studio bridge v1.10 with `album-migration` management capability.

## Safety boundaries
This candidate does **not**:
- migrate any production R2 Album by itself;
- auto-run migration during deploy or CI;
- provide a batch `Migrate all` operation;
- expose a whole-Album delete API;
- change the public Worker v2.6;
- change LaunchPAD public Build 88 behavior;
- convert `Singles` to its future virtual collection model;
- start C2.5-F, SonicTrace C3, final PHASE UX closeout, or Phase 7.

Production apply remains a separately authorized real-user operation after a read-only dry-run has been reviewed.
