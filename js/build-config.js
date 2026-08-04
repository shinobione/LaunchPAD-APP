(() => {
  const config = Object.freeze({
    id: '20260802-wave14',
    cache: 'shinobi-launchpad-v11',
    revision: 'hero-first-paint-1',
    display: '2026.08.04',
    release: 'mobile-studio-layout-20260804'
  });

  globalThis.SHINOBIWAN_BUILD = config;

  if (typeof document === 'undefined') return;

  if (new URLSearchParams(location.search).has('visual-test')) {
    document.documentElement.dataset.visualTest = 'true';
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
