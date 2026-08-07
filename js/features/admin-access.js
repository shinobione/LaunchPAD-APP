const ADMIN_MODE_KEY = 'shinobiLaunchpadAdmin';
const TRACK_MANAGER_URL = 'https://launchpad-r2-api.jerryquinet.workers.dev/';
const LRC_MAKER_URL = 'https://shinobione.github.io/lrc-maker/';

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

export function resolveLrcMakerAccess({ search = '', desktop = false } = {}) {
  return Boolean(desktop && new URLSearchParams(search).get('admin') === '1');
}

function adminToolLink({ className, datasetKey, href, label, initials, ariaLabel }) {
  const link = document.createElement('a');
  link.className = `admin-tool-access ${className}`;
  link.dataset[datasetKey] = 'true';
  link.href = href;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  link.setAttribute('aria-label', ariaLabel);
  link.innerHTML = `<span aria-hidden="true">${initials}</span><strong>${label}</strong><b aria-hidden="true">↗</b>`;
  return link;
}

export function initAdminAccess({
  search = globalThis.location?.search || '',
  storage = globalThis.localStorage,
  media = globalThis.matchMedia?.('(min-width: 981px) and (hover: hover) and (pointer: fine)')
} = {}) {
  const actions = document.querySelector('.top-actions');
  if (!actions || !media) return;

  const render = () => {
    const trackManagerEnabled = resolveAdminAccess({ search, storage, desktop: media.matches });
    const lrcMakerEnabled = resolveLrcMakerAccess({ search, desktop: media.matches });

    let trackManager = actions.querySelector('[data-track-manager-access]');
    if (!trackManagerEnabled) trackManager?.remove();
    else if (!trackManager) {
      trackManager = adminToolLink({
        className: 'track-manager-access',
        datasetKey: 'trackManagerAccess',
        href: TRACK_MANAGER_URL,
        label: 'Track Manager',
        initials: 'LP',
        ariaLabel: 'Open the private Track Manager in a new tab'
      });
      actions.prepend(trackManager);
    }

    let lrcMaker = actions.querySelector('[data-lrc-maker-access]');
    if (!lrcMakerEnabled) {
      lrcMaker?.remove();
      return;
    }
    if (!lrcMaker) {
      lrcMaker = adminToolLink({
        className: 'lrc-maker-access',
        datasetKey: 'lrcMakerAccess',
        href: LRC_MAKER_URL,
        label: 'LRC Maker',
        initials: 'LM',
        ariaLabel: 'Open LRC Maker in a new tab'
      });
    }

    // Match the admin sketch: LRC Maker immediately before Track Manager.
    if (trackManager?.isConnected) actions.insertBefore(lrcMaker, trackManager);
    else actions.prepend(lrcMaker);
  };

  render();
  media.addEventListener?.('change', render);
}
