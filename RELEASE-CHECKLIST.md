# LaunchPAD release checklist

> Current application build: `2026.08.07.50` — release `audiolab-signal-first-20260807`.

This checklist separates four independent states: **source merge**, **web-host deployment**, **Worker deployment**, and **R2 catalog/media publication**.

## 1. Before a pull request

1. Work from a temporary branch based on current `main`.
2. Do not edit generated `dist/` output as source.
3. Do not make a production-only fix in Cloudflare Pages, GitHub Pages or Lovable.
4. Advance a runtime build only in `js/build-config.js`.
5. When the build changes, update **every Markdown file** to the exact build display/release values. `npm run check:build-docs` must pass.
6. Run:

```bash
npm ci
npm run validate
npm run check:wrangler
```

7. Test affected desktop/mobile routes and playback paths.
8. For routing changes, test direct `#track=`, `#lyrics=`, `#studio=` and Back/Forward behavior.
9. For Audio Lab changes, use Spectrum as the reference signal check and confirm other effects visibly follow the same FFT rather than independent time loops.
10. For PWA changes, confirm update activation still results in one prompt / one reload.

## 2. Pull request / merge

11. Open a PR into `main`.
12. Require green **Validate Launchpad**, **Validate Cloudflare Workers**, and **Validate Horizontal Overflow**.
13. Review regressions rather than weakening tests to match a bug.
14. Merge only when the PR represents the complete intended source state.
15. Confirm GitHub auto-deletes the merged head branch.

## 3. Web deployment

### GitHub Pages

16. A push to `main` triggers **Deploy LaunchPAD to GitHub Pages**.
17. Confirm the artifact build/validation and Pages deployment succeed.
18. Hard-refresh `https://shinobione.github.io/LaunchPAD-APP/` and confirm Build/Release in About.

### Cloudflare Pages staging

19. Confirm staging tracked the same `main` merge SHA.
20. Its compatibility command remains:

```bash
node scripts/build-cloudflare-pages.mjs && node scripts/validate-cloudflare-pages-build.mjs
```

21. Confirm `https://shinobiwan-launchpad-staging.pages.dev/` reports the same Build/Release.

## 4. Audio / Audio Lab release checks

22. Verify clean playback with Audio Lab closed.
23. Verify clean playback with Audio Lab open and while switching presets.
24. Verify background playback after leaving/minimizing the PWA.
25. Verify track A → B → C while staying in Audio Lab.
26. Spectrum must track the current song immediately after decoded analysis warms.
27. Neon Shatter/Aurora Glass must settle when paused and deform from real FFT when playing; constant autonomous loop motion is a failure.
28. Liquid Chrome/Singularity should expose real reactions clearly without oversized geometry.
29. Re-test Android and desktop separately because media/visibility lifecycles differ.

## 5. Lyrics / Studio / Canvas checks

30. On mobile, Track Detail → Lyrics should open that track's Studio when synchronized lyrics exist.
31. Mobile bottom navigation remains visible in Studio.
32. The global mini-player stays above the bottom navigation.
33. Canvas should be muted, `playsinline`, loop reliably and resume after visibility/lifecycle interruptions when allowed.
34. Lyrics auto-scroll stays inside its reader and does not fight page scrolling.

## 6. Track Manager / R2 publication

35. Use the private Track Manager behind Cloudflare Access.
36. Create/edit canonical manifests and upload audio/cover/optional lyrics/Canvas.
37. Confirm thumbnail, metadata, content rating and publishability.
38. Rebuild `catalog/index.json` only when manifest/derived metadata needs refreshing.
39. Verify one full `/tracks/<slug>` response after parser/index changes.

## 7. Worker deployment

40. Worker deployment is **not** implied by a PWA merge.
41. From `main`, dispatch **Deploy Cloudflare Workers** for `public`, `admin` or `both`.
42. Approve the protected environment and verify health/Access/Range checks.
43. Record source SHA and deployed Worker version IDs.

## 8. Rollback

44. Web rollback is a revert/fix in `main` followed by canonical redeployment, never a host-only patch.
45. Worker rollback uses the protected rollback workflow.
46. Worker rollback does not restore R2 objects or catalog state.

## 9. Repository hygiene

47. `main` remains the only persistent branch/source of truth.
48. Keep auto-delete merged-head branches enabled.
49. Keep documentation synchronized with the active build; CI enforces the exact markers.
50. Keep Lovable prototype-only unless deliberately promoted through GitHub.
51. Do not delete compatibility files just because their names contain an old version; first prove they are no longer wired into runtime/CI/deployment.
52. Report merged/deployed states separately: source, GitHub Pages, Cloudflare Pages, public Worker, private Worker, R2 catalog/media.

See [`docs/DEPLOYMENT-TOPOLOGY.md`](docs/DEPLOYMENT-TOPOLOGY.md) for the canonical map.
