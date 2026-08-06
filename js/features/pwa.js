import { ensureStylesheet, versionedAsset } from '../core/assets.js';

const UPDATE_DISMISS_KEY = 'shinobi-pwa-update-dismissed-release';
const UPDATE_ACCEPTED_KEY = 'shinobi-pwa-update-accepted-release';
const RELOAD_REQUEST_KEY = 'shinobi-pwa-update-reload-requested';
const INSTALL_DISMISS_KEY = 'shinobi-pwa-install-dismissed-at';
const UPDATE_CHECK_INTERVAL = 2 * 60 * 1000;
const INSTALL_DISMISS_MS = 3 * 24 * 60 * 60 * 1000;
const ACTIVATION_TIMEOUT_MS = 9000;
const WORKER_RELEASE_TIMEOUT_MS = 1800;
const RELEASE_CHANNEL = 'shinobi-pwa-release';

let capturedInstallPrompt = null;
let installPromptListenerReady = false;

function captureInstallPrompt() {
  if (installPromptListenerReady) return;
  installPromptListenerReady = true;
  window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault();
    capturedInstallPrompt = event;
    window.dispatchEvent(new CustomEvent('shinobi:pwa-install-ready'));
  });
}

captureInstallPrompt();

function ensureMeta(name, content) {
  let meta = document.head.querySelector(`meta[name="${name}"]`);
  if (!meta) {
    meta = document.createElement('meta');
    meta.name = name;
    document.head.appendChild(meta);
  }
  meta.content = content;
}

function safeStorageGet(storage, key) {
  try {
    return storage?.getItem(key) || null;
  } catch {
    return null;
  }
}

function safeStorageSet(storage, key, value) {
  try {
    storage?.setItem(key, value);
  } catch {
    // Hardened browsing modes may block web storage.
  }
}

function safeStorageRemove(storage, key) {
  try {
    storage?.removeItem(key);
  } catch {
    // Hardened browsing modes may block web storage.
  }
}

export function preparePWAHead() {
  captureInstallPrompt();
  if (!document.head.querySelector('link[rel="manifest"]')) {
    const manifest = document.createElement('link');
    manifest.rel = 'manifest';
    manifest.href = versionedAsset('manifest.webmanifest');
    document.head.appendChild(manifest);
  }

  ensureMeta('theme-color', '#07040f');
  ensureMeta('mobile-web-app-capable', 'yes');
  ensureMeta('apple-mobile-web-app-capable', 'yes');
  ensureMeta('apple-mobile-web-app-status-bar-style', 'black-translucent');
  ensureMeta('apple-mobile-web-app-title', 'SHINOBIWAN');
}

function isStandalone() {
  return window.matchMedia?.('(display-mode: standalone)').matches
    || window.navigator.standalone === true;
}

function isIOS() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function createToast() {
  const toast = document.createElement('div');
  toast.className = 'pwa-toast';
  toast.setAttribute('role', 'status');
  toast.setAttribute('aria-live', 'polite');
  document.body.appendChild(toast);

  let timer;
  return message => {
    window.clearTimeout(timer);
    toast.textContent = message;
    toast.classList.add('show');
    timer = window.setTimeout(() => toast.classList.remove('show'), 4200);
  };
}

function createInstallBanner() {
  const existing = document.querySelector('#pwa-install-banner');
  if (existing) return existing;

  const banner = document.createElement('section');
  banner.id = 'pwa-install-banner';
  banner.className = 'pwa-install-banner';
  banner.hidden = true;
  banner.setAttribute('role', 'region');
  banner.setAttribute('aria-live', 'polite');
  banner.setAttribute('aria-label', 'Install LaunchPAD');
  banner.innerHTML = `
    <div class="pwa-install-copy">
      <span class="pwa-install-icon" aria-hidden="true">LP</span>
      <span>
        <strong>Install LaunchPAD</strong>
        <small>One-tap access, fullscreen Canvas and a smoother app experience.</small>
      </span>
    </div>
    <div class="pwa-install-actions">
      <button type="button" class="primary" data-pwa-install-now>Install the app</button>
      <button type="button" class="secondary" data-pwa-install-later>Not now</button>
    </div>
  `;
  document.body.appendChild(banner);
  return banner;
}

