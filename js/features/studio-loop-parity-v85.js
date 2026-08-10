(() => {
  const CANVAS_SELECTOR = 'video.lyrics-studio-canvas-video';
  const TRACK_PAGE_SELECTOR = '.lyrics-mobile-track-open';
  const patchedVideos = new WeakSet();
  const patchedButtons = new WeakSet();

  function stripPoster(video) {
    if (!(video instanceof HTMLVideoElement)) return;
    if (video.hasAttribute('poster')) video.removeAttribute('poster');
  }

  function patchCanvas(video) {
    if (!(video instanceof HTMLVideoElement) || patchedVideos.has(video)) return;
    patchedVideos.add(video);

    // Build 85 is deliberately passive: Track Video already proves that
    // native loop + preload=auto + no poster is seamless on the target Android.
    // Do not call play/pause/load, do not change src/currentTime and do not own loop.
    video.preload = 'auto';
    video.setAttribute('preload', 'auto');
    video.dataset.loopParity = 'track-video-v1';
    stripPoster(video);

    video.addEventListener('loadeddata', () => stripPoster(video));
    video.addEventListener('playing', () => stripPoster(video));

    const posterObserver = new MutationObserver(() => stripPoster(video));
    posterObserver.observe(video, { attributes: true, attributeFilter: ['poster'] });
  }

  function patchTrackPageButton(button) {
    if (!(button instanceof HTMLButtonElement) || patchedButtons.has(button)) return;
    patchedButtons.add(button);
    button.textContent = 'Track page →';
    button.setAttribute('aria-label', 'Open the full track page');
  }

  function scan(root = document) {
    if (root instanceof Element && root.matches(CANVAS_SELECTOR)) patchCanvas(root);
    if (root instanceof Element && root.matches(TRACK_PAGE_SELECTOR)) patchTrackPageButton(root);
    root.querySelectorAll?.(CANVAS_SELECTOR).forEach(patchCanvas);
    root.querySelectorAll?.(TRACK_PAGE_SELECTOR).forEach(patchTrackPageButton);
  }

  scan();

  const observer = new MutationObserver(records => {
    for (const record of records) {
      record.addedNodes.forEach(node => {
        if (node instanceof Element) scan(node);
      });
    }
  });

  observer.observe(document.documentElement, { childList: true, subtree: true });
})();
