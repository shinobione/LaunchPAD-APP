# LaunchPAD release checklist

> Current application build: `2026.08.08.56` — release `dynamic-breathing-20260808`.

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
11. Prefer fewer stronger gestures to dense always-on geometry when readability suffers.
12. If spring/inertia memory is introduced, prove it is driven by signal targets, owns no private scheduler and decays to rest after pause.
13. Check **dynamic headroom**: custom visuals must not spend normal loud passages permanently near maximum deformation. Quiet/mid passages should still show visible motion.
14. For PWA changes, confirm update activation still results in one prompt / one reload.

## 2. Pull request / merge

15. Open a PR into `main`.
16. Require green **Validate Launchpad**, **Validate Cloudflare Workers**, and **Validate Horizontal Overflow**.
17. Review regressions rather than weakening tests to match a bug.
18. Merge only when the PR represents the complete intended source state.
19. Confirm GitHub auto-deletes the merged head branch.

## 3. Web deployment

### GitHub Pages

20. A push to `main` triggers **Deploy LaunchPAD to GitHub Pages**.
21. Confirm the artifact build/validation and Pages deployment succeed.
22. Hard-refresh `https://shinobione.github.io/LaunchPAD-APP/` and confirm Build/Release in About.

### Cloudflare Pages staging

23. Confirm staging tracked the same `main` merge SHA.
24. Its compatibility command remains:

```bash
node scripts/build-cloudflare-pages.mjs && node scripts/validate-cloudflare-pages-build.mjs
```

25. Confirm `https://shinobiwan-launchpad-staging.pages.dev/` reports the same Build/Release.

## 4. Audio / Audio Lab release checks

26. Verify clean playback with Audio Lab closed.
27. Verify clean playback with Audio Lab open and while switching presets.
28. Verify background playback after leaving/minimizing the PWA.
29. Verify track A → B → C while staying in Audio Lab.
30. Spectrum must track the current song immediately after its analyser is live.
31. Neon Shatter must visibly move/deform from real FFT/kick activity and settle when paused.
32. Liquid Chrome must visibly pulse/deform with bass/mid/high activity and settle when paused.
33. Pulse Reactor must remain readable and show continuous breathing/precession at groove level; loud sections must retain extra kick headroom instead of staying fully expanded.
34. Bass Fracture must show plate glide/recoil between impacts; loud passages must not leave the disc permanently ruptured open, and mobile must stay within its geometry budget.
35. Gravity Lens must keep visible precession/breathing/stream drift at moderate energy while reserving stronger warp for genuine peaks.
36. Bio Structure must remain alive between peaks via spine/rib/membrane/nerve motion without keeping the organism permanently inflated.
37. All spring-driven modes must settle after pause; zero signal must not maintain phase progression.
38. Audio Lab must expose exactly seven controls: Neon Shatter, Spectrum, Liquid Chrome, Pulse Reactor, Bass Fracture, Gravity Lens and Bio Structure.
39. Mobile budgets: Pulse Reactor 3 rings / 14 segments / 10 spokes / DPR 1.1; Bass Fracture 2 layers / 12 sectors / 8 cracks / DPR 1.05; Gravity Lens 4 bands / 12 arcs / 8 streams / DPR 1.05; Bio Structure 5 ribs / 8 nerve impulses / 6 spine nodes / DPR 1.05.
40. Re-test Android and desktop separately because media/visibility lifecycles differ.

## 5. Lyrics / Studio / Canvas checks

41. On mobile, Track Detail → Lyrics should open that track's Studio when synchronized lyrics exist.
42. Mobile bottom navigation remains visible in Studio.
43. The global mini-player stays above the bottom navigation.
44. Canvas should be muted, `playsinline`, loop reliably and resume after visibility/lifecycle interruptions when allowed.
45. Lyrics auto-scroll stays inside its reader and does not fight page scrolling.

## 6. Track Manager / R2 publication

46. Use the private Track Manager behind Cloudflare Access.
47. Create/edit canonical manifests and upload audio/cover/optional lyrics/Canvas.
48. Confirm thumbnail, metadata, content rating and publishability.
49. Rebuild `catalog/index.json` only when manifest/derived metadata needs refreshing.
50. Verify one full `/tracks/<slug>` response after parser/index changes.

## 7. Worker deployment

51. Worker deployment is **not** implied by a PWA merge.
52. From `main`, dispatch **Deploy Cloudflare Workers** for `public`, `admin` or `both`.
53. Approve the protected environment and verify health/Access/Range checks.
54. Record source SHA and deployed Worker version IDs.

## 8. Rollback

55. Web rollback is a revert/fix in `main` followed by canonical redeployment, never a host-only patch.
56. Worker rollback uses the protected rollback workflow.
57. Worker rollback does not restore R2 objects or catalog state.

## 9. Repository hygiene

58. `main` remains the only persistent branch/source of truth.
59. Keep auto-delete merged-head branches enabled.
60. Keep documentation synchronized with the active build; CI enforces the exact markers.
61. Keep Lovable prototype-only unless deliberately promoted through GitHub.
62. Do not delete compatibility files just because their names contain an old version; first prove they are no longer wired into runtime/CI/deployment.
63. Add Audio Lab effects one at a time and isolate new renderers when practical.
64. Prefer dynamic range, motion amplitude and elastic lag over increasing permanent mobile primitive counts or raw peak gain.
65. Report merged/deployed states separately: source, GitHub Pages, Cloudflare Pages, public Worker, private Worker, R2 catalog/media.

See [`docs/DEPLOYMENT-TOPOLOGY.md`](docs/DEPLOYMENT-TOPOLOGY.md) for the canonical map.
