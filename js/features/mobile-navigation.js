import { ensureStylesheet } from '../core/assets.js';

const MOBILE_QUERY = '(max-width: 760px)';
const TOUCH_CLICK_SUPPRESS_MS = 650;

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
  let suppressTouchClickUntil = 0;

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

  function openMenu({ focusFirst = false } = {}) {
    sync(true);
    if (!focusFirst) return;
    window.requestAnimationFrame(() => {
      sidebar.querySelector('.nav-item, a[href]')?.focus({ preventScroll: true });
    });
  }

  function closeMenu({ returnFocus = false } = {}) {
    const wasOpen = isOpen();
    sync(false);
    if (returnFocus && wasOpen) menuButton.focus({ preventScroll: true });
  }

  function toggleMenu({ keyboard = false } = {}) {
    if (isOpen()) closeMenu({ returnFocus: keyboard });
    else openMenu({ focusFirst: keyboard });
  }

  // Build 99: on touch/pen, move the drawer on pointerdown rather than waiting
  // for the synthesized click. Keyboard/mouse keeps normal click semantics.
  document.addEventListener('pointerdown', event => {
    if (!media.matches || !event.isPrimary || (event.pointerType !== 'touch' && event.pointerType !== 'pen')) return;
    const target = event.target;
    if (!(target instanceof Element)) return;

    const menuTarget = target.closest('#menu-button');
    const backdropTarget = target.closest('#mobile-menu-backdrop');
    if (!menuTarget && !backdropTarget) return;

    event.preventDefault();
    event.stopImmediatePropagation();
    suppressTouchClickUntil = performance.now() + TOUCH_CLICK_SUPPRESS_MS;

    if (menuTarget) toggleMenu({ keyboard: false });
    else closeMenu({ returnFocus: false });
  }, true);

  document.addEventListener('click', event => {
    const target = event.target;
    if (!(target instanceof Element)) return;

    if (target.closest('#menu-button')) {
      if (!media.matches) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      if (performance.now() < suppressTouchClickUntil) return;
      toggleMenu({ keyboard: event.detail === 0 });
      return;
    }

    if (target.closest('#mobile-menu-backdrop')) {
      event.preventDefault();
      event.stopImmediatePropagation();
      if (performance.now() < suppressTouchClickUntil) return;
      closeMenu({ returnFocus: event.detail === 0 });
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
