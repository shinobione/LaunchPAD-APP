const ADMIN_MODE_KEY = 'shinobiLaunchpadAdmin';
const ADMIN_URL = 'https://launchpad-r2-api.jerryquinet.workers.dev/';

export function resolveAdminAccess({ search = '', storage, desktop = false } = {}) {
  const mode = new URLSearchParams(search).get('admin');
  try {
    if (mode === '1') storage?.setItem(ADMIN_MODE_KEY, '1');
    if (mode === '0') storage?.removeItem(ADMIN_MODE_KEY);
  } catch { /* Storage is optional. */ }

  let enabled = mode === '1';
  if (mode !== '0') {
    try { enabled ||= storage?.getItem(ADMIN_MODE_KEY) === '1'; }
    catch { /* The explicit query flag still works without storage. */ }
  }
  return Boolean(enabled && desktop);
}

export function initAdminAccess({
  search = globalThis.location?.search || '',
  storage = globalThis.localStorage,
  media = globalThis.matchMedia?.('(min-width: 981px) and (hover: hover) and (pointer: fine)')
} = {}) {
  const actions = document.querySelector('.top-actions');
  if (!actions || !media) return;

  const render = () => {
    const enabled = resolveAdminAccess({ search, storage, desktop: media.matches });
    let link = actions.querySelector('[data-track-manager-access]');
    if (!enabled) { link?.remove(); return; }
    if (link) return;

    link = document.createElement('a');
    link.className = 'track-manager-access';
    link.dataset.trackManagerAccess = 'true';
    link.href = ADMIN_URL;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.setAttribute('aria-label', 'Open the private Track Manager in a new tab');
    link.innerHTML = '<span aria-hidden="true">LP</span><strong>Track Manager</strong><b aria-hidden="true">↗</b>';
    actions.prepend(link);
  };

  render();
  media.addEventListener?.('change', render);
}

