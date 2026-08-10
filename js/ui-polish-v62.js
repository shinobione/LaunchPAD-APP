(() => {
  if (globalThis.__shinobiUiPolishV62Ready) return;
  globalThis.__shinobiUiPolishV62Ready = true;

  const MOBILE_QUERY = '(max-width:760px)';

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

  document.addEventListener('click', event => {
    if (!window.matchMedia?.(MOBILE_QUERY)?.matches) return;

    const entry = event.target.closest?.(
      '.mobile-nav [data-view="lyrics"], [data-view-target="lyrics"], a[href^="#lyrics="], [data-track-detail-route="lyrics"]'
    );
    if (!entry) return;

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
