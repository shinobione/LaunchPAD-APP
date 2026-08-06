const VIEW_ALIASES = {
  analytics: 'albums',
  albums: 'albums'
};

const TRACK_DETAIL_HISTORY_KEY = 'shinobiTrackDetail';
const TRACK_ROUTES = new Set(['track', 'album', 'lyrics', 'studio']);
const ROUTE_CHANGE_EVENT = 'shinobi:route-change';
const ROUTE_TRANSITION_STYLESHEET = 'css/route-transitions.css';

export function parseRoute(hash = window.location.hash) {
  const value = hash.replace(/^#/, '').trim();
  if (!value) return { type: 'view', value: 'home' };

  const separator = value.indexOf('=');
  if (separator > 0) {
    const type = value.slice(0, separator);
    const id = decodeURIComponent(value.slice(separator + 1));
    if (TRACK_ROUTES.has(type) && id) return { type, id };
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

function ensureRouteTransitionStylesheet() {
  if (document.querySelector(`link[href^="${ROUTE_TRANSITION_STYLESHEET}"]`)) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = ROUTE_TRANSITION_STYLESHEET;
  document.head.appendChild(link);
}

function normalizeInitialViewRoute() {
  const initialRoute = parseRoute();
  if (initialRoute.type !== 'view' || initialRoute.value === 'home') return;
  window.history.replaceState(null, '', routeToHash({ type: 'view', value: 'home' }));
}

function announceRoute(route) {
  window.dispatchEvent(new CustomEvent(ROUTE_CHANGE_EVENT, {
    detail: { route }
  }));
}

export function createRouter({ onRoute }) {
  function dispatch() {
    const route = parseRoute();
    const isPassiveTrackDetail =
      route.type === 'track' &&
      window.history.state?.[TRACK_DETAIL_HISTORY_KEY] === true;

    if (isPassiveTrackDetail) return;

    // Studio reuses the Lyrics view, while the original route remains visible
    // and shareable in the address bar.
    const handledRoute = route.type === 'studio'
      ? { type: 'lyrics', id: route.id }
      : route;

    onRoute(handledRoute);

    // Lyrics rendering may normalize its active track back to #lyrics=... .
    // Restore the dedicated Studio URL before announcing the route state.
    if (route.type === 'studio') {
      const studioHash = routeToHash(route);
      if (window.location.hash !== studioHash) {
        window.history.replaceState(window.history.state, '', studioHash);
      }
    }

    announceRoute(route);
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
    ensureRouteTransitionStylesheet();
    normalizeInitialViewRoute();
    window.addEventListener('hashchange', dispatch);
    dispatch();
  }

  return { navigate, write, start, parse: parseRoute };
}
