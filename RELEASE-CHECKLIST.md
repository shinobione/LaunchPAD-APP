# LaunchPAD release checklist

> Current application build: `2026.08.08.53` — release `bass-fracture-20260808`.

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
10. For every new Audio Lab preset, define its mobile DPR/geometry budget before merge.
11. Prefer peak-only deformation/fracture to permanently increasing geometry when stronger transient violence is requested.
12. For PWA changes, confirm update activation still results in one prompt / one reload.

## 2. Pull request / merge

13. Open a PR into `main`.
14. Require green **Validate Launchpad**, **Validate Cloudflare Workers**, and **Validate Horizontal Overflow**.
15. Review regressions rather than weakening tests to match a bug.
16. Merge only when the PR represents the complete intended source state.
17. Confirm GitHub auto-deletes the merged head branch.

## 3. Web deployment

### GitHub Pages

18. A push to `main` triggers **Deploy LaunchPAD to GitHub Pages**.
19. Confirm the artifact build/validation and Pages deployment succeed.
20. Hard-refresh `https://shinobione.github.io/LaunchPAD-APP/` and confirm Build/Release in About.

### Cloudflare Pages staging

21. Confirm staging tracked the same `main` merge SHA.
22. Its compatibility command remains:

```bash
node scripts/build-cloudflare-pages.mjs && node scripts/validate-cloudflare-pages-build.mjs
```

23. Confirm `https://shinobiwan-launchpad-staging.pages.dev/` reports the same Build/Release.

## 4. Audio / Audio Lab release checks

24. Verify clean playback with Audio Lab closed.
25. Verify clean playback with Audio Lab open and while switching presets.
26. Verify background playback after leaving/minimizing the PWA.
27. Verify track A → B → C while staying in Audio Lab.
28. Spectrum must track the current song immediately after its analyser is live.
29. Neon Shatter must visibly move/deform from real FFT/kick activity and settle when paused; autonomous loop motion is a failure.
30. Liquid Chrome must visibly pulse/deform with bass/mid/high activity and settle when paused; a static blob or independent loop is a failure.
31. Pulse Reactor must map bass/kicks to its core, mids to segmented rings and highs/transients to radial needles; strong bass peaks should temporarily de-cohere rings/core shards, and it must settle when paused.
32. Bass Fracture must map bass/kicks to plate separation, mids to twist and highs/transients to crack/fault detail; it must settle when paused.
33. Audio Lab must expose exactly five controls: Neon Shatter, Spectrum, Liquid Chrome, Pulse Reactor and Bass Fracture.
34. On mobile, confirm Pulse Reactor remains within 3 rings / 18 segments / 16 spokes / DPR 1.1 and Bass Fracture within 2 layers / 12 sectors / 10 cracks / DPR 1.05.
35. Re-test Android and desktop separately because media/visibility lifecycles differ.

## 5. Lyrics / Studio / Canvas checks

36. On mobile, Track Detail → Lyrics should open that track's Studio when synchronized lyrics exist.
37. Mobile bottom navigation remains visible in Studio.
38. The global mini-player stays above the bottom navigation.
39. Canvas should be muted, `playsinline`, loop reliably and resume after visibility/lifecycle interruptions when allowed.
40. Lyrics auto-scroll stays inside its reader and does not fight page scrolling.

## 6. Track Manager / R2 publication

41. Use the private Track Manager behind Cloudflare Access.
42. Create/edit canonical manifests and upload audio/cover/optional lyrics/Canvas.
43. Confirm thumbnail, metadata, content rating and publishability.
44. Rebuild `catalog/index.json` only when manifest/derived metadata needs refreshing.
45. Verify one full `/tracks/<slug>` response after parser/index changes.

## 7. Worker deployment

46. Worker deployment is **not** implied by a PWA merge.
47. From `main`, dispatch **Deploy Cloudflare Workers** for `public`, `admin` or `both`.
48. Approve the protected environment and verify health/Access/Range checks.
49. Record source SHA and deployed Worker version IDs.

## 8. Rollback

50. Web rollback is a revert/fix in `main` followed by canonical redeployment, never a host-only patch.
51. Worker rollback uses the protected rollback workflow.
52. Worker rollback does not restore R2 objects or catalog state.

## 9. Repository hygiene

53. `main` remains the only persistent branch/source of truth.
54. Keep auto-delete merged-head branches enabled.
55. Keep documentation synchronized with the active build; CI enforces the exact markers.
56. Keep Lovable prototype-only unless deliberately promoted through GitHub.
57. Do not delete compatibility files just because their names contain an old version; first prove they are no longer wired into runtime/CI/deployment.
58. Add Audio Lab effects one at a time and isolate new renderers when practical.
59. Report merged/deployed states separately: source, GitHub Pages, Cloudflare Pages, public Worker, private Worker, R2 catalog/media.

See [`docs/DEPLOYMENT-TOPOLOGY.md`](docs/DEPLOYMENT-TOPOLOGY.md) for the canonical map.
