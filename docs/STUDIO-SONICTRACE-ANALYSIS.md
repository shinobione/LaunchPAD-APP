# Studio SonicTrace Analysis — Track Manager v5.14 / Bridge v1.6

Status: source and contract implemented; production deployment requires the protected admin Worker workflow.

Public application baseline: build `2026.08.08.66`, release `studio-metadata-validation-20260808` (unchanged).

## Authority boundary

Track Manager/R2 remains authoritative. SonicTrace computes results and Studio orchestrates them. The existing SonicTrace IndexedDB is not imported or treated as a canonical catalog.

```text
tracks/<trackId>/analysis/sonictrace/latest.json
tracks/<trackId>/analysis/sonictrace/history/<analysisId>.json
```

No analysis field is added to manifest schema v1. No analysis save rebuilds public `catalog/index.json`.

## Routes

```text
GET  /api/studio/tracks/<trackId>/analysis/sonictrace
POST /api/studio/tracks/<trackId>/analysis/sonictrace
GET  /api/studio/analysis/sonictrace
```

All routes stay behind Cloudflare Access and the exact Studio origin boundary. POST uses the proven CORS-simple `text/plain` JSON transport with intent:

```text
sonictrace-analysis-save-v1
```

Bridge health advertises:

```json
{
  "read": ["tracks", "track", "lyrics", "sonictrace-analysis", "sonictrace-catalog"],
  "validate": ["metadata", "lyrics"],
  "write": ["metadata", "lyrics", "sonictrace-analysis"],
  "manage": ["track-create", "assets", "catalog-rebuild"]
}
```

## Source freshness

The private Worker derives `sourceVersion` from the current canonical R2 audio object:

- R2 ETag when present;
- object size;
- filename and upload timestamp for diagnostics.

Save rejects `STALE_AUDIO` if the submitted analysis does not match the current R2 audio. Reads compare latest versus current and expose `outdated`.

## Transaction order

1. validate canonical manifest/audio and schema;
2. require exactly 512 values when an embedding is present;
3. reject reused `analysisId`;
4. write append-only history;
5. write latest;
6. reread/verify both;
7. on failure remove new history and restore previous latest.

Partial Browser-DSP-only analyses are allowed and versioned; they simply do not enter the 512D similarity index.

## Privacy

Only structured JSON is persisted. The WAV/MP3 is never copied into the analysis directory.
