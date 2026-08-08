# LaunchPAD release checklist

> Current application build: `2026.08.08.60` — release `void-bloom-20260808`.

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
13. Check **kinetic travel**, not only reactivity: steady musical energy must visibly move the structure through space.
14. Check **transient impact** separately: once the full mix is running, bass/kick onsets must still create a short extra excursion above the continuous groove motion.
15. Confirm transient impact has reserved headroom outside normal clamped spring targets; detector values alone are not sufficient.
16. For integrated motion phase, confirm phase advances by frame delta while real audio exists and stops when audio activity disappears.
17. For PWA changes, confirm update activation still results in one prompt / one reload.

## 2. Pull request / merge

18. Open a PR into `main`.
19. Require green **Validate Launchpad**, **Validate Cloudflare Workers**, and **Validate Horizontal Overflow**.
20. Review regressions rather than weakening tests to match a bug.
21. Merge only when the PR represents the complete intended source state.
22. Confirm GitHub auto-deletes the merged head branch.

## 3. Web deployment

### GitHub Pages

23. A push to `main` triggers **Deploy LaunchPAD to GitHub Pages**.
24. Confirm the artifact build/validation and Pages deployment succeed.
25. Hard-refresh `https://shinobione.github.io/LaunchPAD-APP/` and confirm Build/Release in About.

### Cloudflare Pages staging

26. Confirm staging tracked the same `main` merge SHA.
27. Its compatibility command remains:

```bash
node scripts/build-cloudflare-pages.mjs && node scripts/validate-cloudflare-pages-build.mjs
```

28. Confirm `https://shinobiwan-launchpad-staging.pages.dev/` reports the same Build/Release.

## 4. Audio / Audio Lab release checks

29. Verify clean playback with Audio Lab closed.
30. Verify clean playback with Audio Lab open and while switching presets.
31. Verify background playback after leaving/minimizing the PWA.
32. Verify track A → B → C while staying in Audio Lab.
33. Spectrum must track the current song immediately after its analyser is live.
34. Neon Shatter must visibly move/deform from real FFT/kick activity and settle when paused.
35. Liquid Chrome must visibly pulse/deform with bass/mid/high activity and settle when paused.
36. Pulse Reactor must keep continuous drift/ring travel and visibly expand/twist on low-frequency impact in already-dense sections.
37. Bass Fracture must keep body roll/plate glide and visibly rupture/compress on low-frequency impact; mobile keeps 12 sectors and gains no extra geometry.
38. Gravity Lens must keep continuous precession/stream sweep and visibly snap into stretch/rotation on low-frequency impact.
39. Bio Structure must keep continuous organism motion and visibly contract/expand as a whole body on low-frequency impact.
40. Void Bloom must continuously breathe/orbit/flex while real audio exists; bass opens/deepens the bloom, mids twist petals and highs light/travel along the veins.
41. Void Bloom direct impact must visibly expand and twist the whole bloom on kick/bass onsets even inside dense sections.
42. During a dense section, `audioLabPunch` should rise/fall around kick or bass onsets even if `audioLabBass` stays relatively high.
43. `audioLabVisualImpact` must produce short spikes derived from rising punch/kick/low-band contrast and must not remain pinned high through a loud passage.
44. Direct impact must be applied after normal renderer pose computation rather than being folded back into saturated bass/kick spring targets.
45. Neon Shatter and Liquid Chrome must not receive the direct-impact transform; their calibration is baseline-protected.
46. All kinetic modes must stop integrated phase speed and settle their spring/impact envelopes after pause/silence.
47. Audio Lab must expose exactly eight controls: Neon Shatter, Spectrum, Liquid Chrome, Pulse Reactor, Bass Fracture, Gravity Lens, Bio Structure and Void Bloom.
48. Mobile budgets: Pulse Reactor 3 rings / 14 segments / 10 spokes / DPR 1.1; Bass Fracture 2 layers / 12 sectors / 8 cracks / DPR 1.05; Gravity Lens 4 bands / 12 arcs / 8 streams / DPR 1.05; Bio Structure 5 ribs / 8 nerve impulses / 6 spine nodes / DPR 1.05; Void Bloom 7 petals / 7 veins / DPR 1.05.
49. Re-test Android and desktop separately because media/visibility lifecycles differ.

## 5. Lyrics / Studio / Canvas checks

50. On mobile, Track Detail → Lyrics should open that track's Studio when synchronized lyrics exist.
51. Mobile bottom navigation remains visible in Studio.
52. The global mini-player stays above the bottom navigation.
53. Canvas should be muted, `playsinline`, loop reliably and resume after visibility/lifecycle interruptions when allowed.
54. Lyrics auto-scroll stays inside its reader and does not fight page scrolling.

## 6. Track Manager / R2 publication

55. Use the private Track Manager behind Cloudflare Access.
56. Create/edit canonical manifests and upload audio/cover/optional lyrics/Canvas.
57. Confirm thumbnail, metadata, content rating and publishability.
58. Rebuild `catalog/index.json` only when manifest/derived metadata needs refreshing.
59. Verify one full `/tracks/<slug>` response after parser/index changes.

## 7. Worker deployment

60. Worker deployment is **not** implied by a PWA merge.
61. From `main`, dispatch **Deploy Cloudflare Workers** for `public`, `admin` or `both`.
62. Approve the protected environment and verify health/Access/Range checks.
63. Record source SHA and deployed Worker version IDs.

## 8. Rollback

64. Web rollback is a revert/fix in `main` followed by canonical redeployment, never a host-only patch.
65. Worker rollback uses the protected rollback workflow.
66. Worker rollback does not restore R2 objects or catalog state.

## 9. Repository hygiene

67. `main` remains the only persistent branch/source of truth.
68. Keep auto-delete merged-head branches enabled.
69. Keep documentation synchronized with the active build; CI enforces the exact markers.
70. Keep Lovable prototype-only unless deliberately promoted through GitHub.
71. Do not delete compatibility files just because their names contain an old version; first prove they are no longer wired into runtime/CI/deployment.
72. Add Audio Lab effects one at a time and isolate new renderers when practical.
73. Keep continuous movement, onset detection and direct visual impact as separate contracts; do not solve missing kick impact by adding permanent geometry or autonomous animation.
74. Report merged/deployed states separately: source, GitHub Pages, Cloudflare Pages, public Worker, private Worker, R2 catalog/media.

See [`docs/DEPLOYMENT-TOPOLOGY.md`](docs/DEPLOYMENT-TOPOLOGY.md) for the canonical map.
