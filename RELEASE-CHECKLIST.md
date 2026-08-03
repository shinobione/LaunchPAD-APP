
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
24. From `main`, dispatch **Deploy Cloudflare Workers** for `admin`, `public` or `both` as required.
25. Deploy the private Worker first when catalog-generation behavior changed.
26. Run the required Track Manager rebuild or optimization action.
27. Deploy the public Worker when its API or media behavior changed.
28. Change the service-worker release namespace whenever existing PWA installations must refresh.
29. Verify GitHub Pages with a hard refresh and then verify the installed PWA.
30. Check `/health`, `/tracks` and one full `/tracks/<slug>` response.
31. Report separately what is merged, published by Pages, deployed to Workers and rebuilt in R2; identify dashboard deployments separately from GitHub Actions deployments.

## Cleanup safety

32. Run `npm run audit:r2` and `npm run audit:r2 -- --full-audio`, then archive both results before proposing deletion.
33. Do not remove bundled GitHub media until R2 playback, thumbnails, lyrics and mobile Media Session tests pass.
34. Require explicit approval before deleting any historical media.
35. After removal, confirm there are no dead paths in the service-worker precache list.
36. Confirm the repository size and GitHub Pages deployment after cleanup.
37. Update every project Markdown file whenever the operating workflow changes.

