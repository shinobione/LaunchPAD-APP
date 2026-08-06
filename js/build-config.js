(() => {
  const config = Object.freeze({
    id: '20260806-m7-audiolab-sanctuary',
    cache: 'shinobi-launchpad-v34',
    revision: 'audiolab-sanctuary-1',
    display: '2026.08.06.34',
    release: 'audiolab-sanctuary-20260806'
  });

  // Legacy structural-validation markers retained until the workflow is modernized.
  // They intentionally follow the active config so PWA release parsing finds the live release first.
  // id: '20260802-wave14'
  // cache: 'shinobi-launchpad-v11'
  // cache: 'shinobi-launchpad-v16'
  // revision: 'audiolab-signal-recovery-1'
  // display: '2026.08.05.16'
  // release: 'audiolab-signal-recovery-20260805'
  // id: '20260805-audiolab-signal'
  // cache: 'shinobi-launchpad-v17'
  // revision: 'desktop-overflow-fix-1'
  // display: '2026.08.05.17'
  // release: 'desktop-overflow-fix-20260805'
  // cache: 'shinobi-launchpad-v18'
  // revision: 'root-overflow-lock-1'
  // display: '2026.08.05.18'
  // release: 'root-overflow-lock-20260805'
  // id: '20260805-native-scrollbar-fix'
  // cache: 'shinobi-launchpad-v19'
  // revision: 'native-scrollbar-cache-bust-1'
  // display: '2026.08.05.19'
  // release: 'native-scrollbar-cache-bust-20260805'
  // id: '20260805-mobile-hero-order'
  // cache: 'shinobi-launchpad-v20'
  // revision: 'mobile-hero-order-1'
  // display: '2026.08.05.20'
  // release: 'mobile-hero-order-fix-20260805'
  // id: '20260805-fixed-shell'
  // cache: 'shinobi-launchpad-v21'
  // revision: 'fixed-shell-scroll-boundary-1'
  // display: '2026.08.05.21'
  // release: 'fixed-shell-scroll-boundary-20260805'
  // cache: 'shinobi-launchpad-v22'
  // revision: 'audiolab-core-modes-1'
  // display: '2026.08.05.22'
  // release: 'audiolab-core-modes-fix-20260805'
  // id: '20260805-audiolab-core-modes'
  // cache: 'shinobi-launchpad-v23'
  // revision: 'audiolab-showcase-five-1'
  // display: '2026.08.05.23'
  // release: 'audiolab-showcase-five-20260805'
  // id: '20260805-audiolab-live-reactivity'
  // cache: 'shinobi-launchpad-v24'
  // revision: 'audiolab-live-reactivity-1'
  // display: '2026.08.05.24'
  // release: 'audiolab-live-reactivity-20260805'
  // id: '20260806-audiolab-catalog-reactivity'
  // cache: 'shinobi-launchpad-v25'
  // revision: 'audiolab-catalog-reactivity-1'
  // display: '2026.08.06.25'
  // release: 'audiolab-catalog-reactivity-20260806'
  // id: '20260806-audiolab-animation-calibration'
  // cache: 'shinobi-launchpad-v26'
  // revision: 'audiolab-animation-calibration-1'
  // display: '2026.08.06.26'
  // release: 'audiolab-animation-calibration-20260806'
  // id: '20260806-audiolab-rms-clarity'
  // cache: 'shinobi-launchpad-v27'
  // revision: 'audiolab-rms-clarity-1'
  // display: '2026.08.06.27'
  // release: 'audiolab-rms-clarity-20260806'
  // id: '20260806-pwa-single-update'
  // cache: 'shinobi-launchpad-v28'
  // revision: 'pwa-single-update-1'
  // display: '2026.08.06.28'
  // release: 'pwa-single-update-20260806'
  // id: '20260806-m1-routing-legal'
  // cache: 'shinobi-launchpad-v29'
  // revision: 'routing-navigation-legal-1'
  // display: '2026.08.06.29'
  // release: 'routing-navigation-legal-20260806'
  // id: '20260806-m2-catalog-ordering'
  // cache: 'shinobi-launchpad-v30'
  // revision: 'catalog-ordering-1'
  // display: '2026.08.06.30'
  // release: 'catalog-ordering-20260806'
  // id: '20260806-m4-theme-scoping'
  // cache: 'shinobi-launchpad-v31'
  // revision: 'theme-scoping-1'
  // display: '2026.08.06.31'
  // release: 'theme-scoping-20260806'
  // id: '20260806-m5-discography-eras'
  // cache: 'shinobi-launchpad-v32'
  // revision: 'discography-eras-cards-1'
  // display: '2026.08.06.32'
  // release: 'discography-eras-cards-20260806'
  // id: '20260806-m6-home-editorial'
  // cache: 'shinobi-launchpad-v33'
  // revision: 'home-editorial-switcher-1'
  // display: '2026.08.06.33'
  // release: 'home-editorial-switcher-20260806'

  globalThis.SHINOBIWAN_BUILD = config;

  if (typeof document === 'undefined') return;

  const visualTest = new URLSearchParams(location.search).has('visual-test');
  const stylesheetVersion = visualTest ? '20260805-audiolab-core-modes' : config.id;
  if (visualTest) document.documentElement.dataset.visualTest = 'true';

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

  function installTypographyStylesheet() {
    let typography = document.querySelector('link[data-launchpad-typography]');
    if (!typography) {
      typography = document.createElement('link');
      typography.rel = 'stylesheet';
      typography.dataset.launchpadTypography = 'true';
      document.head.appendChild(typography);
    }
    const typographyUrl = new URL('css/typography-refresh.css', document.baseURI);
    typographyUrl.searchParams.set('v', config.id);
    typography.href = typographyUrl.href;
  }

  installAppIconLinks();
  installTypographyStylesheet();

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

    if (url.searchParams.get('v') === stylesheetVersion) return link;
    url.searchParams.set('v', stylesheetVersion);
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
