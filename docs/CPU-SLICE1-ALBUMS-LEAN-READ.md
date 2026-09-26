# CPU corrective slice 1 — canonical Albums collection read

Candidate receipt, 2026-09-26. Tracking: [LaunchPAD #283](https://github.com/shinobione/LaunchPAD-APP/issues/283), [Studio #238](https://github.com/shinobione/shinobiwan-studio/issues/238).

## Checkpoint and stop line

- Implementation workspace: `C:/Users/jerry/OneDrive/Documenten/GitHub/LaunchPAD-CPU-FIX` only.
- Branch: `fix/studio-albums-lean-read`, targeting `LaunchPAD-APP/main`.
- Clean starting HEAD and live GitHub main: `4867a2fef673028b0474f949183944dd642af165`.
- Baseline backend: Track Manager v5.28 / bridge v1.18, Build117. Admin deployment run [35435618374](https://github.com/shinobione/LaunchPAD-APP/actions/runs/35435618374) succeeded at that SHA; public Worker step skipped. Baseline main Worker CI [34902849668](https://github.com/shinobione/LaunchPAD-APP/actions/runs/34902849668) and Pages [34902849850](https://github.com/shinobione/LaunchPAD-APP/actions/runs/34902849850) succeeded.
- Last fully recorded cross-stack REAL USER PASS: Build117. Studio's local checkpoint is stale relative to GitHub main `b035fb226e8c9a2654306076522faa4da97fb3ea`; issues #238/#283 record the later CPU incident. No Studio checkpoint or frontend was changed in this backend slice.
- No new release/build number allocated. Existing runtime version strings remain inherited; this candidate is identified by its branch, PR and exact commit SHA. It is not a deployed or accepted release.
- Stop after local validation, commit, Draft PR and exact-head CI. No merge, deployment, live R2 access, migration apply, catalogue rebuild, subscription change or private V5 data.

## API and execution paths

| Request | Response and work |
| --- | --- |
| `GET /api/studio/albums` | Existing `{ ok, albums, totals, migration }`; unchanged full migration dry-run. |
| `GET /api/studio/albums?view=full` | Same full contract, explicitly selected. |
| `GET /api/studio/albums?view=canonical` | `{ ok, albums, totals }`; migration is omitted, not represented as empty/completed. |
| Empty, unknown or repeated `view` | Existing JSON input-error handling, HTTP 400, before bucket access. |

Both views first pass the existing Access JWT verification and exact Studio origin check. Existing CORS, private/no-store headers, error mapping and preflight behavior are unchanged. Selectors use decoded, case-sensitive URL parameter values; duplicate decoded `view` keys are rejected. Unrelated query parameters retain existing behavior. The selector only applies to collection GET; it grants no capability on POST.

**Before / default full:** authenticated route → `listAlbums` migration wrapper → base canonical Album list/summaries/totals → serialize/parse base response → second Album enumeration and reconstruction + Track-prefix enumeration and manifest reads → migration ownership/candidate ordering + three state tokens → full JSON response.

**Explicit canonical:** same authenticated route → validated selector → existing pre-migration canonical list function → one Album enumeration and summary construction → canonical JSON response. No Track enumeration/reads, migration builder, ownership reconstruction, historical tokens or base-response parse/reserialization.

The implementation reuses the existing canonical function captured by `listAlbumsBeforeC25EMigration`. It introduces no alternative Album projection or authority. It preserves all normalized fields, private creation identity, membership/order, status, dates/null year, editorial metadata, colors, artwork references and object evidence, sorting and totals. Missing/invalid manifests are skipped under the existing policy; missing artwork remains explicitly absent. Listing/get failures and pagination overflow retain HTTP 500 rather than fabricating an empty successful collection. The existing 20-page limit and per-Album object filtering remain unchanged.

## Consumers and compatibility

Reference-only Studio inspection found `src/services/album-admin-api.ts:getAdminAlbums()` and `src/services/album-migration-api.ts:getAdminAlbumMigrationDryRun()` both request the default endpoint. The migration consumer requires `migration.mode === 'dry-run'`; the unchanged default continues to provide it. Album health, management, visual discovery and deletion verification inherit the default read today. No frontend opt-in is included, so this slice alone does not reduce their production request cost.

Migration POST still dispatches by `album-migration-apply-v1`, recomputes its own fresh dry-run, validates confirmation/state token/membership, and retains publication, canonical reread and rollback guards. Its implementation and the existing migration regression test were not changed. Apply tests operate only on in-memory fixtures.

## Local performance evidence

The independently built pre-change bundle and candidate ran on identical synthetic object maps. Fixture contents are generated in `scripts/fixtures/studio-albums.mjs`: mixed Album types/statuses, explicit membership ordering, artwork including a declared missing cover, metadata, one private creation identity, and Tracks with six objects each. No production data is loaded.

Raw observations: [CPU-SLICE1-ALBUMS-PROFILE.json](CPU-SLICE1-ALBUMS-PROFILE.json). Default candidate full responses matched baseline exactly except the expected `migration.generatedAt` clock value. Object counts and payload bytes also matched.

| Albums / Tracks | Manifest GETs full → canonical | List pages full → canonical | Listed objects full → canonical | Payload bytes full → canonical |
| --- | ---: | ---: | ---: | ---: |
| 7 / 84 | 98 → 7 | 3 → 1 | 558 → 27 | 41,962 → 12,287 |
| 50 / 1,000 | 1,100 → 50 | 8 → 1 | 6,398 → 199 | 406,095 → 98,885 |
| 120 / 2,400 | 2,640 → 120 | 17 → 1 | 15,358 → 479 | 969,972 → 237,161 |

Every full request: two Album traversals, one Track traversal, two summary builds, one migration builder, three state tokens. Every canonical request: one Album traversal/summary build, zero Track traversals/migration builders/state tokens. All GETs performed zero writes and zero head calls. With A Album manifests and T Track manifests, the fixture's object GET count changes from `2A + T` to `A`.

Node v24.19.0, Windows x64, seven observations per mode after one warmup:

| Fixture | Median wall ms baseline / candidate full / canonical | Median process CPU ms baseline / candidate full / canonical |
| --- | --- | --- |
| Small | 5.434 / 5.323 / 0.874 | 0 / 0 / 0 |
| Medium | 61.099 / 56.522 / 7.246 | 63 / 62 / 15 |
| Large | 172.823 / 173.887 / 28.049 | 218 / 172 / 31 |

These are local observations, not Cloudflare invocation CPU. Process CPU includes mock R2 filtering/sorting, JWT work, instrumentation, JSON and GC; Windows accounting granularity produced zero small-case medians, which does **not** mean zero CPU usage. No timing thresholds are used as test assertions. No production per-request CPU profile was captured. These results do **not** establish Workers Free compliance. Remaining canonical object filtering can still be costly at scale. Tracks/SonicTrace route costs and duplicate frontend fetches remain outside this slice. Actual benefit and CPU headroom require separately authorized consumer integration, deployment and real-user/Worker measurements.

## Regression and build checks

- `check:studio-albums-lean-read`: 44 route scenarios; 45 with the independent baseline comparison enabled. Signed test JWTs are verified by unchanged production auth code; JWKS is local, every other network fetch fails the fixture. Tests check field/asset/ordering/totals parity; throw-on-call migration exclusion; no Track prefix/read; malformed/absent evidence; pagination success/failure; empty inventory; invalid/duplicate selectors; unauthenticated/expired/wrong-audience/origin rejection; error CORS/no-store; no R2 writes; unchanged migration POST dispatch.
- Existing migration review/apply/stale-token/rollback suite passed, along with guarded Album writes/transactions, Build108/109/114–117, edge-safe migration, public Album cutover, private bridge, SonicTrace and Lyrics bridge tests.
- `validate:cloudflare` locally passed through those checks, then hit the unchanged `test-studio-protected-media-range.mjs` LF-specific regex on this CRLF checkout. Both affected files equal baseline after Git line-ending normalization; extraction is false on checkout CRLF and true on committed LF. All remaining commands in the validation chain passed separately. Linux CI is the complete committed-source gate.
- `check:canonical-album-read-model`, `check:build-docs`, `check:deployment-topology`, new-script syntax checks and diff whitespace checks passed.
- `check:wrangler`: both public and admin local-only dry-run bundles passed with pinned Wrangler 4.118.0. Sandbox initially blocked esbuild ancestor reads; authorized dry-run retry succeeded. Admin bundle: 567.17 KiB / gzip 135.21 KiB. No deployment occurred.
- Generated baseline/candidate bundle diff contains only 13 added lines and one route-line replacement. Authentication, CORS, canonical projection, migration wrapper/apply, frontend, public Worker and config remain identical.

## Reproduce without another worktree

Run from this implementation worktree. The archive is a source fixture inside ignored `dist`, not a new Git worktree. No original LaunchPAD directory is accessed.

```powershell
New-Item -ItemType Directory -Force dist/albums-baseline-source | Out-Null
git archive --format=tar --output=dist/albums-baseline-source.tar 4867a2fef673028b0474f949183944dd642af165 cloudflare scripts
tar -xf dist/albums-baseline-source.tar -C dist/albums-baseline-source
Push-Location dist/albums-baseline-source
node scripts/build-admin-worker-v528.mjs ../albums-baseline.mjs
Pop-Location
$env:ALBUMS_BASELINE_BUNDLE = 'dist/albums-baseline.mjs'
npm run check:studio-albums-lean-read
node scripts/profile-studio-albums.mjs > dist/albums-profile.json
npm run validate:cloudflare
npm run check:wrangler
```

## Review and rollback

Runtime change is confined to the collection route assembler and a selector adjacent to the migration wrapper. Focused guards replace only their expected route-call marker. The new regression script is included in `validate:cloudflare`, hence existing PR CI. Fixtures/profiler and this receipt provide the evidence. No lockfile/dependency change.

Rollback before deployment is closing/reverting this PR. After a separately authorized deployment, reverting this selector returns the prior full response; a future consumer must not assume the absence of migration unless it explicitly opts in. No data rollback is needed because this change performs no mutation. Merge, Worker deployment and REAL USER PASS remain separate pending gates.
