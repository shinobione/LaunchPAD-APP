# Release checklist

## Track Manager

1. Open the private desktop Track Manager behind Cloudflare Access.
2. Create or edit the release manifest.
3. Upload audio, original cover, optional lyrics and optional video.
4. Confirm that `thumbnail.webp` exists; run **Optimiser les covers** when needed.
5. Confirm language, BPM, key, explicit status, duration, album and release date.
6. Enter duration as `mm:ss` and confirm it reopens unchanged; manifests store the value in canonical seconds.
7. Confirm both accent colours persist after reopening an older track.
8. Publish only when audio and cover are complete.
9. Rebuild the public catalog after lyrics or derived metadata changes.

## Lyrics

10. Open the public `/tracks/<slug>` response and confirm `lyricsAvailable` and `timestampsAvailable`.
11. Test Lyrics Studio from the beginning and after seeking into the track.
12. Confirm the single Track-detail `Lyrics` status and Lyrics Studio show the same synchronization state.
13. Test bracketed LRC and standalone timestamp-line formats when parsers change.

## Application and playback

14. Run `npm ci`, `npm run validate` and `npm run check:wrangler`.
15. Test Home, Discography, Favorites, Albums, Lyrics, Audio Lab, Streaming and About.
16. Test **Play favorites**, removal during playback, Shuffle and all Repeat modes inside the favorites queue.
17. Test first-tap playback on Android and desktop.
18. Test seeking, Next, Previous, Shuffle and Repeat.
19. Test Android notification/lock-screen identity, explicit SHINOBIWAN artwork and headset controls.
20. Test the installed PWA after completely closing the browser and application.
21. Review desktop and mobile visual-regression changes intentionally.

## Deployment order

22. Merge only after `Validate Launchpad` and `Validate Cloudflare Workers` are green.
23. Record the merge SHA; do not describe Worker source as deployed yet.
24. From `main`, dispatch **Deploy Cloudflare Workers** for `admin`, `public` or `both`, and enter `DEPLOY` in the confirmation field.
25. Approve the protected `cloudflare-production` environment when prompted.
26. Deploy the private Worker first when catalog-generation behavior changed.
27. Run the required Track Manager rebuild or optimization action.
28. Deploy the public Worker when its API or media behavior changed.
29. Review the GitHub job summary and record each Cloudflare version ID with the deployed Git SHA.
30. Confirm the automatic post-deployment checks passed: private Access protection, public `/health`, `/tracks`, HTTP Range `206`, and full-audio HEAD `200`.
31. Change the service-worker release namespace whenever existing PWA installations must refresh.
32. Verify GitHub Pages with a hard refresh and then verify the installed PWA.
33. Check one full `/tracks/<slug>` response after any catalog or parser change.
34. Report separately what is merged, published by Pages, deployed to Workers and rebuilt in R2; identify dashboard deployments separately from GitHub Actions deployments.

## Rollback

35. Use **Roll back Cloudflare Worker** only from `main` and enter `ROLLBACK` in the confirmation field.
36. Select one Worker and optionally provide a known Cloudflare version ID; leave it blank only when the immediately previous deployment is the intended target.
37. Approve the protected `cloudflare-production` environment and review the active deployment data in the job summary.
38. Confirm the post-rollback smoke test passes.
39. Remember that Worker rollback does not restore R2 objects or `catalog/index.json`.

## Cleanup safety

40. Run `npm run audit:r2` and `npm run audit:r2 -- --full-audio`, then archive both results before proposing deletion.
41. Do not remove bundled GitHub media until R2 playback, thumbnails, lyrics and mobile Media Session tests pass.
42. Require explicit approval before deleting any historical media.
43. After removal, confirm there are no dead paths in the service-worker precache list.
44. Confirm the repository size and GitHub Pages deployment after cleanup.
45. Update project documentation whenever the operating workflow changes.
