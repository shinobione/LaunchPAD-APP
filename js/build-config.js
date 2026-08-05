(() => {
  const config = Object.freeze({
    id: '20260802-wave14',
    cache: 'shinobi-launchpad-v11',
    revision: 'hero-first-paint-1',
    display: '2026.08.05.7',
    release: 'track-manager-v49-lyrics-detection-20260805'
  });

  globalThis.SHINOBIWAN_BUILD = config;

  if (typeof document === 'undefined') return;

  if (new URLSearchParams(location.search).has('visual-test')) {
    document.documentElement.dataset.visualTest = 'true';
  }

  function installAppIconLinks() {
    const iconUrl = new URL('assets/app-icon-neon.svg', document.baseURI);
    iconUrl.searchParams.set('v', config.release);

    let icon = document.querySelector('link[rel="icon"]');
    if (!icon) {
      icon = document.createElement('link');
      icon.rel = 'icon';
      document.head.appendChild(icon);
    }
    icon.type = 'image/svg+xml';
    icon.href = iconUrl.href;

    document.querySelectorAll('link[rel="alternate icon"]').forEach(link => link.remove());

    let appleTouch = document.querySelector('link[rel="apple-touch-icon"]');
    if (!appleTouch) {
      appleTouch = document.createElement('link');
      appleTouch.rel = 'apple-touch-icon';
      document.head.appendChild(appleTouch);
    }
    appleTouch.sizes = '192x192';
    appleTouch.href = new URL('assets/app-icon-neon-192.png', document.baseURI).href;

    const manifest = document.querySelector('link[rel="manifest"]');
    if (manifest) {
      const manifestUrl = new URL(manifest.getAttribute('href') || manifest.href, document.baseURI);
      manifestUrl.searchParams.set('v', config.release);
      manifest.href = manifestUrl.href;
    }
  }

  installAppIconLinks();

  function findEquivalentStylesheet(link, url) {
    return [...document.querySelectorAll('link[rel="stylesheet"]')].find(candidate => {
      if (candidate === link) return false;
      const candidateUrl = new URL(candidate.getAttribute('href') || candidate.href, location.href);
      return candidateUrl.origin === url.origin && candidateUrl.pathname === url.pathname;
    });
  }

  function normalizeStylesheet(link) {
    if (!(link instanceof HTMLLinkElement) || link.rel !== 'stylesheet') return;
    const url = new URL(link.getAttribute('href') || link.href, location.href);
    if (url.origin !== location.origin) return;

    const existing = findEquivalentStylesheet(link, url);
    if (existing) {
      Object.entries(link.dataset).forEach(([key, value]) => {
        if (!(key in existing.dataset)) existing.dataset[key] = value;
      });
      link.remove();
      return existing;
    }

    if (url.searchParams.get('v') === config.id) return link;
    url.searchParams.set('v', config.id);
    link.href = url.href;
    return link;
  }

  document.querySelectorAll('link[rel="stylesheet"]').forEach(normalizeStylesheet);
  new MutationObserver(records => {
    records.forEach(record => record.addedNodes.forEach(node => {
      if (node instanceof HTMLLinkElement) normalizeStylesheet(node);
      else if (node instanceof Element) node.querySelectorAll('link[rel="stylesheet"]').forEach(normalizeStylesheet);
    }));
  }).observe(document.head, { childList: true, subtree: true });

  if (document.querySelector('script[data-shinobi-engine]')) return;

  const script = document.createElement('script');
  script.src = `js/app-engine.js?v=${encodeURIComponent(config.id)}`;
  script.async = false;
  script.dataset.shinobiEngine = 'true';
  document.head.appendChild(script);
})();