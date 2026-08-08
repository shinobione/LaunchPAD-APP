# SHINOBIWAN Studio — Track Manager v5.13 / Bridge v1.5 Phase 4 Operations

> Public application build remains `2026.08.08.66` — release `studio-metadata-validation-20260808`.

Date: 2026-08-08  
Status in this branch: **source candidate / not production until protected admin deployment succeeds**

## Objective

This contract supplies the remaining Track Manager backend operations required by `SHINOBIWAN_STUDIO_ROADMAP.txt` Phase 4 without exposing the legacy all-in-one write surface cross-origin.

The Phase 4 criterion is:

> principal Track Manager operations are achievable from the Studio workspace.

The backend therefore adds only:

- create track;
- upload/replace one canonical asset;
- delete one canonical asset;
- explicit catalog rebuild.

Metadata and canonical lyrics read/validate/save remain the already-separated v1.3/v1.4 capabilities.

## Bridge capability model

```json
{
  "read": ["tracks", "track", "lyrics"],
  "validate": ["metadata", "lyrics"],
  "write": ["metadata", "lyrics"],
  "manage": ["track-create", "assets", "catalog-rebuild"]
}
```

The new `manage` family is separate so the meaning of the production-proven `write` list does not silently broaden.

## Routes

```text
POST /api/studio/tracks/create
POST /api/studio/tracks/<slug>/assets/<kind>/upload
POST /api/studio/tracks/<slug>/assets/<kind>/delete
POST /api/studio/catalog/rebuild
```

Asset kinds:

```text
audio | cover | thumbnail | lyrics | video
```

No whole-track-delete route is exposed.

## Track creation

Request uses the CORS-simple `text/plain` JSON transport:

```json
{
  "intent": "track-create-v1",
  "slug": "canonical-slug",
  "metadata": {
    "title": "Track title"
  }
}
```

Rules:

- slug must already be canonical;
- duplicate slug returns `TRACK_EXISTS`;
- metadata is filtered through the existing Studio whitelist;
- server forces `status = draft`;
- assets begin null;
- manifest write is followed by catalog rebuild + manifest reread verification;
- failure after manifest creation triggers manifest removal + catalog restoration attempt.

Creation deliberately does not accept media bytes. Media is attached by the asset endpoints one file at a time.

## Asset upload / replace

Request is multipart FormData:

```text
intent=asset-upload-v1
expectedUpdatedAt=<canonical manifest revision>
file=<File>
```

No custom browser request header is required.

Rules:

- exact Studio origin and Access JWT remain required;
- request is one asset kind only;
- `expectedUpdatedAt` prevents stale overwrite;
- existing Track Manager file-extension and size validation is reused;
- thumbnail remains capped at 2 MB;
- lyrics is stored canonically as `lyrics.txt` only;
- the previous object is copied outside the track prefix before replacement;
- when extension changes, the old canonical filename is removed only after the new object exists;
- proposed manifest quality is evaluated before manifest commit;
- a published track cannot be left non-publishable by the operation;
- manifest + catalog are written then reread/verified;
- temporary backup is deleted after success;
- failure attempts object + manifest + catalog restoration.

## Asset delete

Request:

```json
{
  "intent": "asset-delete-v1",
  "expectedUpdatedAt": "<canonical revision>"
}
```

Rules:

- named asset must exist in manifest and R2;
- stale manifest is rejected;
- proposed manifest is quality-checked before deletion;
- essential asset deletion from a published track is blocked with `QUALITY_BLOCKED` when it would make publication invalid;
- object backup is created before deletion;
- manifest/catalog are updated and canonical absence is verified;
- failure attempts full compensation.

## Catalog rebuild

Request:

```json
{
  "intent": "catalog-rebuild-v1",
  "confirm": "REBUILD"
}
```

This route calls only the canonical catalog writer. It has no hidden track or asset mutation.

## Rollback storage

Temporary operation backups use:

```text
_studio-backups/<slug>/<kind>-<opaque-id>
```

This prefix is deliberately outside `tracks/<slug>/`, preventing quality scans from treating rollback objects as canonical extras.

Backups are not a new source of truth. They are temporary compensation material and are removed after success or rollback processing.

## Security invariants

- Cloudflare Access JWT before route execution;
- exact allowed origin `https://shinobione.github.io`;
- no wildcard credentialed CORS;
- legacy unrelated writes still call `enforceSameOrigin()`;
- no R2 secret in GitHub Pages;
- no generic cross-origin `saveTrack()`;
- no cross-origin whole-track deletion;
- no SonicTrace/Phase 5 persistence;
- no `.lrc` storage path.

## Deployment ordering

1. Studio Build 12 is deployed first and remains compatible because it ignores the future `capabilities.manage` family.
2. Merge v5.13 source only after LaunchPAD + Worker + overflow CI is green.
3. Deploy private/admin Worker only using protected `workflow_dispatch`.
4. Record actual source SHA, workflow run and Cloudflare Version ID.
5. Only then deploy the final Studio Phase 4 UI which consumes `manage`.

## Safety references

Immediate rollback before v5.13:

```text
safety/pre-v5.13-phase4-ops-20260808-1948
```

Cross-repository state after v5.12 and before final Phase 4:

```text
safety/post-v5.12-pre-phase4-complete-20260808-1945
```

## Stop line

After the final Studio UI consumes this backend and the Phase 4 roadmap criterion is met, stop.

Do **not** begin Phase 5 SonicTrace/Catalog Intelligence without new user instructions.
