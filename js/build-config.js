(() => {
  const config = Object.freeze({
    id: '20260802-wave14',
    cache: 'shinobi-launchpad-v11'
  });

  globalThis.SHINOBIWAN_BUILD = config;

  if (typeof document === 'undefined') return;

  function normalizeStylesheet(link) {
    if (!(link instanceof HTMLLinkElement) || link.rel !== 'stylesheet') return;
    const url = new URL(link.getAttribute('href') || link.href, location.href);
    if (url.origin !== location.origin || url.searchParams.get('v') === config.id) return;
    url.searchParams.set('v', config.id);
    link.href = url.href;
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
