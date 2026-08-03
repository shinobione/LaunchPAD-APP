# Release checklist

## Track Manager

1. Open the private desktop Track Manager behind Cloudflare Access.
2. Create or edit the release manifest.
3. Upload audio, original cover, optional lyrics and optional video.
4. Confirm that `thumbnail.webp` exists; run **Optimiser les covers** when needed.
5. Confirm language, BPM, key, explicit status, duration, album and release date.
6. Publish only when audio and cover are complete.
7. Rebuild the public catalog after lyrics or derived metadata changes.

## Lyrics

8. Open the public `/tracks/<slug>` response and confirm `lyricsAvailable` and `timestampsAvailable`.
9. Test Lyrics Studio from the beginning and after seeking into the track.
10. Confirm Track detail and Lyrics Studio show the same synchronization state.
11. Test bracketed LRC and standalone timestamp-line formats when parsers change.

## Application and playback

12. Run `npm install` and `npm run validate`.
13. Test Home, Discography, Favorites, Albums, Lyrics, Audio Lab, Streaming and About.
14. Test first-tap playback on Android and desktop.
15. Test seeking, Next, Previous, Shuffle and Repeat.
16. Test Android notification/lock-screen identity and headset controls.
17. Test the installed PWA after completely closing the browser and application.
18. Review desktop and mobile visual-regression changes intentionally.

## Deployment order

19. Merge only after the `Validate Launchpad` workflow is green.
20. Deploy the private Worker first when catalog-generation behavior changed.
21. Run the required Track Manager rebuild or optimization action.
22. Deploy the public Worker when its API or media behavior changed.
23. Change the service-worker release namespace whenever existing PWA installations must refresh.
24. Verify GitHub Pages with a hard refresh and then verify the installed PWA.
25. Check `/health`, `/tracks` and one full `/tracks/<slug>` response.

## Cleanup safety

26. Do not remove bundled GitHub media until R2 playback, thumbnails, lyrics and mobile Media Session tests pass.
27. After removal, confirm there are no dead paths in the service-worker precache list.
28. Confirm the repository size and GitHub Pages deployment after cleanup.
29. Update `README.md`, `ARCHITECTURE.md`, `guide.md`, this checklist and `ROADMAP.md` whenever the operating workflow changes.