function createUpdateBanner() {
  const existing = document.querySelector('#pwa-update-banner');
  if (existing) return existing;

  const banner = document.createElement('section');
  banner.id = 'pwa-update-banner';
  banner.className = 'pwa-update-banner';
  banner.hidden = true;
  banner.setAttribute('role', 'status');
  banner.setAttribute('aria-live', 'polite');
  banner.setAttribute('aria-label', 'LaunchPAD update available');
  banner.innerHTML = `
    <div class="pwa-update-copy">
      <span class="pwa-update-icon" aria-hidden="true">↻</span>
      <span>
        <strong>A new version of LaunchPAD is available.</strong>
        <small>The update will be applied without abruptly interrupting the music.</small>
      </span>
    </div>
    <div class="pwa-update-actions">
      <button type="button" class="primary" data-pwa-update-now>Update now</button>
      <button type="button" class="secondary" data-pwa-update-later>Later</button>
    </div>
  `;
  document.body.appendChild(banner);
  return banner;
}

function bannerShow(banner) {
  banner.hidden = false;
  window.requestAnimationFrame(() => banner.classList.add('show'));
}

function bannerHide(banner, { immediate = false } = {}) {
  banner.classList.remove('show');
  if (immediate) {
    banner.hidden = true;
    return;
  }
  window.setTimeout(() => {
    if (!banner.classList.contains('show')) banner.hidden = true;
  }, 220);
}

export function readWorkerRelease(worker, {
  MessageChannelClass = globalThis.MessageChannel,
  timeout = WORKER_RELEASE_TIMEOUT_MS
} = {}) {
  if (!worker?.postMessage || typeof MessageChannelClass !== 'function') return Promise.resolve(null);

  return new Promise(resolve => {
    const channel = new MessageChannelClass();
    let settled = false;
    const finish = release => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      channel.port1.close?.();
      channel.port2.close?.();
      resolve(typeof release === 'string' && release ? release : null);
    };
    const timer = window.setTimeout(() => finish(null), timeout);
    channel.port1.onmessage = event => finish(event.data?.release || null);
    channel.port1.start?.();

    try {
      worker.postMessage({ type: 'GET_RELEASE' }, [channel.port2]);
    } catch {
      finish(null);
    }
  });
}

