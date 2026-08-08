# LaunchPAD release checklist

> Current application build: `2026.08.08.66` — release `studio-metadata-validation-20260808`.

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
18. For admin-tool changes, confirm `?admin=1` exposes SonicTrace, LRC Maker and Track Manager only on desktop, `?admin=0` removes all three, and all three render as the same pill family; SonicTrace must visibly carry the cyan/teal `ST` treatment.
19. For Studio bridge changes, run `npm run check:studio-private-read-bridge` and verify the exact GitHub Pages origin plus Cloudflare Access boundary remain intact.
20. Build 66 permits exactly one cross-origin POST: `/api/studio/tracks/<slug>/metadata/validate`. Confirm it requires `X-Shinobiwan-Studio-Intent: metadata-validate-v1`, JSON and `expectedUpdatedAt`.
21. Confirm the Build 66 validation module contains no `writeManifest`, `writeCatalogIndex`, R2 `put/delete`, upload/delete helper or publication mutation.
22. Confirm Studio health reports `validate: ["metadata"]` and still reports `write: []`.
23. Confirm every other Track Manager `POST`, `PUT`, `PATCH` and `DELETE` remains protected by `enforceSameOrigin()`.

## 2. Pull request / merge

24. Open a PR into `main`.
25. Require green **Validate Launchpad**, **Validate Cloudflare Workers**, and **Validate Horizontal Overflow**.
26. Review regressions rather than weakening tests to match a bug.
27. Merge only when the PR represents the complete intended source state.
28. Confirm GitHub auto-deletes the merged head branch.

## 3. Web deployment

### GitHub Pages

29. A push to `main` triggers **Deploy LaunchPAD to GitHub Pages**.
30. Confirm the artifact build/validation and Pages deployment succeed.
31. Hard-refresh `https://shinobione.github.io/LaunchPAD-APP/` and confirm Build/Release in About.

### Cloudflare Pages staging

32. Confirm staging tracked the same `main` merge SHA.
33. Its compatibility command remains:

```bash
node scripts/build-cloudflare-pages.mjs && node scripts/validate-cloudflare-pages-build.mjs
```

34. Confirm `https://shinobiwan-launchpad-staging.pages.dev/` reports the same Build/Release.

## 4. Audio / Audio Lab release checks

35. Verify clean playback with Audio Lab closed.
36. Verify clean playback with Audio Lab open and while switching presets.
37. Verify background playback after leaving/minimizing the PWA.
38. Verify track A → B → C while staying in Audio Lab.
39. Spectrum must track the current song immediately after its analyser is live.
40. Neon Shatter must visibly move/deform from real FFT/kick activity and settle when paused.
41. Liquid Chrome must visibly pulse/deform with bass/mid/high activity and settle when paused.
42. Pulse Reactor must keep continuous drift/ring travel and visibly expand/twist on low-frequency impact in already-dense sections.
43. Bass Fracture must keep body roll/plate glide and visibly rupture/compress on low-frequency impact; mobile keeps 12 sectors and gains no extra geometry.
44. Gravity Lens must keep continuous precession/stream sweep and visibly snap into stretch/rotation on low-frequency impact.
45. Bio Structure must keep continuous organism motion and visibly contract/expand as a whole body on low-frequency impact.
46. Void Bloom must continuously breathe/orbit/flex while real audio exists; bass opens/deepens the bloom, mids twist petals and highs light/travel along the veins.
47. Void Bloom direct impact must visibly expand and twist the whole bloom on kick/bass onsets even inside dense sections.
48. Creep Signal must continuously travel across the canvas; its body must undulate, alternating branches must whip independently and highs/transients must visibly travel through the network.
49. Creep Signal direct impact must produce a distinct lateral lunge/shear/compression on kick/bass onsets rather than merely increasing the ordinary body amplitude.
50. During a dense section, `audioLabPunch` should rise/fall around kick or bass onsets even if `audioLabBass` stays relatively high.
51. `audioLabVisualImpact` must produce short spikes derived from rising punch/kick/low-band contrast and must not remain pinned high through a loud passage.
52. Direct impact must be applied after normal renderer pose computation rather than being folded back into saturated bass/kick spring targets.
53. Neon Shatter and Liquid Chrome must not receive the direct-impact transform; their calibration is baseline-protected.
54. All kinetic modes must stop integrated phase speed and settle their spring/impact envelopes after pause/silence.
55. Audio Lab must expose exactly nine controls: Neon Shatter, Spectrum, Liquid Chrome, Pulse Reactor, Bass Fracture, Gravity Lens, Bio Structure, Void Bloom and Creep Signal.
56. Mobile budgets: Pulse Reactor 3 rings / 14 segments / 10 spokes / DPR 1.1; Bass Fracture 2 layers / 12 sectors / 8 cracks / DPR 1.05; Gravity Lens 4 bands / 12 arcs / 8 streams / DPR 1.05; Bio Structure 5 ribs / 8 nerve impulses / 6 spine nodes / DPR 1.05; Void Bloom 7 petals / 7 veins / DPR 1.05; Creep Signal 9 body nodes / 6 branches / 7 pulses / DPR 1.05.
57. Re-test Android and desktop separately because media/visibility lifecycles differ.

