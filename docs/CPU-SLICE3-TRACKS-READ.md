# CPU corrective slice 3 — canonical Tracks collection

Date: 2026-09-26. Tracking: [LaunchPAD #283](https://github.com/shinobione/LaunchPAD-APP/issues/283), [Studio #238](https://github.com/shinobione/shinobiwan-studio/issues/238).

## Checkpoint and stop line

Implementation workspace: `LaunchPAD-CPU-TRACKS`, branch `fix/studio-tracks-cpu-read`. Preflight: clean worktree, HEAD and fetched `origin/main` both **`4dd420bd612555cdb972897b080549aacf408fa6`**, repository `shinobione/LaunchPAD-APP`, production branch `main`. No other worktree was edited.

GitHub reconciliation supersedes the older slice-1 candidate wording in README/ROADMAP:

- Backend slice 1 PR #284 is merged at that baseline. [Cloudflare validation](https://github.com/shinobione/LaunchPAD-APP/actions/runs/36256678366) and [Worker deployment](https://github.com/shinobione/LaunchPAD-APP/actions/runs/36257279295) succeeded. Mission-supplied deployed admin version: `28bbfd0a-bd4a-4962-8293-938b788e05b3`.
- Studio slice 2 PR #239 is merged at `9306ab4b6dafcce87c1bc68411719d01102612c0`; [Pages deployment](https://github.com/shinobione/shinobiwan-studio/actions/runs/36258902897) succeeded. Its local checkpoint still described a candidate; this receipt records the real state without changing the reference repository.
- Build117 remains the latest merged REAL USER PASS acceptance receipt. Build118 limited shell acceptance docs remain open in Studio #237. The mission reports successful lean Album reads but intermittent Tracks/SonicTrace 503s. Those latest 503s have no fresh tail correlation in this slice.

This slice is **backend implementation + synthetic validation only**. Stop at Draft PR and exact-head CI. No merge, deployment, subscription change, live R2 operation, catalog rebuild, Studio frontend change, SonicTrace optimization, commercial data or Blackhole work. Runtime identity stays TM v5.28 / bridge v1.18; no build is allocated. Exact candidate commit and CI results belong to the PR head/checks, not the deployed baseline above. No production CPU or REAL USER PASS claim.

## Execution-path audit

Line references below are candidate source locations; the original implementations are available at the pinned baseline SHA.

| Component | Finding |
| --- | --- |
| `01-runtime.part:111–124,208–234` | Both authenticated `/api/studio/tracks` and admin `/api/tracks` reach the same collection function. One full `tracks/` and one `media/` enumeration, then summaries, sorting, quality/lyrics, legacy grouping and totals. |
| `02-catalog.part:193–220` | Base summaries GET/parse/normalize every discovered manifest, build asset states once and sum bytes. Before this change, every valid Track filtered the entire canonical object array. |
| `03c-feature-11-sorting-server.part:53–70` | The active sorting wrapper reread/parsed/normalized every valid manifest solely to enrich sort/metadata fields. It delegates to the base summary builder, then keeps the existing feature-11 comparator. |
| `03b-lyrics-summary.part:12–36` | The active quality wrapper reread/parsed/normalized every valid manifest again and filtered the entire object array again. It retains full `inspectTrackQuality` and projects quality counts, publication state, synchronization and lyrics status. |
| `03a-quality.part:81–259,268–285` | Quality inspection runs **once**, not twice. Its older enrichment function is replaced by `03b`; the quality inspector remains active. Lyrics GET/parse occurs once where declared/listed and within the size bound. Asset-key maps are separately built by summary and quality; quality's orphan/duplicate scans operate on scoped objects. These checks are retained. |
| `03-z2-album-projection-hook.part:30–52` | The inner collection wrapper parses the base JSON response, enumerates `albums/`, reads normalized Album manifests, reconstructs asset evidence/totals and serializes again. One Album reconstruction per request; no migration dry-run here. Retained. |
| `03i-build108-catalog-generation-identity.part:40–88` | The outer wrapper reads `catalog/index.json` once in parallel with the Track/Album branch, parses it for generation/provenance fields, then reparses/reserializes the collection. Retained, including missing/invalid/error semantics. |

Final generated bundle order is base `listTracks` → Album wrapper → catalog-generation wrapper (outermost). Base summary → feature-11 sorting wrapper; `03b` replaces the older `03a` enrichment. The v5.20 assembler replaces `readManifest` with stable R2 revision normalization. Later v5.28 assembly adds private asset SHA-256 evidence. Tests execute the **final v5.28 bundle**, not isolated source parts.

### Before

```text
Access JWT + exact Studio origin
  → generation wrapper ┬─ catalog index GET/parse (identity only)
                       └─ Album wrapper
                          → base collection
                            → list tracks/ + media/ (bounded pagination)
                            → each manifest GET/parse/normalize
                              + full object-array filter + asset state + byte total
                            → sort enrichment: manifest GET/parse/normalize again
                            → quality enrichment: manifest GET/parse/normalize again
                              + full object-array filter + full quality + lyrics GET
                            → legacy groups + Track totals → JSON response
                          → parse → list/read Albums + evidence/totals → JSON response
  → parse + generation state → JSON response → Studio CORS
```

### After

```text
Same route, wrappers, enumeration, legacy/Album/generation/provenance behavior
  → base collection creates local { manifests, objectsBySlug }
  → one object pass indexes exact path prefixes, preserving order and metadata
  → base summaries read/normalize each manifest once and retain it locally
  → sorting reuses that manifest
  → quality reuses that manifest and its indexed object scope
    → unchanged full quality inspection, lyrics read and status computation
  → unchanged totals and three JSON response constructions
```

For T valid manifests and O canonical objects, successful normal collection reads remove **2T manifest GETs/parses/normalizations** and **2T full O-object filters**. The index processes O objects (and each object's path ancestors, retaining historical nested-prefix semantics). This is per-invocation work; request concurrency does not explain it away.

## Bounded implementation and semantics

Only four runtime source parts change. `createTrackCollectionReadContext` is called inside the collection function after successful enumeration. Its maps never escape the request, are never stored globally/on a bucket, and never become response fields. Optional context arguments retain the old behavior for callers outside this collection. Detail reads, writes and their reread/rollback/publication safeguards do not receive the context.

The metadata, sort enrichment and quality stages now use the **same normalized manifest observed during this request**, as authorized by the mission. This does not provide an atomic snapshot across R2 objects: listings, manifests, lyrics, Albums and catalog can still change during a request. A concurrent manifest update between the old redundant GETs previously could mix revisions; the candidate retains the first observed manifest for those stages and reads fresh on the next request. It does not cache between requests or turn collection data into write-causality proof. Eliminated second/third GETs naturally cannot introduce their former additional transport failures; failures on retained operations preserve their existing handling.

Malformed/missing Track manifests retain the baseline skip behavior; missing declared assets remain absent, quality blockers remain blockers, missing/invalid catalog projection stays explicit. Thrown manifest/list/catalog reads retain error responses. Lyrics failures retain invalid quality evidence. There is no silent public fallback, fabricated empty success, retry or mutation.

The admin `/api/tracks` alias shares the optimization and exact output contract. The separate public Worker and public projection are unchanged. Track creation identity remains private detail evidence where the baseline exposes it; this slice does not add it to collection summaries or public projections. Existing private Album creation identity and asset digests remain intact.

## Independent compatibility evidence

`scripts/fixtures/studio-tracks.mjs:buildBundles` uses `git archive` of the full pinned baseline `cloudflare` and `scripts` trees and builds it independently in ignored `dist`. It never reverses candidate edits to manufacture a baseline. The CI checkout fetches history so this comparison is mandatory in `validate:cloudflare`, not optional.

The **39-scenario** focused suite compares exact serialized bytes, status and all headers with a fixed clock. It covers mixed published/draft/archived/incomplete Tracks, timestamps and stable stale-metadata revisions, malformed/null/empty/missing manifests, nested historical manifest paths, declared/missing/orphan/duplicate assets, all four lyrics states, quality blockers, legacy coexistence, Album order/projections/totals/private identity, generation identity and invalid/missing projection state, multi-page enumeration, overflow, selective R2 failures, unauthorized/expired/wrong-audience/origin denial, private and admin collection/detail routes, reused Worker and reused bucket freshness, concurrent isolation and zero mutations. Signed synthetic JWTs use real verification against local JWKS; every other network fetch fails.

The generated-bundle gate permits differences only in the four audited collection functions plus the new local-index helper. Every other generated byte, including auth/CORS, error mapping, detail/write paths, wrappers and embedded UI, must match baseline. Existing Build109/114/117 and canonical public cutover tests retain privacy/projection guards. No production/private commercial fixture is used.

## Local performance

Raw reproducible output: [CPU-SLICE3-TRACKS-PROFILE.json](CPU-SLICE3-TRACKS-PROFILE.json). Identical synthetic fixtures per baseline/candidate pair; three warmups, nine observations; Node v24.19.0 on Windows x64. Counters are collected separately from timings.

| Tracks / Albums | All object GETs before → after | Manifest GETs / normalizations before → after | Canonical filter element visits before → after | Payload bytes, identical |
| --- | ---: | ---: | ---: | ---: |
| 45 / 7 | 176 → 86 | 135 → 45 | 30,600 → 2,250 | 141,527 |
| 250 / 25 | 956 → 456 | 750 → 250 | 886,992 → 12,492 | 761,912 |
| 1,000 / 70 | 3,786 → 1,786 | 3,000 → 1,000 | 14,050,000 → 50,000 | 3,003,487 |

Canonical filter visits count all array-filter inputs starting with Track object metadata, including scoped quality checks. The candidate additionally indexes 315 / 1,749 / 7,000 canonical objects once. Both versions retain three R2 prefix traversals, 3 / 4 / 9 list pages, 345 / 1,851 / 7,282 listed objects, one Album summary build, one quality inspection and asset-state construction per Track, three JSON response constructions, and zero writes/heads/migration calls.

| Fixture | Median local wall ms before → after | Median local process CPU ms before → after |
| --- | ---: | ---: |
| Small | 28.566 → 11.335 | 31 → 16 |
| Medium | 406.284 → 43.178 | 423 → 47 |
| Large | 5,042.332 → 192.022 | 5,063 → 235 |

These timings include mock R2 copies/filtering, JWT verification, JSON, GC and scheduler noise. Windows process CPU has coarse accounting. They are **not Cloudflare invocation CPU and do not prove Workers Free 10 ms compliance**. No timing threshold substitutes for response parity. Local reductions establish removed work, not incident resolution.

## Validation receipts

- Focused parity/measurement guard: 39 scenarios, PASS; local profiler asserts parity at all three scales.
- Full `validate:cloudflare`: PASS, including Build108/109/114/115/116/117, fresh-draft assets, Album guarded writes/transactions/migration/lean reads, migration edge fetch, canonical public cutover, private/SonicTrace/Lyrics bridges, quality, lyrics badges, protected media and remaining inherited guards.
- Initial raw Windows run hit the existing LF-specific extraction assertion in `test-studio-protected-media-range.mjs`. The unchanged `.part` was temporarily normalized to committed LF for the complete rerun, then restored byte-for-byte; Git confirms no diff. No test assertion was weakened. Linux exact-head CI is the native committed-source check.
- Pinned Wrangler 4.118.0 dry runs: public and admin PASS. Initial sandbox esbuild ancestor-read restriction was resolved by an authorized local-only retry. Admin size 568.27 KiB / gzip 135.45 KiB; no deployment.
- Canonical Album read model, build docs, deployment topology, repository cleanliness and diff whitespace checks: PASS.
- Exact-head GitHub results: see the Draft PR checks and closeout, which identify the tested head. CI green is separate from merged, Worker deployed, R2/catalog mutated and REAL USER PASS.

## Reproduction

```text
npm ci
npm run check:studio-tracks-cpu-read
node scripts/profile-studio-tracks.mjs dist/tracks-profile.json
npm run validate:cloudflare
npm run check:wrangler
```

Run from this repository root with the pinned baseline Git object available (`fetch-depth: 0` in CI). Baseline archives and generated bundles stay in ignored `dist`; no other worktree is used.

## Changed files and remaining risks

Runtime: `01-runtime.part`, `02-catalog.part`, `03b-lyrics-summary.part`, `03c-feature-11-sorting-server.part`. Test infrastructure: shared Album fixture adds optional path/instrumentation hooks; new Track fixture, focused test and profiler; package scripts and Cloudflare CI history depth. Documentation: this receipt, raw profile, README and ROADMAP checkpoint headings.

Remaining CPU work: unbounded-by-Track-count collection output within the existing 20-page cap, full required quality/lyrics work, two scoped key-map constructions, legacy enumeration, per-Album filtering/reconstruction, full catalog-index parsing and three response serializations/two parses. The local index also retains object references for nested ancestors until request completion. These are recorded risks, not permission to widen this slice. SonicTrace and frontend request multiplicity remain untouched.

Next: review the Draft PR and exact-head CI. Separately authorized deployment and controlled real-browser/Worker CPU measurements are required to determine whether this bounded correction provides sufficient production headroom. The overall incident remains open.
