(() => {
  'use strict';

  const mobile = window.matchMedia?.('(max-width:760px)');
  const android = /Android/i.test(navigator.userAgent || '');
  if (!android || !mobile?.matches) return;

  // Build 81: Android Studio safety is owned directly by lyrics-studio.js.
  // Keep this bootstrap marker for release ancestry, but do not patch fetch,
  // clone controls, observe the DOM or create any competing media owner here.
  globalThis.__shinobiAndroidStudioSourceGuard = true;
})();
