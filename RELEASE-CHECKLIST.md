# LaunchPAD release checklist

_Current operating baseline: Build `2026.08.07.40`._

This checklist separates four independent states that used to get mixed together: **source merge**, **web-host deployment**, **Worker deployment**, and **R2 catalog/media publication**.

## 1. Before a pull request

1. Work from a temporary branch based on current `main`.
2. Do not edit generated `dist/` output as source.
3. Do not make a production-only fix in Cloudflare Pages, GitHub Pages, `gh-pages` or Lovable.
4. Keep the application version centralized in `js/build-config.js` when a shell/runtime release actually needs a new build.
5. Run:

```bash
npm ci
npm run validate
npm run check:wrangler
```

6. Test the affected desktop/mobile routes and playback paths.
7. For routing changes, test direct `#track=`, `#lyrics=`, `#studio=` and browser Back/Forward behavior.
8. For Audio Lab changes, confirm Spectrum/Liquid Chrome sanctuary checks remain intentional and all supported presets still receive the shared live signal.
9. For PWA changes, confirm update activation still results in one prompt and one reload.

## 2. Pull request / merge

10. Open a PR into `main`.
11. Require green:
    - **Validate Launchpad**
    - **Validate Cloudflare Workers**
    - **Validate Horizontal Overflow**
12. Review unexpected visual/behavioral regressions rather than weakening tests to match a bug.
13. Merge into `main` only when the PR represents the complete intended source state.
14. Record the merge SHA when diagnosing a deployment.
15. Delete the temporary branch after merge once it is no longer needed.

## 3. Web application deployment

### GitHub Pages

16. A push to `main` triggers **Deploy LaunchPAD to GitHub Pages**.
17. The workflow must:
    - check out `main`;
    - build the canonical static runtime;
    - validate the runtime byte-for-byte/contractually;
    - verify the active Build metadata;
    - upload/deploy the Pages artifact.
18. Confirm the GitHub Pages API/workflow reports `built` / success.
19. Hard-refresh `https://shinobione.github.io/LaunchPAD-APP/` and confirm the expected Build in About.
20. Do **not** repoint the deployment to the historical `gh-pages` recovery branch.

### Cloudflare Pages staging

21. Confirm the staging project tracked the same `main` merge SHA.
22. Confirm its configured build command succeeds:

```bash
node scripts/build-cloudflare-pages.mjs && node scripts/validate-cloudflare-pages-build.mjs
```

23. Confirm `https://shinobiwan-launchpad-staging.pages.dev/` displays the same Build/Release as GitHub Pages.
24. Treat a Cloudflare Pages deployment failure as a hosting/build state, not as proof that `main` changed or rolled back.

## 4. Track Manager / R2 publication

25. Open the private desktop Track Manager behind Cloudflare Access.
26. Create/edit the canonical track manifest.
27. Upload audio, original cover, optional lyrics and optional video.
28. Confirm `thumbnail.webp` exists; optimize covers when needed.
29. Confirm language, BPM, key, content rating, duration, album/project and release date.
30. Publish only when required media/metadata are complete.
31. Rebuild `catalog/index.json` after manifest/lyrics-derived metadata changes when required.
32. Verify one full `/tracks/<slug>` response after parser/index changes.
33. Test Lyrics Studio if lyrics/timestamps changed.

## 5. Cloudflare Worker deployment

Worker deployment is **not** implied by merging or by Pages deployment.

34. From `main`, dispatch **Deploy Cloudflare Workers** for `public`, `admin` or `both`.
35. Enter the workflow confirmation value requested by the protected job.
36. Approve the `cloudflare-production` environment when prompted.
37. Deploy the private Worker first when Track Manager/catalog-generation behavior changed.
38. Rebuild R2 catalog state only if the data change requires it.
39. Deploy the public Worker when its API/media contract changed.
40. Confirm post-deployment health checks including Access protection, `/health`, `/tracks` and Range media behavior.
41. Record deployed Worker version IDs and the source `main` SHA.

## 6. Playback / PWA verification

42. Test Home, Discography, Favorites, Albums, Lyrics, Audio Lab, Streaming and About.
43. Test first-tap playback on desktop and Android when player/bootstrap code changed.
44. Test seek, Next, Previous, Shuffle and Repeat.
45. Test favorites-only queue behavior when queue code changed.
46. Test installed-PWA startup after fully closing the browser/app when service-worker code changed.
47. Confirm the expected Build/Release is displayed after accepting a PWA update.

## 7. Rollback

48. Web-app rollback should be performed by reverting/fixing `main` and redeploying the canonical artifact, not by making a private host-only patch.
49. Worker rollback uses the protected **Roll back Cloudflare Worker** workflow.
50. Remember that Worker rollback does not restore R2 objects or `catalog/index.json`.
51. Record rollback source/version and verify health afterward.

## 8. Infrastructure/repository hygiene

52. `main` remains the only application source of truth.
53. Delete merged/abandoned `agent/`, `fix/`, `hotfix/`, `migration/` and `release/` branches.
54. Keep `gh-pages` unused by workflow deployment; delete it once historical recovery is no longer required.
55. Do not introduce a second build/version source.
56. Keep documentation synchronized with the actual deployment topology.
57. Treat Lovable as prototype-only unless a future migration is explicitly designed and promoted through GitHub.
58. Report these states separately when troubleshooting:
    - code merged to `main`;
    - GitHub Pages deployed;
    - Cloudflare Pages deployed;
    - public Worker deployed;
    - private Worker deployed;
    - R2 catalog rebuilt/media published.

See [`docs/DEPLOYMENT-TOPOLOGY.md`](docs/DEPLOYMENT-TOPOLOGY.md) for the canonical map.
