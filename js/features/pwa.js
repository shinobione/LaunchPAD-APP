function ensureStylesheet() {
  const href = 'css/pwa.css?v=20260802-1';
  if (document.querySelector(`link[href="${href}"]`)) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = href;
  document.head.appendChild(link);
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

export function initPWA() {
  if (window.__shinobiPWAReady) return;
  window.__shinobiPWAReady = true;
  ensureStylesheet();

  const notify = createToast();
  const control = createInstallControl();
  const button = control.querySelector('button');
  const title = control.querySelector('strong');
  const subtitle = control.querySelector('small');
  let deferredPrompt = null;
  let registration = null;
  let updateReady = false;

  function setVisible(visible) {
    control.hidden = !visible || isStandalone();
  }

  function setInstallState() {
    updateReady = false;
    title.textContent = 'Install app';
    subtitle.textContent = isIOS() ? 'Add to Home Screen' : 'Launch from your device';
    button.querySelector('[aria-hidden]')?.replaceChildren(document.createTextNode('↓'));
    setVisible(Boolean(deferredPrompt) || isIOS());
  }

  function setUpdateState() {
    updateReady = true;
    title.textContent = 'Update ready';
    subtitle.textContent = 'Reload the latest version';
    button.querySelector('[aria-hidden]')?.replaceChildren(document.createTextNode('↻'));
    setVisible(true);
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
    if (updateReady && registration?.waiting) {
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      return;
    }

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

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', async () => {
      try {
        registration = await navigator.serviceWorker.register('./sw.js', {
          scope: './',
          updateViaCache: 'none'
        });

        if (registration.waiting && navigator.serviceWorker.controller) setUpdateState();
        registration.addEventListener('updatefound', () => {
          const worker = registration.installing;
          worker?.addEventListener('statechange', () => {
            if (worker.state === 'installed' && navigator.serviceWorker.controller) setUpdateState();
          });
        });
      } catch (error) {
        console.warn('PWA service worker registration failed', error);
      }
    }, { once: true });

    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    });
  }

  if (isStandalone()) setVisible(false);
  else setInstallState();

  window.__shinobiPWA = {
    isStandalone,
    getRegistration: () => registration,
    getDeferredPrompt: () => deferredPrompt
  };
}
