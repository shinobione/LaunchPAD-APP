import { ensureStylesheet } from '../core/assets.js';

const MOBILE_QUERY = '(max-width: 760px)';

export function initMobileNavigation() {
  if (window.__shinobiMobileNavigationReady) return;
  window.__shinobiMobileNavigationReady = true;
  ensureStylesheet('css/mobile-navigation.css');

  const sidebar = document.querySelector('.sidebar');
  const menuButton = document.querySelector('#menu-button');
  if (!sidebar || !menuButton) return;

  let backdrop = document.querySelector('#mobile-menu-backdrop');
  if (!backdrop) {
    backdrop = document.createElement('button');
    backdrop.id = 'mobile-menu-backdrop';
    backdrop.className = 'mobile-menu-backdrop';
    backdrop.type = 'button';
    backdrop.setAttribute('aria-label', 'Close navigation menu');
    backdrop.setAttribute('aria-hidden', 'true');
    backdrop.tabIndex = -1;
    document.body.appendChild(backdrop);
  }

  const media = window.matchMedia(MOBILE_QUERY);

  function isOpen() {
    return sidebar.classList.contains('open') && document.body.classList.contains('mobile-menu-open');
  }

  function sync(open) {
    const active = Boolean(open && media.matches);
    sidebar.classList.toggle('open', active);
    document.body.classList.toggle('mobile-menu-open', active);
    menuButton.setAttribute('aria-expanded', String(active));
    menuButton.setAttribute('aria-label', active ? 'Close menu' : 'Open menu');
    backdrop.setAttribute('aria-hidden', String(!active));
    backdrop.tabIndex = active ? 0 : -1;
  }

  function openMenu() {
    sync(true);
    window.requestAnimationFrame(() => {
      sidebar.querySelector('.nav-item, a[href]')?.focus({ preventScroll: true });
    });
  }

  function closeMenu({ returnFocus = false } = {}) {
    const wasOpen = isOpen();
    sync(false);
    if (returnFocus && wasOpen) menuButton.focus({ preventScroll: true });
  }

  function toggleMenu() {
    if (isOpen()) closeMenu({ returnFocus: true });
    else openMenu();
  }

  document.addEventListener('click', event => {
    const target = event.target;
    if (!(target instanceof Element)) return;

    if (target.closest('#menu-button')) {
      if (!media.matches) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      toggleMenu();
      return;
    }

    if (target.closest('#mobile-menu-backdrop')) {
      event.preventDefault();
      event.stopImmediatePropagation();
      closeMenu({ returnFocus: true });
      return;
    }

    if (isOpen() && target.closest('.sidebar [data-view], .sidebar [data-view-target], .sidebar a[href^="#"]')) {
      window.setTimeout(() => closeMenu(), 0);
    }
  }, true);

  document.addEventListener('keydown', event => {
    if (event.key !== 'Escape' || !isOpen()) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    closeMenu({ returnFocus: true });
  }, true);

  window.addEventListener('hashchange', () => closeMenu());
  media.addEventListener?.('change', event => {
    if (!event.matches) closeMenu();
  });

  sync(false);
}
