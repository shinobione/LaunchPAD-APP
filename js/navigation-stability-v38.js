(() => {
  if (window.__shinobiNavigationStabilityV38) return;
  window.__shinobiNavigationStabilityV38 = true;

  const TRACK_HASH_PREFIX = '#track=';
  const TRACK_DETAIL_HISTORY_KEY = 'shinobiTrackDetail';
  const NOW_PLAYING_PATTERN = /^NOW\s+PLAYING$/i;

  function isTrackRoute() {
    return window.location.hash.startsWith(TRACK_HASH_PREFIX);
  }

  function markPassiveTrackRoute() {
    if (!isTrackRoute()) return;
    const current = window.history.state;
    const state = current && typeof current === 'object'
      ? { ...current, [TRACK_DETAIL_HISTORY_KEY]: true }
      : { [TRACK_DETAIL_HISTORY_KEY]: true };
    if (current?.[TRACK_DETAIL_HISTORY_KEY] === true) return;
    window.history.replaceState(state, '', window.location.href);
  }

  function hardResetScroll() {
    const main = document.querySelector('.main-content');
    if (main && main.scrollTop !== 0) main.scrollTop = 0;
    if (document.documentElement.scrollTop !== 0) document.documentElement.scrollTop = 0;
    if (document.body && document.body.scrollTop !== 0) document.body.scrollTop = 0;
    window.scrollTo(0, 0);
  }

  function scheduleScrollReset() {
    queueMicrotask(hardResetScroll);
    requestAnimationFrame(() => {
      hardResetScroll();
      requestAnimationFrame(hardResetScroll);
    });
  }

  function decorateNowPlayingBadges(root = document) {
    const wraps = [];
    if (root instanceof Element && root.matches('.album-card .cover-wrap')) wraps.push(root);
    root.querySelectorAll?.('.album-card .cover-wrap').forEach(wrap => wraps.push(wrap));

    wraps.forEach(wrap => {
      wrap.querySelectorAll('span,small,[class*="badge"],[class*="context"]').forEach(element => {
        if (!NOW_PLAYING_PATTERN.test(element.textContent.trim())) return;
        element.classList.add('now-playing-card-badge-v38');
      });
    });
  }

  function installDomGuards() {
    decorateNowPlayingBadges();

    const main = document.querySelector('.main-content');
    if (main) {
      new MutationObserver(records => {
        records.forEach(record => record.addedNodes.forEach(node => {
          if (node instanceof Element) decorateNowPlayingBadges(node);
        }));
      }).observe(main, { childList: true, subtree: true });
    }

    const audio = document.querySelector('#audio');
    if (audio) {
      new MutationObserver(() => requestAnimationFrame(() => decorateNowPlayingBadges()))
        .observe(audio, { attributes: true, attributeFilter: ['data-track-id'] });
      ['play', 'pause', 'loadedmetadata'].forEach(type => {
        audio.addEventListener(type, () => requestAnimationFrame(() => decorateNowPlayingBadges()));
      });
    }
  }

  try {
    window.history.scrollRestoration = 'manual';
  } catch {}

  // Mark shared/deep track routes before app-main installs its router. This prevents
  // the legacy router from briefly rendering Home before Track Detail takes over.
  markPassiveTrackRoute();

  window.addEventListener('hashchange', event => {
    // Library-memory intentionally dispatches a synthetic HashChangeEvent while it
    // restores the last audio track. Do not turn that internal restore into a detail route.
    if (event.isTrusted && isTrackRoute()) markPassiveTrackRoute();
    scheduleScrollReset();
  }, true);

  window.addEventListener('popstate', () => {
    if (isTrackRoute()) markPassiveTrackRoute();
    scheduleScrollReset();
  }, true);

  window.addEventListener('shinobi:route-change', () => {
    scheduleScrollReset();
    requestAnimationFrame(() => decorateNowPlayingBadges());
  });

  document.addEventListener('click', event => {
    const target = event.target instanceof Element ? event.target : null;
    if (!target) return;

    const quickAction = target.closest(
      '.play-overlay,.album-detail-play,.track-play,.memory-history-quick-play,[data-favorite-toggle]'
    );
    if (quickAction) return;

    const trackSurface = target.closest(
      'img[data-track-cover-link],.album-card[data-track-surface],.album-detail-track,.project-track,.memory-history-row[data-track-surface]'
    );
    if (trackSurface) scheduleScrollReset();
  }, true);

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', installDomGuards, { once: true });
  } else {
    installDomGuards();
  }
})();
