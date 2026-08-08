# LaunchPAD release checklist

> Current application build: `2026.08.08.57` — release `kinetic-flow-20260808`.

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
13. Check **kinetic travel**, not only reactivity: steady musical energy must visibly move the structure through space; peaks should add extra excursion instead of being the only motion source.
14. For integrated motion phase, confirm phase advances by frame delta while real audio exists and stops when audio activity disappears.
15. For PWA changes, confirm update activation still results in one prompt / one reload.

## 2. Pull request / merge

16. Open a PR into `main`.
17. Require green **Validate Launchpad**, **Validate Cloudflare Workers**, and **Validate Horizontal Overflow**.
18. Review regressions rather than weakening tests to match a bug.
19. Merge only when the PR represents the complete intended source state.
20. Confirm GitHub auto-deletes the merged head branch.

## 3. Web deployment

### GitHub Pages

21. A push to `main` triggers **Deploy LaunchPAD to GitHub Pages**.
22. Confirm the artifact build/validation and Pages deployment succeed.
23. Hard-refresh `https://shinobione.github.io/LaunchPAD-APP/` and confirm Build/Release in About.

### Cloudflare Pages staging

24. Confirm staging tracked the same `main` merge SHA.
25. Its compatibility command remains:

```bash
node scripts/build-cloudflare-pages.mjs && node scripts/validate-cloudflare-pages-build.mjs
```

26. Confirm `https://shinobiwan-launchpad-staging.pages.dev/` reports the same Build/Release.

## 4. Audio / Audio Lab release checks

27. Verify clean playback with Audio Lab closed.
28. Verify clean playback with Audio Lab open and while switching presets.
29. Verify background playback after leaving/minimizing the PWA.
30. Verify track A → B → C while staying in Audio Lab.
31. Spectrum must track the current song immediately after its analyser is live.
32. Neon Shatter must visibly move/deform from real FFT/kick activity and settle when paused.
33. Liquid Chrome must visibly pulse/deform with bass/mid/high activity and settle when paused.
34. Pulse Reactor must show obvious whole-body drift, continuous ring travel and breathing through steady grooves; kicks add extra impact/fracture on top.
35. Bass Fracture must visibly roll/translate as a mass and keep plates sliding/twisting between kicks; mobile keeps 12 sectors but uses stronger travel rather than more geometry.
36. Gravity Lens must visibly precess and sweep streams around the horizon at moderate energy; bass/kicks deepen an already-moving field.
37. Bio Structure must visibly drift/tilt, run travelling waves through the spine, sweep ribs and move nerve impulses through the body during steady passages.
38. All kinetic modes must stop integrated phase speed and settle their spring amplitudes after pause/silence.
39. Audio Lab must expose exactly seven controls: Neon Shatter, Spectrum, Liquid Chrome, Pulse Reactor, Bass Fracture, Gravity Lens and Bio Structure.
40. Mobile budgets: Pulse Reactor 3 rings / 14 segments / 10 spokes / DPR 1.1; Bass Fracture 2 layers / 12 sectors / 8 cracks / DPR 1.05; Gravity Lens 4 bands / 12 arcs / 8 streams / DPR 1.05; Bio Structure 5 ribs / 8 nerve impulses / 6 spine nodes / DPR 1.05.
41. Re-test Android and desktop separately because media/visibility lifecycles differ.

## 5. Lyrics / Studio / Canvas checks

42. On mobile, Track Detail → Lyrics should open that track's Studio when synchronized lyrics exist.
43. Mobile bottom navigation remains visible in Studio.
44. The global mini-player stays above the bottom navigation.
45. Canvas should be muted, `playsinline`, loop reliably and resume after visibility/lifecycle interruptions when allowed.
46. Lyrics auto-scroll stays inside its reader and does not fight page scrolling.

## 6. Track Manager / R2 publication

47. Use the private Track Manager behind Cloudflare Access.
48. Create/edit canonical manifests and upload audio/cover/optional lyrics/Canvas.
49. Confirm thumbnail, metadata, content rating and publishability.
50. Rebuild `catalog/index.json` only when manifest/derived metadata needs refreshing.
51. Verify one full `/tracks/<slug>` response after parser/index changes.

## 7. Worker deployment

52. Worker deployment is **not** implied by a PWA merge.
53. From `main`, dispatch **Deploy Cloudflare Workers** for `public`, `admin` or `both`.
54. Approve the protected environment and verify health/Access/Range checks.
55. Record source SHA and deployed Worker version IDs.

## 8. Rollback

56. Web rollback is a revert/fix in `main` followed by canonical redeployment, never a host-only patch.
57. Worker rollback uses the protected rollback workflow.
58. Worker rollback does not restore R2 objects or catalog state.

## 9. Repository hygiene

59. `main` remains the only persistent branch/source of truth.
60. Keep auto-delete merged-head branches enabled.
61. Keep documentation synchronized with the active build; CI enforces the exact markers.
62. Keep Lovable prototype-only unless deliberately promoted through GitHub.
63. Do not delete compatibility files just because their names contain an old version; first prove they are no longer wired into runtime/CI/deployment.
64. Add Audio Lab effects one at a time and isolate new renderers when practical.
65. Prefer real travel/amplitude and integrated signal-driven motion over increasing permanent mobile primitive counts or merely boosting peak gain.
66. Report merged/deployed states separately: source, GitHub Pages, Cloudflare Pages, public Worker, private Worker, R2 catalog/media.

See [`docs/DEPLOYMENT-TOPOLOGY.md`](docs/DEPLOYMENT-TOPOLOGY.md) for the canonical map.
