# Studio metadata validation CORS hotfix plan

This hotfix addresses the browser-only failure observed after Studio 0.4.1 Build 6: authenticated private GET requests succeed, while the validation POST is unavailable before reaching the Worker.

Root cause hypothesis: Build 6 uses `Content-Type: application/json` plus a custom `X-Shinobiwan-Studio-Intent` header, which forces a CORS preflight. Cloudflare Access sits in front of the Worker, so the preflight can be intercepted before the Worker CORS handler even though the authenticated GET session works.

Hotfix design:

- keep exact Studio origin allowlist;
- keep Cloudflare Access authentication;
- keep the exact `/metadata/validate` route;
- keep `expectedUpdatedAt` stale-manifest protection;
- keep `write: []` and validation-only behavior;
- preserve the existing JSON/custom-header mode for backward compatibility;
- add a no-preflight `text/plain` transport mode whose JSON body contains `intent: "metadata-validate-v1"`;
- parse and validate that body server-side before metadata validation;
- do not add manifest writes, R2 puts/deletes, catalog rebuilds, uploads, publish or delete routes.

Release target: LaunchPAD Build 67 / Track Manager v5.10 / Studio bridge v1.2, followed by Studio 0.4.2 Build 7 using the no-preflight mode.
