import { ensureStylesheet } from '../core/assets.js';

const MOBILE_QUERY = '(max-width: 760px)';
const LOCKED_VIEWPORT = 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover';

function lockMobileViewport(media) {
  if (!media.matches) return;
  const viewport = document.querySelector('meta[name="viewport"]');
  if (!viewport) return;
  if (viewport.getAttribute('content') !== LOCKED_VIEWPORT) viewport.setAttribute('content', LOCKED_VIEWPORT);
}

export function initMobileNavigation() {
  if (window.__shinobiMobileNavigationReady) return;
  window.__shinobiMobileNavigationReady = true;
  ensureStylesheet('css/mobile-navigation.css');
  ensureStylesheet('css/c3-c9-corrective-v100.css', 'c3C9CorrectiveV100');

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
  lockMobileViewport(media);

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

  // Build 100 corrective: one event family owns the drawer. Modern mobile
  // Chromium already emits click without the legacy 300 ms delay when
  // touch-action: manipulation is present, so pointerdown ownership only
  // created a pointerdown -> synthetic click race and occasional self-closing.
  document.addEventListener('click', event => {
    const target = event.target;
    if (!(target instanceof Element)) return;

    if (target.closest('#menu-button')) {
      if (!media.matches) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      toggleMenu({ keyboard: event.detail === 0 });
      return;
    }

    if (target.closest('#mobile-menu-backdrop')) {
      event.preventDefault();
      event.stopImmediatePropagation();
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
    lockMobileViewport(media);
    if (!event.matches) closeMenu();
  });

  // Preserve an early boot-menu click instead of force-closing it when the
  // full navigation module hydrates. This is the other half of the Build 99
  // self-close race: the boot bridge may already have set .sidebar.open.
  sync(media.matches && sidebar.classList.contains('open'));
}