## 5. Lyrics / Studio / Canvas checks

58. On mobile, Track Detail → Lyrics should open that track's Studio when synchronized lyrics exist.
59. Treat timestamped canonical `lyrics.txt` as synchronized content; do not require a duplicate `.lrc` file for completeness.
60. Mobile bottom navigation remains visible in Studio.
61. The global mini-player stays above the bottom navigation.
62. Canvas should be muted, `playsinline`, loop reliably and resume after visibility/lifecycle interruptions when allowed.
63. Lyrics auto-scroll stays inside its reader and does not fight page scrolling.

## 6. Track Manager / R2 publication

64. Use the private Track Manager behind Cloudflare Access.
65. Create/edit canonical manifests and upload audio/cover/optional lyrics/Canvas.
66. Confirm thumbnail, metadata, content rating and publishability.
67. Rebuild `catalog/index.json` only when manifest/derived metadata needs refreshing.
68. Verify one full `/tracks/<slug>` response after parser/index changes.
69. For Build 66 specifically, verify metadata validation changes **nothing** in the manifest timestamp, assets, catalog index or object counts.

## 7. Worker deployment

70. Worker deployment is **not** implied by a PWA merge.
71. From `main`, dispatch **Deploy Cloudflare Workers** for `public`, `admin` or `both`.
72. For Build 66, deploy **admin only**; the public Worker has no contract change.
73. Approve the protected environment and verify health/Access checks.
74. Verify `/api/studio/health` reports Track Manager v5.9, bridge v1.1, `validate: ["metadata"]`, `write: []`.
75. Verify authenticated GET private reads still work from Studio.
76. Verify the metadata-validation CORS preflight accepts POST only on the exact `/metadata/validate` route and rejects POST elsewhere under `/api/studio/*`.
77. Verify a validation POST with the correct intent header returns `validationOnly: true` and does not alter `updatedAt`.
78. Verify a stale `expectedUpdatedAt` returns `409` / `STALE_MANIFEST`.
79. Verify existing Track Manager create/edit/delete still works from its own origin after deployment.
80. Record source SHA and deployed Worker version IDs.

## 8. Rollback

81. Web rollback is a revert/fix in `main` followed by canonical redeployment, never a host-only patch.
82. Worker rollback uses the protected rollback workflow.
83. Worker rollback does not restore R2 objects or catalog state.
84. Global pre-Studio integration restoration branch: `safety/pre-studio-integration-20260808-1048`.
85. Build 66 pre-4B.1A restoration branch: `safety/pre-phase-4b1a-20260808-1452`.
86. Prefer a normal PR revert first and use a safety snapshot only if necessary.

## 9. Repository hygiene

87. `main` remains the only normal persistent source-of-truth branch; named `safety/*` branches are rollback references only.
88. Keep auto-delete merged-head branches enabled.
89. Keep documentation synchronized with the active build; CI enforces the exact markers.
90. Keep Lovable prototype-only unless deliberately promoted through GitHub.
91. Do not delete compatibility files just because their names contain an old version; first prove they are no longer wired into runtime/CI/deployment.
92. Add Audio Lab effects one at a time and isolate new renderers when practical.
93. Keep continuous movement, onset detection and direct visual impact as separate contracts; do not solve missing kick impact by adding permanent geometry or autonomous animation.
94. Prefer genuinely different composition/motion languages for new visual families rather than repeating the same centered radial object.
95. Report merged/deployed states separately: source, GitHub Pages, Cloudflare Pages, public Worker, private Worker, R2 catalog/media.

See [`docs/DEPLOYMENT-TOPOLOGY.md`](docs/DEPLOYMENT-TOPOLOGY.md) for the canonical map.
