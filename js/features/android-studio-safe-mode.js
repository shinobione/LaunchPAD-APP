(() => {
  'use strict';

  const mobile = window.matchMedia?.('(max-width:760px)');
  const android = /Android/i.test(navigator.userAgent || '');
  if (!android || !mobile?.matches) return;
  if (globalThis.__shinobiAndroidStudioFetchGuard) return;

  globalThis.__shinobiAndroidStudioFetchGuard = true;

  function studioView() {
    return document.querySelector('#view-lyrics');
  }

  function studioActive() {
    const view = studioView();
    return Boolean(view?.classList.contains('active') && view.classList.contains('lyrics-studio-mode'));
  }

  function absoluteUrl(value) {
    try {
      return new URL(String(value || ''), document.baseURI).href;
    } catch {
      return '';
    }
  }

  function requestUrl(input) {
    if (typeof input === 'string') return absoluteUrl(input);
    if (input instanceof URL) return absoluteUrl(input.href);
    if (typeof Request !== 'undefined' && input instanceof Request) return absoluteUrl(input.url);
    return absoluteUrl(input?.url || '');
  }

  function isLyricsStudioCanvasRequest(input) {
    if (!studioActive()) return false;
    const video = studioView()?.querySelector('video.lyrics-studio-canvas-video');
    const expected = absoluteUrl(video?.dataset?.src || '');
    const requested = requestUrl(input);
    return Boolean(expected && requested && expected === requested);
  }

  function injectStyle() {
    if (document.getElementById('android-studio-safe-style')) return;
    const style = document.createElement('style');
    style.id = 'android-studio-safe-style';
    style.textContent = `
      #view-lyrics.lyrics-studio-mode [data-lyrics-studio="canvas"]{display:none!important}
      #view-lyrics.lyrics-studio-mode .lyrics-studio-canvas-badge{font-size:0!important}
      #view-lyrics.lyrics-studio-mode .lyrics-studio-canvas-badge::after{content:"MOBILE SAFE VISUAL";font-size:9px;line-height:1.1;letter-spacing:.12em}
    `;
    document.head.appendChild(style);
  }

  const nativeFetch = globalThis.fetch.bind(globalThis);
  globalThis.fetch = function androidStudioSafeFetch(input, init) {
    if (isLyricsStudioCanvasRequest(input)) {
      const error = new Error('Android Lyrics Studio Canvas disabled by decoder safety guard.');
      error.name = 'AndroidStudioCanvasDisabledError';
      return Promise.reject(error);
    }
    return nativeFetch(input, init);
  };

  injectStyle();
})();
