(() => {
  if (globalThis.__shinobiUiPolishV62Ready) return;
  globalThis.__shinobiUiPolishV62Ready = true;

  const MOBILE_QUERY = '(max-width:760px)';
  const INTERACTIVE_SELECTOR = 'button, a, input, select, textarea, summary, [role="button"], [contenteditable="true"]';

  function trackIdFromLyricsHref(entry) {
    const href = entry?.getAttribute?.('href') || '';
    const match = href.match(/^#lyrics=(.+)$/);
    if (!match) return '';
    try {
      return decodeURIComponent(match[1]);
    } catch {
      return match[1];
    }
  }

  function currentTrackId() {
    return document.querySelector('#audio')?.dataset.trackId || '';
  }

  function nestedInteractiveControl(target, entry) {
    if (!target?.closest || !entry?.contains) return false;
    const control = target.closest(INTERACTIVE_SELECTOR);
    return Boolean(control && control !== entry && entry.contains(control));
  }

  document.addEventListener('click', event => {
    if (!window.matchMedia?.(MOBILE_QUERY)?.matches) return;

    const entry = event.target.closest?.(
      '.mobile-nav [data-view="lyrics"], [data-view-target="lyrics"], a[href^="#lyrics="], [data-track-detail-route="lyrics"]'
    );
    if (!entry) return;

    // A routed surface may contain its own buttons (Favorite, Queue, transport, etc.).
    // Those nested controls own their click and must never be promoted to the
    // parent "open Lyrics Studio" action.
    if (nestedInteractiveControl(event.target, entry)) return;

    const trackId = trackIdFromLyricsHref(entry) || currentTrackId();
    if (!trackId) return;

    event.preventDefault();
    event.stopImmediatePropagation();

    const hash = `#studio=${encodeURIComponent(trackId)}`;
    if (window.location.hash === hash) {
      window.dispatchEvent(new HashChangeEvent('hashchange'));
      return;
    }
    window.location.hash = hash;
  }, true);
})();