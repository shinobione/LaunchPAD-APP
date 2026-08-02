export function initLyricsWakeLock({
  audio = document.querySelector('#audio'),
  lyricsView = document.querySelector('#view-lyrics')
} = {}) {
  if (!audio || !lyricsView || !('wakeLock' in navigator)) return;

  let wakeLock = null;
  let requestInFlight = false;

  const shouldStayAwake = () =>
    document.visibilityState === 'visible' &&
    lyricsView.classList.contains('active') &&
    !audio.paused &&
    !audio.ended;

  async function acquire() {
    if (!shouldStayAwake() || wakeLock || requestInFlight) return;

    requestInFlight = true;
    try {
      const sentinel = await navigator.wakeLock.request('screen');
      wakeLock = sentinel;

      sentinel.addEventListener('release', () => {
        if (wakeLock === sentinel) wakeLock = null;
      }, { once: true });
    } catch (error) {
      console.warn('Screen wake lock unavailable:', error);
    } finally {
      requestInFlight = false;
    }
  }

  async function release() {
    const sentinel = wakeLock;
    wakeLock = null;

    if (!sentinel || sentinel.released) return;
    try {
      await sentinel.release();
    } catch (error) {
      console.warn('Unable to release screen wake lock:', error);
    }
  }

  function sync() {
    if (shouldStayAwake()) acquire();
    else release();
  }

  audio.addEventListener('play', sync);
  audio.addEventListener('pause', sync);
  audio.addEventListener('ended', sync);
  audio.addEventListener('emptied', sync);

  document.addEventListener('visibilitychange', sync);
  window.addEventListener('focus', sync);

  const viewObserver = new MutationObserver(sync);
  viewObserver.observe(lyricsView, {
    attributes: true,
    attributeFilter: ['class']
  });

  sync();
}
