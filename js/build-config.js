(() => {
  const config = Object.freeze({
    id: '20260807-unified-v40',
    cache: 'shinobi-launchpad-v40',
    revision: 'cloudflare-main-reconciliation-1',
    display: '2026.08.07.40',
    release: 'unified-v40-20260807'
  });

  // Legacy release markers retained for structural guards and migration history.
  // id: '20260807-navigation-stability'
  // cache: 'shinobi-launchpad-v39'
  // revision: 'route-scroll-layout-stability-1'
  // display: '2026.08.07.39'
  // release: 'navigation-stability-20260807'
  // id: '20260807-ui-navigation-polish'
  // cache: 'shinobi-launchpad-v38'
  // revision: 'ui-navigation-polish-1'
  // display: '2026.08.07.38'
  // release: 'ui-navigation-polish-20260807'
  // id: '20260806-navigation-recovery'
  // cache: 'shinobi-launchpad-v37'
  // revision: 'navigation-local-fallback-1'
  // display: '2026.08.06.37'
  // release: 'navigation-recovery-20260806'
  // id: '20260806-m7-audiolab-sanctuary'
  // cache: 'shinobi-launchpad-v34'
  // revision: 'audiolab-sanctuary-1'
  // display: '2026.08.06.34'
  // release: 'audiolab-sanctuary-20260806'
  // id: '20260806-m6-home-editorial'
  // cache: 'shinobi-launchpad-v33'
  // revision: 'home-editorial-switcher-1'
  // display: '2026.08.06.33'
  // release: 'home-editorial-switcher-20260806'
  // id: '20260806-m5-discography-eras'
  // cache: 'shinobi-launchpad-v32'
  // revision: 'discography-eras-cards-1'
  // display: '2026.08.06.32'
  // release: 'discography-eras-cards-20260806'
  // id: '20260806-m4-theme-scoping'
  // cache: 'shinobi-launchpad-v31'
  // revision: 'theme-scoping-1'
  // display: '2026.08.06.31'
  // release: 'theme-scoping-20260806'
  // id: '20260806-m2-catalog-ordering'
  // cache: 'shinobi-launchpad-v30'
  // revision: 'catalog-ordering-1'
  // display: '2026.08.06.30'
  // release: 'catalog-ordering-20260806'
  // id: '20260806-m1-routing-legal'
  // cache: 'shinobi-launchpad-v29'
  // revision: 'routing-navigation-legal-1'
  // display: '2026.08.06.29'
  // release: 'routing-navigation-legal-20260806'
  // id: '20260806-pwa-single-update'
  // cache: 'shinobi-launchpad-v28'
  // revision: 'pwa-single-update-1'
  // display: '2026.08.06.28'
  // release: 'pwa-single-update-20260806'
  // id: '20260806-audiolab-rms-clarity'
  // cache: 'shinobi-launchpad-v27'
  // revision: 'audiolab-rms-clarity-1'
  // display: '2026.08.06.27'
  // release: 'audiolab-rms-clarity-20260806'
  // id: '20260806-audiolab-animation-calibration'
  // cache: 'shinobi-launchpad-v26'
  // revision: 'audiolab-animation-calibration-1'
  // display: '2026.08.06.26'
  // release: 'audiolab-animation-calibration-20260806'
  // id: '20260806-audiolab-catalog-reactivity'
  // cache: 'shinobi-launchpad-v25'
  // revision: 'audiolab-catalog-reactivity-1'
  // display: '2026.08.06.25'
  // release: 'audiolab-catalog-reactivity-20260806'
  // id: '20260805-audiolab-live-reactivity'
  // cache: 'shinobi-launchpad-v24'
  // revision: 'audiolab-live-reactivity-1'
  // display: '2026.08.05.24'
  // release: 'audiolab-live-reactivity-20260805'
  // id: '20260805-audiolab-core-modes'
  // cache: 'shinobi-launchpad-v23'
  // id: '20260805-fixed-shell'
  // cache: 'shinobi-launchpad-v21'
  // revision: 'fixed-shell-scroll-boundary-1'
  // display: '2026.08.05.21'
  // release: 'fixed-shell-scroll-boundary-20260805'
  // id: '20260805-mobile-hero-order'
  // cache: 'shinobi-launchpad-v20'
  // id: '20260805-native-scrollbar-fix'
  // cache: 'shinobi-launchpad-v19'
  // id: '20260802-wave14'
  // cache: 'shinobi-launchpad-v11'

  globalThis.SHINOBIWAN_BUILD = config;

  if (typeof document === 'undefined') return;

  const visualTest = new URLSearchParams(location.search).has('visual-test');
  const stylesheetVersion = visualTest ? '20260805-audiolab-core-modes' : config.id;
  if (visualTest) document.documentElement.dataset.visualTest = 'true';

  // Parser-delivered stylesheets are already painting by the time build-config
  // executes at the end of <body>. Rewriting those hrefs causes a second fetch
  // and a visible page-wide repaint. Keep them stable; only dynamically added
  // application styles receive the active build query string.
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
    url.searchParams.set('v', config.id);
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

  function installNavigationStability() {
    const existing = document.querySelector('script[data-navigation-stability-v39]');
    if (existing) {
      if (existing.dataset.loaded === 'true') installAppEngine();
      else {
        existing.addEventListener('load', installAppEngine, { once: true });
        existing.addEventListener('error', installAppEngine, { once: true });
      }
      return;
    }

    const script = document.createElement('script');
    script.src = `js/navigation-stability-v39.js?v=${encodeURIComponent(config.id)}`;
    script.async = false;
    script.dataset.navigationStabilityV39 = 'true';
    script.addEventListener('load', () => {
      script.dataset.loaded = 'true';
      installAppEngine();
    }, { once: true });
    script.addEventListener('error', installAppEngine, { once: true });
    document.head.appendChild(script);
  }

  installNavigationStability();
})();
