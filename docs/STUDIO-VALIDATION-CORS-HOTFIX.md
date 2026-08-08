# Studio metadata validation CORS hotfix

> Current application build: `2026.08.08.66` — release `studio-metadata-validation-20260808`.

**Historical contract:** Track Manager `v5.10` / Studio bridge `v1.2` / Studio Build `7`.

This document records the browser CORS hotfix that made metadata validation reliable behind Cloudflare Access. The no-preflight design remains active in the successor **Track Manager v5.11 / bridge v1.3**, which adds a separately guarded metadata-only save route. See [`STUDIO-METADATA-WRITE.md`](STUDIO-METADATA-WRITE.md) for the current write contract.

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

## v5.10 hotfix design

The Worker kept validation non-mutating and supported two transports.

### Backward-compatible transport

```text
Content-Type: application/json
X-Shinobiwan-Studio-Intent: metadata-validate-v1
```

### No-preflight transport

```text
Content-Type: text/plain
```

The body remains JSON and contains:

```json
{
  "intent": "metadata-validate-v1",
  "expectedUpdatedAt": "<canonical revision>",
  "metadata": {}
}
```

`text/plain` is CORS-safelisted and no custom request header is needed, so the browser can send the credentialed POST directly instead of issuing an OPTIONS preflight.

## Security invariants retained by v5.11

1. exact browser origin remains `https://shinobione.github.io`;
2. Cloudflare Access JWT verification occurs before Studio data routes;
3. `metadata-validate-v1` remains mandatory for validation;
4. `expectedUpdatedAt` remains mandatory and stale manifests return `409 / STALE_MANIFEST`;
5. metadata fields remain whitelist-only;
6. the validation source part `03d-studio-metadata-validation.part` remains non-mutating;
7. v5.11 adds write behavior in a separate `03e-studio-metadata-save.part`, rather than weakening validation;
8. public Worker `v2.6`, R2 media, SonicTrace and LRC Maker remain outside the validation transport change.

## Rollback history

The v5.10 pre-hotfix source snapshot remains:

```text
safety/pre-cors-hotfix-20260808-1540
```

The fresher checkpoint before the first metadata write phase is:

```text
safety/pre-4b1b-metadata-write-20260808-1612
```
