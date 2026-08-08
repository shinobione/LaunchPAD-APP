# Studio metadata validation CORS hotfix

Current public LaunchPAD release remains `2026.08.08.66` / `studio-metadata-validation-20260808` because this hotfix changes only the protected Track Manager Worker, not the public PWA runtime or cache.

Backend release target:

- Track Manager `v5.10`
- Studio bridge `v1.2`
- Studio consumer target `0.4.2` / Build `7`

## Observed browser failure

After Studio `0.4.1` / Build `6` was deployed, authenticated private GET requests worked (`PRIVATE READ`) but metadata validation returned an availability error before a Worker JSON response was received.

Build 6 sent:

```text
POST /api/studio/tracks/<trackId>/metadata/validate
Content-Type: application/json
X-Shinobiwan-Studio-Intent: metadata-validate-v1
credentials: include
```

The non-safelisted content type plus custom header force a CORS preflight. Cloudflare Access sits in front of the Worker, so a browser preflight can be intercepted before the Worker CORS handler even while the normal authenticated GET session succeeds.

## Hotfix design

The Worker remains validation-only and supports two transports:

### Backward-compatible transport

```text
Content-Type: application/json
X-Shinobiwan-Studio-Intent: metadata-validate-v1
```

This keeps already-open Build 6 tabs compatible where preflight succeeds.

### No-preflight transport

```text
Content-Type: text/plain
```

The body is still JSON and must contain:

```json
{
  "intent": "metadata-validate-v1",
  "expectedUpdatedAt": "<canonical revision>",
  "metadata": {}
}
```

`text/plain` is CORS-safelisted and no custom request header is sent, so the browser can send the credentialed POST directly instead of issuing an OPTIONS preflight.

## Security invariants

The hotfix does **not** weaken the write boundary:

1. exact browser origin remains `https://shinobione.github.io`;
2. Cloudflare Access JWT verification still occurs before the POST data route;
3. only the exact `/metadata/validate` route bypasses Track Manager's historical same-origin write guard;
4. `metadata-validate-v1` remains mandatory — in the header for the old mode, in the JSON body for the simple mode;
5. `expectedUpdatedAt` remains mandatory and stale manifests still return `409 / STALE_MANIFEST`;
6. metadata fields remain whitelist-only;
7. the validation source part contains no manifest write, R2 put/delete, upload, publish, delete or catalog rebuild primitive;
8. Studio health continues to advertise `validate: ["metadata"]` and `write: []`;
9. public Worker `v2.6`, R2 schema/data/media, SonicTrace and LRC Maker are unchanged.

## Rollback

A source snapshot exists at:

```text
safety/pre-cors-hotfix-20260808-1540
```

Preferred rollback after deployment is to revert the hotfix PR and redeploy the admin Worker only. No R2 rollback should be required because this endpoint remains non-mutating.
