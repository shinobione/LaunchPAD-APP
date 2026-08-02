const VIEW_ALIASES = {
  analytics: 'albums',
  albums: 'albums'
};

export function parseRoute(hash = window.location.hash) {
  const value = hash.replace(/^#/, '').trim();
  if (!value) return { type: 'view', value: 'home' };

  const separator = value.indexOf('=');
  if (separator > 0) {
    const type = value.slice(0, separator);
    const id = decodeURIComponent(value.slice(separator + 1));
    if (['track', 'album', 'lyrics'].includes(type) && id) return { type, id };
  }

  const view = VIEW_ALIASES[value] || value;
  return { type: 'view', value: view };
}

export function routeToHash(route) {
  if (!route || route.type === 'view') {
    const view = route?.value || 'home';
    return `#${VIEW_ALIASES[view] || view}`;
  }
  return `#${route.type}=${encodeURIComponent(route.id)}`;
}

export function createRouter({ onRoute }) {
  function dispatch() {
    onRoute(parseRoute());
  }

  function navigate(route, { replace = false } = {}) {
    const hash = routeToHash(route);
    if (window.location.hash === hash) {
      dispatch();
      return;
    }

    if (replace) {
      window.history.replaceState(null, '', hash);
      dispatch();
    } else {
      window.location.hash = hash;
    }
  }

  function write(route, { replace = true } = {}) {
    const hash = routeToHash(route);
    if (window.location.hash === hash) return;
    const method = replace ? 'replaceState' : 'pushState';
    window.history[method](null, '', hash);
  }

  function start() {
    window.addEventListener('hashchange', dispatch);
    dispatch();
  }

  return { navigate, write, start, parse: parseRoute };
}