export function createPWAUpdateController({
  audio = document.querySelector('#audio'),
  serviceWorker = navigator.serviceWorker,
  storage = window.sessionStorage,
  currentRelease = globalThis.SHINOBIWAN_BUILD?.release || 'development',
  reload = () => window.location.reload(),
  notify = () => {}
} = {}) {
  const banner = createUpdateBanner();
  const updateButton = banner.querySelector('[data-pwa-update-now]');
  const laterButton = banner.querySelector('[data-pwa-update-later]');
  const title = banner.querySelector('strong');
  const subtitle = banner.querySelector('small');

  let waitingWorker = null;
  let pendingRelease = null;
  let deferredUntilPlaybackStops = false;
  let activationRequested = false;
  let refreshing = false;
  let activationTimer = 0;
  let dismissedRelease = safeStorageGet(storage, UPDATE_DISMISS_KEY);
  let acceptedRelease = safeStorageGet(storage, UPDATE_ACCEPTED_KEY);
  const reloadWasRequested = safeStorageGet(storage, RELOAD_REQUEST_KEY) === '1';

  if (acceptedRelease === currentRelease) {
    acceptedRelease = null;
    safeStorageRemove(storage, UPDATE_ACCEPTED_KEY);
    safeStorageRemove(storage, RELOAD_REQUEST_KEY);
  }

  function resetCopy() {
    banner.dataset.state = 'ready';
    title.textContent = 'A new version of LaunchPAD is available.';
    subtitle.textContent = 'The update will be applied without abruptly interrupting the music.';
    updateButton.textContent = 'Update now';
    updateButton.disabled = false;
    laterButton.disabled = false;
  }

  function hide(options) {
    bannerHide(banner, options);
  }

  function show(worker, { release = null } = {}) {
    const targetRelease = release || 'next';
    if (!worker || activationRequested || targetRelease === currentRelease) return false;
    if (dismissedRelease === targetRelease || acceptedRelease === targetRelease) return false;

    waitingWorker = worker;
    if (!banner.hidden && pendingRelease === targetRelease) return false;

    pendingRelease = targetRelease;
    banner.dataset.release = targetRelease;
    resetCopy();
    bannerShow(banner);
    return true;
  }

  function completeWithReload() {
    if (refreshing) return;
    refreshing = true;
    window.clearTimeout(activationTimer);
    safeStorageRemove(storage, RELOAD_REQUEST_KEY);
    hide({ immediate: true });
    reload();
  }

  function requestActivation() {
    if (activationRequested || !waitingWorker) return false;

    deferredUntilPlaybackStops = false;
    activationRequested = true;
    acceptedRelease = pendingRelease || 'next';
    safeStorageSet(storage, UPDATE_ACCEPTED_KEY, acceptedRelease);
    safeStorageSet(storage, RELOAD_REQUEST_KEY, '1');
    safeStorageRemove(storage, UPDATE_DISMISS_KEY);
    banner.dataset.state = 'applying';
    title.textContent = 'Updating LaunchPAD…';
    subtitle.textContent = 'The app will reload once when the latest version takes control.';
    updateButton.textContent = 'Installing…';
    updateButton.disabled = true;
    laterButton.disabled = true;
    waitingWorker.postMessage({ type: 'SKIP_WAITING' });

    activationTimer = window.setTimeout(() => {
      notify('The update is ready. Reloading LaunchPAD.');
      completeWithReload();
    }, ACTIVATION_TIMEOUT_MS);
    return true;
  }

  function deferActivation() {
    deferredUntilPlaybackStops = true;
    banner.dataset.state = 'deferred';
    title.textContent = 'Update pending';
    subtitle.textContent = 'It will install as soon as the track is paused or finishes.';
    updateButton.textContent = 'Waiting…';
    updateButton.disabled = true;
    notify('The update is waiting for the track to pause or finish.');
  }

  function handleUpdateClick() {
    if (audio && !audio.paused && !audio.ended) {
      deferActivation();
      return;
    }
    requestActivation();
  }

  function handleLaterClick() {
    deferredUntilPlaybackStops = false;
    dismissedRelease = pendingRelease || 'next';
    safeStorageSet(storage, UPDATE_DISMISS_KEY, dismissedRelease);
    hide();
  }

  function handlePlaybackStop() {
    if (deferredUntilPlaybackStops) requestActivation();
  }

  function handleControllerChange() {
    if (refreshing) return;
    if (!activationRequested && !reloadWasRequested) return;
    completeWithReload();
  }

  updateButton.addEventListener('click', handleUpdateClick);
  laterButton.addEventListener('click', handleLaterClick);
  audio?.addEventListener('pause', handlePlaybackStop);
  audio?.addEventListener('ended', handlePlaybackStop);
  serviceWorker?.addEventListener('controllerchange', handleControllerChange);

  return {
    show,
    hide,
    requestActivation,
    isVisible: () => !banner.hidden,
    isDeferred: () => deferredUntilPlaybackStops,
    pendingRelease: () => pendingRelease,
    destroy() {
      window.clearTimeout(activationTimer);
      updateButton.removeEventListener('click', handleUpdateClick);
      laterButton.removeEventListener('click', handleLaterClick);
      audio?.removeEventListener('pause', handlePlaybackStop);
      audio?.removeEventListener('ended', handlePlaybackStop);
      serviceWorker?.removeEventListener('controllerchange', handleControllerChange);
      banner.remove();
    }
  };
}

