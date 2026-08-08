(() => {
  const config = Object.freeze({
    id: '20260808-bass-fracture-v53',
    cache: 'shinobi-launchpad-v53',
    revision: 'bass-fracture-1',
    display: '2026.08.08.53',
    release: 'bass-fracture-20260808'
  });

  globalThis.SHINOBIWAN_BUILD = config;

  if (typeof document === 'undefined') return;

  const visualTest = new URLSearchParams(location.search).has('visual-test');
  const stylesheetVersion = config.id;
  if (visualTest) document.documentElement.dataset.visualTest = 'true';

  const initialStylesheets = new WeakSet(document.querySelectorAll('link[rel="stylesheet"]'));

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

  function ensureBuildStylesheet(selector, path, datasetKey) {
    let link = document.querySelector(selector);
    if (!link) {
      link = document.createElement('link');
      link.rel = 'stylesheet';
      link.dataset[datasetKey] = 'true';
      document.head.appendChild(link);
    }
    const url = new URL(path, document.baseURI);
    url.searchParams.set('v', stylesheetVersion);
    link.href = url.href;
    return link;
  }

  function installTypographyStylesheet() {
    ensureBuildStylesheet('link[data-launchpad-typography]', 'css/typography-refresh.css', 'launchpadTypography');
  }

  function installStabilityStylesheet() {
    ensureBuildStylesheet('link[data-ui-stability-v39]', 'css/ui-stability-v39.css', 'uiStabilityV39');
  }

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

    if (initialStylesheets.has(link)) return link;
    if (url.searchParams.get('v') === stylesheetVersion) return link;
    url.searchParams.set('v', stylesheetVersion);
    link.href = url.href;
    return link;
  }

  installAppIconLinks();
  installTypographyStylesheet();
  installStabilityStylesheet();

  document.querySelectorAll('link[rel="stylesheet"]').forEach(normalizeStylesheet);
  new MutationObserver(records => {
    records.forEach(record => record.addedNodes.forEach(node => {
      if (node instanceof HTMLLinkElement) normalizeStylesheet(node);
      else if (node instanceof Element) node.querySelectorAll('link[rel="stylesheet"]').forEach(normalizeStylesheet);
    }));
  }).observe(document.head, { childList: true, subtree: true });

  function installAppEngine() {
    if (document.querySelector('script[data-shinobi-engine]')) return;
    const script = document.createElement('script');
    script.src = `js/app-engine-recovery.js?v=${encodeURIComponent(config.id)}`;
    script.async = false;
    script.dataset.shinobiEngine = 'true';
    document.head.appendChild(script);
  }

  function installVisualCardExportGuard() {
    const existing = document.querySelector('script[data-visual-card-export-guard]');
    if (existing) {
      if (existing.dataset.loaded === 'true') installAppEngine();
      else {
        existing.addEventListener('load', installAppEngine, { once: true });
        existing.addEventListener('error', installAppEngine, { once: true });
      }
      return;
    }

    const script = document.createElement('script');
    script.src = `js/visual-card-export-guard.js?v=${encodeURIComponent(config.id)}`;
    script.async = false;
    script.dataset.visualCardExportGuard = 'true';
    script.addEventListener('load', () => {
      script.dataset.loaded = 'true';
      installAppEngine();
    }, { once: true });
    script.addEventListener('error', installAppEngine, { once: true });
    document.head.appendChild(script);
  }

  function installNavigationStability() {
    const existing = document.querySelector('script[data-navigation-stability-v39]');
    if (existing) {
      if (existing.dataset.loaded === 'true') installVisualCardExportGuard();
      else {
        existing.addEventListener('load', installVisualCardExportGuard, { once: true });
        existing.addEventListener('error', installVisualCardExportGuard, { once: true });
      }
      return;
    }

    const script = document.createElement('script');
    script.src = `js/navigation-stability-v39.js?v=${encodeURIComponent(config.id)}`;
    script.async = false;
    script.dataset.navigationStabilityV39 = 'true';
    script.addEventListener('load', () => {
      script.dataset.loaded = 'true';
      installVisualCardExportGuard();
    }, { once: true });
    script.addEventListener('error', installVisualCardExportGuard, { once: true });
    document.head.appendChild(script);
  }

  installNavigationStability();
})();