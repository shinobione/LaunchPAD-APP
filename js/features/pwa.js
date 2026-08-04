import { ensureStylesheet, versionedAsset } from '../core/assets.js';

const UPDATE_DISMISS_KEY = 'shinobi-pwa-update-dismissed-session';
const RELOAD_REQUEST_KEY = 'shinobi-pwa-update-reload-requested';
const UPDATE_CHECK_INTERVAL = 5 * 60 * 1000;

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
    // Hardened browsing modes may block session storage.
  }
}

function safeStorageRemove(storage, key) {
  try {
    storage?.removeItem(key);
  } catch {
    // Hardened browsing modes may block session storage.
  }
}

export function preparePWAHead() {
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
  return window.matchMedia('(display-mode: standalone)').matches
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

function createInstallControl() {
  const existing = document.querySelector('#pwa-install-control');
  if (existing) return existing;

  const control = document.createElement('div');
  control.id = 'pwa-install-control';
  control.className = 'pwa-install-control';
  control.hidden = true;
  control.innerHTML = `
    <button type="button" class="pwa-install-button">
      <span aria-hidden="true">↓</span>
      <span><strong>Install app</strong><small>Launch from your device</small></span>
    </button>
  `;

  const nav = document.querySelector('.main-nav');
  nav?.insertAdjacentElement('afterend', control);
  if (!nav) document.querySelector('.sidebar')?.prepend(control);
  return control;
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

export function createPWAUpdateController({
  audio = document.querySelector('#audio'),
  serviceWorker = navigator.serviceWorker,
  storage = window.sessionStorage,
  reload = () => window.location.reload(),
  notify = () => {}
} = {}) {
  const banner = createUpdateBanner();
  const updateButton = banner.querySelector('[data-pwa-update-now]');
  const laterButton = banner.querySelector('[data-pwa-update-later]');
  const title = banner.querySelector('strong');
  const subtitle = banner.querySelector('small');

  let waitingWorker = null;
  let deferredUntilPlaybackStops = false;
  let activationRequested = false;
  let refreshing = false;
  let dismissedForSession = safeStorageGet(storage, UPDATE_DISMISS_KEY) === '1';
  let reloadAuthorized = safeStorageGet(storage, RELOAD_REQUEST_KEY) === '1';
  safeStorageRemove(storage, RELOAD_REQUEST_KEY);

  function resetCopy() {
    banner.dataset.state = 'ready';
    title.textContent = 'A new version of LaunchPAD is available.';
    subtitle.textContent = 'The update will be applied without abruptly interrupting the music.';
    updateButton.textContent = 'Update now';
    updateButton.disabled = false;
    laterButton.disabled = false;
  }

  function hide() {
    banner.classList.remove('show');
    window.setTimeout(() => {
      if (!banner.classList.contains('show')) banner.hidden = true;
    }, 220);
  }

  function show(worker) {
    waitingWorker = worker || waitingWorker;
    if (!waitingWorker || dismissedForSession || activationRequested) return false;
    resetCopy();
    banner.hidden = false;
    window.requestAnimationFrame(() => banner.classList.add('show'));
    return true;
  }

  function requestActivation() {
    if (!waitingWorker || activationRequested) return false;
    deferredUntilPlaybackStops = false;
    activationRequested = true;
    reloadAuthorized = true;
    safeStorageSet(storage, RELOAD_REQUEST_KEY, '1');
    safeStorageRemove(storage, UPDATE_DISMISS_KEY);
    banner.dataset.state = 'applying';
    title.textContent = 'Updating LaunchPAD…';
    subtitle.textContent = 'LaunchPAD will reload once.';
    updateButton.textContent = 'Installing…';
    updateButton.disabled = true;
    laterButton.disabled = true;
    waitingWorker.postMessage({ type: 'SKIP_WAITING' });
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
    if (!waitingWorker) return;
    if (audio && !audio.paused && !audio.ended) {
      deferActivation();
      return;
    }
    requestActivation();
  }

  function handleLaterClick() {
    deferredUntilPlaybackStops = false;
    dismissedForSession = true;
    safeStorageSet(storage, UPDATE_DISMISS_KEY, '1');
    hide();
  }

  function handlePlaybackStop() {
    if (deferredUntilPlaybackStops) requestActivation();
  }

  function handleControllerChange() {
    if (refreshing || (!activationRequested && !reloadAuthorized)) return;
    refreshing = true;
    safeStorageRemove(storage, RELOAD_REQUEST_KEY);
    reload();
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
    destroy() {
      updateButton.removeEventListener('click', handleUpdateClick);
      laterButton.removeEventListener('click', handleLaterClick);
      audio?.removeEventListener('pause', handlePlaybackStop);
      audio?.removeEventListener('ended', handlePlaybackStop);
      serviceWorker?.removeEventListener('controllerchange', handleControllerChange);
      banner.remove();
    }
  };
}

export function initPWA() {
  if (window.__shinobiPWAReady) return;
  window.__shinobiPWAReady = true;
  preparePWAHead();
  ensureStylesheet('css/pwa.css');

  const notify = createToast();
  const control = createInstallControl();
  const button = control.querySelector('button');
  const title = control.querySelector('strong');
  const subtitle = control.querySelector('small');
  const audio = document.querySelector('#audio');
  let deferredPrompt = null;
  let registration = null;
  let lastUpdateCheck = 0;
  let updateController = null;

  function setVisible(visible) {
    control.hidden = !visible || isStandalone();
  }

  function setInstallState() {
    title.textContent = 'Install app';
    subtitle.textContent = isIOS() ? 'Add to Home Screen' : 'Launch from your device';
    button.querySelector('[aria-hidden]')?.replaceChildren(document.createTextNode('↓'));
    setVisible(Boolean(deferredPrompt) || isIOS());
  }

  function syncConnectivity() {
    document.documentElement.dataset.connectivity = navigator.onLine ? 'online' : 'offline';
    if (!navigator.onLine) notify('Offline mode: the Launchpad interface and cached covers remain available.');
  }

  window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault();
    deferredPrompt = event;
    setInstallState();
  });

  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    setVisible(false);
    notify('SHINOBIWAN Launchpad installed.');
  });

  window.addEventListener('online', syncConnectivity);
  window.addEventListener('offline', syncConnectivity);
  syncConnectivity();

  button.addEventListener('click', async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      deferredPrompt = null;
      setVisible(false);
      if (choice.outcome === 'accepted') notify('Installation started.');
      return;
    }

    if (isIOS()) {
      notify('Open the Share menu, then choose “Add to Home Screen”.');
    }
  });

  function watchRegistration(nextRegistration) {
    registration = nextRegistration;
    updateController ||= createPWAUpdateController({ audio, notify });

    if (registration.waiting && navigator.serviceWorker.controller) {
      updateController.show(registration.waiting);
    }

    registration.addEventListener('updatefound', () => {
      const worker = registration.installing;
      worker?.addEventListener('statechange', () => {
        if (worker.state === 'installed' && navigator.serviceWorker.controller) {
          updateController.show(worker);
        }
      });
    });
  }

  async function checkForUpdate({ force = false } = {}) {
    if (!registration || !navigator.onLine) return;
    const now = Date.now();
    if (!force && now - lastUpdateCheck < UPDATE_CHECK_INTERVAL) return;
    lastUpdateCheck = now;
    try {
      await registration.update();
    } catch (error) {
      console.info('PWA update check postponed.', error);
    }
  }

  async function registerServiceWorker() {
    try {
      const nextRegistration = await navigator.serviceWorker.register(versionedAsset('./sw.js'), {
        scope: './',
        updateViaCache: 'none'
      });
      watchRegistration(nextRegistration);
      checkForUpdate({ force: true });
    } catch (error) {
      console.warn('PWA service worker registration failed', error);
    }
  }

  if ('serviceWorker' in navigator) {
    if (document.readyState === 'complete') registerServiceWorker();
    else window.addEventListener('load', registerServiceWorker, { once: true });

    window.addEventListener('online', () => checkForUpdate({ force: true }));
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') checkForUpdate();
    });
  }

  if (isStandalone()) setVisible(false);
  else setInstallState();

  window.__shinobiPWA = {
    isStandalone,
    getRegistration: () => registration,
    getDeferredPrompt: () => deferredPrompt,
    checkForUpdate: () => checkForUpdate({ force: true })
  };
}