function parseRemoteRelease(source) {
  return source.match(/release:\s*['"]([^'"]+)['"]/)?.[1] || null;
}

export function initPWA() {
  if (window.__shinobiPWAReady) return;
  window.__shinobiPWAReady = true;
  preparePWAHead();
  ensureStylesheet('css/pwa.css');

  const notify = createToast();
  const installBanner = createInstallBanner();
  const installButton = installBanner.querySelector('[data-pwa-install-now]');
  const installLater = installBanner.querySelector('[data-pwa-install-later]');
  const installTitle = installBanner.querySelector('strong');
  const installSubtitle = installBanner.querySelector('small');
  const audio = document.querySelector('#audio');
  const currentRelease = globalThis.SHINOBIWAN_BUILD?.release || 'development';
  let registration = null;
  let lastUpdateCheck = 0;
  let updateCheckPromise = null;
  let updateController = null;
  let remoteRelease = currentRelease;
  let releaseChannel = null;
  let lastAnnouncedRelease = currentRelease;

  function installDismissed() {
    const dismissedAt = Number(safeStorageGet(window.localStorage, INSTALL_DISMISS_KEY));
    return Number.isFinite(dismissedAt) && Date.now() - dismissedAt < INSTALL_DISMISS_MS;
  }

  function canOfferInstall() {
    return !isStandalone()
      && !installDismissed()
      && (Boolean(capturedInstallPrompt) || isIOS());
  }

  function syncInstallBanner() {
    if (!canOfferInstall() || updateController?.isVisible()) {
      bannerHide(installBanner, { immediate: true });
      return;
    }
    installTitle.textContent = isIOS() ? 'Add LaunchPAD to your Home Screen' : 'Install LaunchPAD';
    installSubtitle.textContent = isIOS()
      ? 'Open Share, then choose “Add to Home Screen” for the full app experience.'
      : 'One-tap access, fullscreen Canvas and a smoother app experience.';
    installButton.textContent = isIOS() ? 'Show me how' : 'Install the app';
    bannerShow(installBanner);
  }

  function syncConnectivity() {
    document.documentElement.dataset.connectivity = navigator.onLine ? 'online' : 'offline';
    if (!navigator.onLine) notify('Offline mode: the LaunchPAD interface and cached covers remain available.');
  }

  window.addEventListener('shinobi:pwa-install-ready', syncInstallBanner);
  window.addEventListener('appinstalled', () => {
    capturedInstallPrompt = null;
    safeStorageRemove(window.localStorage, INSTALL_DISMISS_KEY);
    bannerHide(installBanner, { immediate: true });
    notify('SHINOBIWAN LaunchPAD installed.');
  });

  installButton.addEventListener('click', async () => {
    if (capturedInstallPrompt) {
      const prompt = capturedInstallPrompt;
      capturedInstallPrompt = null;
      await prompt.prompt();
      const choice = await prompt.userChoice;
      if (choice.outcome === 'accepted') {
        bannerHide(installBanner, { immediate: true });
        notify('Installation started.');
      } else {
        safeStorageSet(window.localStorage, INSTALL_DISMISS_KEY, String(Date.now()));
        bannerHide(installBanner);
      }
      return;
    }

    if (isIOS()) notify('Tap Share, then “Add to Home Screen”.');
  });

  installLater.addEventListener('click', () => {
    safeStorageSet(window.localStorage, INSTALL_DISMISS_KEY, String(Date.now()));
    bannerHide(installBanner);
  });

  window.addEventListener('online', syncConnectivity);
  window.addEventListener('offline', syncConnectivity);
  syncConnectivity();

  function showUpdate(worker, options = {}) {
    const shown = updateController?.show(worker, options);
    if (shown) bannerHide(installBanner, { immediate: true });
    return shown;
  }

  async function offerWaitingWorker(worker, release = remoteRelease) {
    if (!worker || !navigator.serviceWorker.controller || release === currentRelease) return false;
    const reportedRelease = await readWorkerRelease(worker);
    if (!reportedRelease || reportedRelease !== release) return false;
    return showUpdate(worker, { release: reportedRelease });
  }

  function watchRegistration(nextRegistration) {
    registration = nextRegistration;
    updateController ||= createPWAUpdateController({ audio, notify, currentRelease });

    registration.addEventListener('updatefound', () => {
      const worker = registration.installing;
      worker?.addEventListener('statechange', () => {
        if (worker.state === 'installed' && navigator.serviceWorker.controller) {
          void offerWaitingWorker(registration.waiting || worker, remoteRelease);
        }
      });
    });
  }

  async function fetchRemoteRelease() {
    if (!navigator.onLine) return currentRelease;
    const url = new URL('js/build-config.js', document.baseURI);
    url.searchParams.set('release-check', String(Date.now()));
    const response = await fetch(url, {
      cache: 'no-store',
      headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache' }
    });
    if (!response.ok) throw new Error(`Build metadata HTTP ${response.status}`);
    return parseRemoteRelease(await response.text()) || currentRelease;
  }

  async function checkForUpdate({ force = false, announce = true } = {}) {
    if (!registration || !navigator.onLine) return null;
    if (updateCheckPromise) return updateCheckPromise;

    const now = Date.now();
    if (!force && now - lastUpdateCheck < UPDATE_CHECK_INTERVAL) return null;
    lastUpdateCheck = now;

    updateCheckPromise = (async () => {
      try {
        remoteRelease = await fetchRemoteRelease();
        await registration.update();
        if (registration.waiting && navigator.serviceWorker.controller) {
          await offerWaitingWorker(registration.waiting, remoteRelease);
        }
        if (announce && remoteRelease !== currentRelease && remoteRelease !== lastAnnouncedRelease) {
          lastAnnouncedRelease = remoteRelease;
          releaseChannel?.postMessage({ release: remoteRelease });
        }
        return remoteRelease;
      } catch (error) {
        console.info('PWA update check postponed.', error);
        return null;
      } finally {
        updateCheckPromise = null;
      }
    })();

    return updateCheckPromise;
  }

  async function registerServiceWorker() {
    try {
      const workerUrl = new URL('./sw.js', document.baseURI);
      const nextRegistration = await navigator.serviceWorker.register(workerUrl, {
        scope: './',
        updateViaCache: 'none'
      });
      watchRegistration(nextRegistration);
      await navigator.serviceWorker.ready;
      await checkForUpdate({ force: true });
    } catch (error) {
      console.warn('PWA service worker registration failed', error);
    }
  }

  if ('BroadcastChannel' in window) {
    releaseChannel = new BroadcastChannel(RELEASE_CHANNEL);
    releaseChannel.addEventListener('message', event => {
      const release = event.data?.release;
      if (release && release !== currentRelease) {
        void checkForUpdate({ force: true, announce: false });
      }
    });
  }

  if ('serviceWorker' in navigator) {
    if (document.readyState === 'complete') registerServiceWorker();
    else window.addEventListener('load', registerServiceWorker, { once: true });

    window.addEventListener('online', () => checkForUpdate({ force: true }));
    window.addEventListener('focus', () => checkForUpdate());
    window.addEventListener('pageshow', event => checkForUpdate({ force: event.persisted }));
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') checkForUpdate();
    });
    window.setInterval(() => {
      if (document.visibilityState === 'visible') checkForUpdate();
    }, UPDATE_CHECK_INTERVAL);
  }

  window.setTimeout(syncInstallBanner, 900);

  window.__shinobiPWA = {
    isStandalone,
    getRegistration: () => registration,
    getDeferredPrompt: () => capturedInstallPrompt,
    checkForUpdate: () => checkForUpdate({ force: true }),
    showInstallPrompt: syncInstallBanner
  };
}
