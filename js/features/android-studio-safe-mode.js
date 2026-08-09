(() => {
  'use strict';

  const mobile = window.matchMedia?.('(max-width:760px)');
  const android = /Android/i.test(navigator.userAgent || '');
  if (!android || !mobile?.matches) return;

  let installed = false;
  let internalCanvasToggle = false;
  let safeEnabled = true;
  let safeButton = null;
  let safeShell = null;
  let safeImage = null;

  function studioView() {
    return document.querySelector('#view-lyrics');
  }

  function studioActive() {
    const view = studioView();
    return Boolean(view?.classList.contains('active') && view.classList.contains('lyrics-studio-mode'));
  }

  function injectStyle() {
    if (document.getElementById('android-studio-safe-style')) return;
    const style = document.createElement('style');
    style.id = 'android-studio-safe-style';
    style.textContent = `
      .lyrics-studio-canvas.android-studio-safe-canvas{display:grid!important;position:relative;overflow:hidden;background:linear-gradient(145deg,rgba(255,255,255,.025),rgba(0,0,0,.18))}
      .lyrics-studio-canvas.android-studio-safe-canvas[hidden]{display:none!important}
      .android-studio-safe-canvas img{width:100%;height:100%;min-height:100%;display:block;object-fit:cover;transform:scale(1.02);animation:androidStudioSafeDrift 7.5s ease-in-out infinite alternate;filter:saturate(.92) contrast(1.04)}
      .android-studio-safe-canvas::after{content:"";position:absolute;inset:0;pointer-events:none;background:radial-gradient(circle at 32% 26%,transparent 0 30%,rgba(3,2,8,.16) 75%),linear-gradient(120deg,transparent 20%,rgba(255,255,255,.035) 48%,transparent 72%);mix-blend-mode:screen}
      .android-studio-safe-badge{position:absolute;left:10px;bottom:10px;z-index:2;padding:5px 8px;border-radius:999px;border:1px solid color-mix(in srgb,var(--accent,#a63cff) 48%,transparent);background:rgba(7,4,15,.76);backdrop-filter:blur(10px);font:700 9px/1.1 Manrope,sans-serif;letter-spacing:.12em;color:#f5f1ff}
      @keyframes androidStudioSafeDrift{0%{transform:scale(1.02) translate3d(-.8%,0,0)}50%{transform:scale(1.075) translate3d(.7%,-.7%,0)}100%{transform:scale(1.04) translate3d(0,.5%,0)}}
      @media(prefers-reduced-motion:reduce){.android-studio-safe-canvas img{animation:none;transform:scale(1.02)}}
    `;
    document.head.appendChild(style);
  }

  function centerActiveLyric() {
    const reader = document.querySelector('#lyrics-reader');
    const active = reader?.querySelector('.lyric-line.active');
    if (!reader || !active) return;
    const rr = reader.getBoundingClientRect();
    const er = active.getBoundingClientRect();
    const viewport = reader.clientHeight || rr.height || 0;
    if (!viewport) return;
    const requested = reader.scrollTop + (er.top - rr.top) - (viewport - er.height) / 2;
    const maximum = Math.max(0, reader.scrollHeight - viewport);
    reader.scrollTo({ top: Math.min(maximum, Math.max(0, requested)), behavior: 'auto' });
  }

  function settleLyricsAfterSeek() {
    requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(centerActiveLyric)));
  }

  function ensureSafeShell() {
    if (safeShell?.isConnected) return safeShell;
    const view = studioView();
    const panel = view?.querySelector('.lyrics-track-panel');
    if (!panel) return null;

    safeShell = document.createElement('div');
    safeShell.className = 'lyrics-studio-canvas android-studio-safe-canvas';
    safeShell.dataset.androidStudioSafe = 'true';
    safeShell.hidden = !safeEnabled;
    safeShell.setAttribute('aria-hidden', String(!safeEnabled));

    safeImage = document.createElement('img');
    safeImage.alt = '';
    safeImage.decoding = 'async';
    safeImage.setAttribute('aria-hidden', 'true');

    const badge = document.createElement('span');
    badge.className = 'android-studio-safe-badge';
    badge.textContent = 'MOBILE SAFE VISUAL';
    safeShell.append(safeImage, badge);

    const toggle = panel.querySelector('.lyrics-mobile-track-toggle');
    if (toggle?.nextSibling) panel.insertBefore(safeShell, toggle.nextSibling);
    else panel.prepend(safeShell);
    return safeShell;
  }

  function syncSafeArtwork() {
    ensureSafeShell();
    const cover = document.querySelector('#lyrics-cover');
    const src = cover?.currentSrc || cover?.src || '';
    if (safeImage && src && safeImage.src !== src) safeImage.src = src;
    if (safeShell) {
      safeShell.hidden = !safeEnabled || !studioActive();
      safeShell.setAttribute('aria-hidden', String(safeShell.hidden));
    }
    if (safeButton) {
      safeButton.setAttribute('aria-pressed', String(safeEnabled));
      safeButton.classList.toggle('active', safeEnabled);
      safeButton.textContent = safeEnabled ? 'Canvas on' : 'Canvas off';
      safeButton.title = 'Android Studio uses a decoder-safe animated visual so audio playback remains authoritative.';
    }
  }

  function disableOriginalCanvasAndReplaceControl() {
    const view = studioView();
    if (!view) return false;
    const originalShell = view.querySelector('.lyrics-studio-canvas:not(.android-studio-safe-canvas)');
    const originalButton = view.querySelector('[data-lyrics-studio="canvas"]');
    if (!originalButton) return false;

    if (!originalButton.dataset.androidSafeDetached) {
      if (originalButton.getAttribute('aria-pressed') !== 'false') {
        internalCanvasToggle = true;
        originalButton.click();
        internalCanvasToggle = false;
      }

      const replacement = originalButton.cloneNode(true);
      replacement.dataset.androidSafeControl = 'true';
      replacement.removeAttribute('hidden');
      replacement.hidden = false;
      originalButton.dataset.androidSafeDetached = 'true';
      originalButton.replaceWith(replacement);
      safeButton = replacement;
      safeButton.addEventListener('click', event => {
        event.preventDefault();
        event.stopPropagation();
        safeEnabled = !safeEnabled;
        syncSafeArtwork();
      });
    } else if (!safeButton?.isConnected) {
      safeButton = view.querySelector('[data-android-safe-control="true"]');
    }

    if (originalShell) {
      originalShell.hidden = true;
      originalShell.setAttribute('aria-hidden', 'true');
      originalShell.style.setProperty('display', 'none', 'important');
      const video = originalShell.querySelector('video');
      try { video?.pause(); } catch {}
    }

    ensureSafeShell();
    syncSafeArtwork();
    return true;
  }

  function activate() {
    if (!studioActive()) {
      if (safeShell) safeShell.hidden = true;
      return;
    }
    disableOriginalCanvasAndReplaceControl();
    syncSafeArtwork();
  }

  function install() {
    if (installed) return;
    installed = true;
    injectStyle();

    document.addEventListener('click', event => {
      if (internalCanvasToggle || !studioActive()) return;
      const line = event.target.closest?.('#lyrics-reader .lyric-line[data-time]');
      if (!line) return;
      const audio = document.querySelector('#audio');
      const time = Number(line.dataset.time);
      if (!audio || !Number.isFinite(time)) return;

      event.preventDefault();
      event.stopImmediatePropagation();
      window.dispatchEvent(new CustomEvent('shinobi:seek-commit', { detail: { time, source: 'android-studio-line' } }));
      try { audio.currentTime = time; } catch {}
      if (audio.paused) audio.play().catch(() => {});
      settleLyricsAfterSeek();
    }, true);

    const audio = document.querySelector('#audio');
    audio?.addEventListener('seeked', () => {
      if (studioActive()) settleLyricsAfterSeek();
    });
    audio?.addEventListener('playing', () => {
      if (studioActive()) settleLyricsAfterSeek();
    });

    new MutationObserver(() => {
      if (!studioActive()) return;
      queueMicrotask(activate);
    }).observe(document.documentElement, { childList: true, subtree: true });

    if (audio) {
      new MutationObserver(() => requestAnimationFrame(syncSafeArtwork)).observe(audio, {
        attributes: true,
        attributeFilter: ['data-track-id']
      });
    }

    window.addEventListener('shinobi:route-change', () => queueMicrotask(activate));
    window.addEventListener('hashchange', () => queueMicrotask(activate));
    window.addEventListener('pageshow', () => queueMicrotask(activate));
    activate();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install, { once: true });
  else install();
})();
