# Release checklist

1. Add the audio, cover and optional Lyrics file.
2. Update `js/catalog.js` and `js/catalog-metadata.js` using `guide.md`.
3. Confirm language, BPM, key, explicit status, duration and release date.
4. Run `npm install` and `npm run validate`.
5. Test Home, Discography, Favorites, Albums, Lyrics, Audio Lab and About.
6. Test a complete album queue, Shuffle, Repeat and lock-screen controls.
7. Review desktop and mobile visual-regression changes intentionally.
8. Increment `id` and `cache` in `js/build-config.js`.
9. Confirm SEO title, description and social image when branding changes.
10. Merge only after GitHub Actions is green, then verify GitHub Pages with a hard refresh.
