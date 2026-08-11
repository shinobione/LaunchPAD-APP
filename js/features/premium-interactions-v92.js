(() => {
  if (globalThis.__shinobiPremiumInteractionsV92Ready) return;
  globalThis.__shinobiPremiumInteractionsV92Ready = true;

  const REDUCED_MOTION = '(prefers-reduced-motion: reduce)';
  const MOBILE_PERFORMANCE_QUERY = '(max-width: 760px), (hover: none) and (pointer: coarse)';
  const PRESS_SELECTOR = [
    'button:not(:disabled)',
    'a[href]',
    'summary',
    '.album-card',
    '.track-card',
    '.favorite-card',
    '.album-tile',
    '.track-row',
    '.album-track-row',
    '.queue-item'
  ].join(',');

  const BLOOM_SELECTOR = [
    'button:not(:disabled)',
    'a.social-platform',
    '.nav-item',
    '.chip',
    '.album-action',
    '.track-action',
    '.play-overlay',
    '.mini-controls button',
    '.player-control',
    '.round-button',
    '.icon-button'
  ].join(',');

  const ROUTE_INTENT_SELECTOR = [
    '.main-nav [data-view]',
    '[data-view-target]',
    '[data-open-album]',
    '[data-track-cover-link]',
    '[data-track-detail-route]',
    '[data-track-detail-action="back"]'
  ].join(',');

  const NO_BLOOM_SELECTOR = [
    '.project-album-actions .text-button[data-open-album]',
    '.track-detail-album-link'
  ].join(',');

  const pressTimers = new WeakMap();
  const impactTimers = new WeakMap();
  let routeTransitionTimer = 0;
  let routeTransitionTicket = 0;
  let routeAnimation = null;
  let lastAnimatedRoute = '';
  let lastAnimatedAt = 0;

  function reducedMotion() {
    return globalThis.matchMedia?.(REDUCED_MOTION)?.matches === true;
  }

  function mobilePerformanceMode() {
    return globalThis.matchMedia?.(MOBILE_PERFORMANCE_QUERY)?.matches === true;
  }

  function premiumMotionSuppressed() {
    return reducedMotion() || mobilePerformanceMode();
  }

  function closestInteractive(target, selector = PRESS_SELECTOR) {
    if (!(target instanceof Element)) return null;
    const element = target.closest(selector);
    if (!(element instanceof HTMLElement) || !document.body.contains(element)) return null;
    if ('disabled' in element && element.disabled) return null;
    return element;
  }

  function clearTimer(map, element) {
    const timer = map.get(element);
    if (timer) window.clearTimeout(timer);
    map.delete(element);
  }

  function localPointer(element, event) {
    const rect = element.getBoundingClientRect();
    const pointerAvailable = Number.isFinite(event?.clientX) && Number.isFinite(event?.clientY) && event?.detail !== 0;
    if (!rect.width || !rect.height || !pointerAvailable) {
      return { x: rect.width / 2, y: rect.height / 2 };
    }
    return {
      x: Math.min(rect.width, Math.max(0, event.clientX - rect.left)),
      y: Math.min(rect.height, Math.max(0, event.clientY - rect.top))
    };
  }

  function beginPress(element) {
    clearTimer(pressTimers, element);
    element.classList.remove('lp-releasing');
    element.classList.add('lp-pressing');
  }

  function endPress(element) {
    if (!element?.classList.contains('lp-pressing')) return;
    element.classList.remove('lp-pressing');
    element.classList.add('lp-releasing');
    clearTimer(pressTimers, element);
    pressTimers.set(element, window.setTimeout(() => {
      element.classList.remove('lp-releasing');
      pressTimers.delete(element);
    }, 220));
  }

  function triggerImpact(element, event) {
    if (premiumMotionSuppressed() || element.matches(NO_BLOOM_SELECTOR)) return;
    const point = localPointer(element, event);
    element.style.setProperty('--lp-bloom-x', `${point.x}px`);
    element.style.setProperty('--lp-bloom-y', `${point.y}px`);

    const priorBloom = element.querySelector(':scope > .lp-impact-bloom');
    priorBloom?.remove();

    const bloom = document.createElement('span');
    bloom.className = 'lp-impact-bloom';
    bloom.setAttribute('aria-hidden', 'true');
    element.appendChild(bloom);
    window.setTimeout(() => bloom.remove(), 460);

    clearTimer(impactTimers, element);
    element.classList.remove('lp-impact');
    void element.offsetWidth;
    element.classList.add('lp-impact');
    impactTimers.set(element, window.setTimeout(() => {
      element.classList.remove('lp-impact');
      impactTimers.delete(element);
    }, 380));
  }

  function routeKey() {
    return `${window.location.pathname}${window.location.search}${window.location.hash}`;
  }

  function currentRouteSurface() {
    return document.querySelector('.main-content > .view.active')
      || document.querySelector('.view.active');
  }

  function cleanupRouteAnimation(surface) {
    if (surface instanceof HTMLElement) surface.style.willChange = '';
    routeAnimation = null;
  }

  function animateRouteSurface() {
    if (premiumMotionSuppressed() || typeof Element.prototype.animate !== 'function') return;
    const surface = currentRouteSurface();
    if (!(surface instanceof HTMLElement)) return;

    const key = routeKey();
    const now = globalThis.performance?.now?.() ?? Date.now();
    if (key === lastAnimatedRoute && now - lastAnimatedAt < 220) return;
    lastAnimatedRoute = key;
    lastAnimatedAt = now;

    routeAnimation?.cancel?.();
    surface.style.willChange = 'opacity, transform';
    routeAnimation = surface.animate([
      {
        opacity: 0.68,
        transform: 'translate3d(0, 10px, 0)'
      },
      {
        offset: 0.62,
        opacity: 0.94,
        transform: 'translate3d(0, 2px, 0)'
      },
      {
        opacity: 1,
        transform: 'translate3d(0, 0, 0)'
      }
    ], {
      duration: 280,
      easing: 'cubic-bezier(.22,.61,.36,1)',
      fill: 'both'
    });
    routeAnimation.id = 'lp95-route-transition';
    routeAnimation.addEventListener('finish', () => {
      routeAnimation?.cancel?.();
      cleanupRouteAnimation(surface);
    }, { once: true });
    routeAnimation.addEventListener('cancel', () => cleanupRouteAnimation(surface), { once: true });
  }

  function scheduleRouteTransition({ beforeRoute = null } = {}) {
    if (mobilePerformanceMode()) return;
    window.clearTimeout(routeTransitionTimer);
    const ticket = ++routeTransitionTicket;
    routeTransitionTimer = window.setTimeout(() => {
      if (ticket !== routeTransitionTicket) return;
      if (beforeRoute && routeKey() === beforeRoute) return;
      window.requestAnimationFrame(() => {
        if (ticket !== routeTransitionTicket) return;
        animateRouteSurface();
      });
    }, 12);
  }

  function reorderDesktopNavigation() {
    const nav = document.querySelector('.main-nav');
    const albums = nav?.querySelector('[data-view="analytics"]');
    const favorites = nav?.querySelector('[data-view="favorites"]');
    if (!nav || !albums || !favorites || albums.nextElementSibling === favorites) return;
    nav.insertBefore(albums, favorites);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', reorderDesktopNavigation, { once: true });
  } else {
    reorderDesktopNavigation();
  }

  document.addEventListener('pointerdown', event => {
    if (event.button !== 0 || premiumMotionSuppressed()) return;
    const element = closestInteractive(event.target);
    if (element) beginPress(element);
  }, { passive: true, capture: true });

  document.addEventListener('pointerup', event => {
    if (mobilePerformanceMode()) return;
    const element = closestInteractive(event.target);
    if (element) endPress(element);
  }, { passive: true, capture: true });

  document.addEventListener('pointercancel', event => {
    if (mobilePerformanceMode()) return;
    const element = closestInteractive(event.target);
    if (element) endPress(element);
  }, { passive: true, capture: true });

  document.addEventListener('pointerleave', event => {
    if (mobilePerformanceMode()) return;
    const element = closestInteractive(event.target);
    if (element) endPress(element);
  }, { passive: true, capture: true });

  document.addEventListener('click', event => {
    const element = closestInteractive(event.target, BLOOM_SELECTOR);
    if (element && !mobilePerformanceMode()) {
      endPress(element);
      triggerImpact(element, event);
    }

    const routeIntent = event.target instanceof Element
      ? event.target.closest(ROUTE_INTENT_SELECTOR)
      : null;
    if (routeIntent && !mobilePerformanceMode()) {
      const beforeRoute = routeKey();
      window.setTimeout(() => scheduleRouteTransition({ beforeRoute }), 0);
    }
  }, true);

  document.addEventListener('keydown', event => {
    if (event.repeat || (event.key !== 'Enter' && event.key !== ' ')) return;
    const element = closestInteractive(event.target, BLOOM_SELECTOR);
    if (element && !premiumMotionSuppressed()) beginPress(element);
  }, true);

  document.addEventListener('keyup', event => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    const element = closestInteractive(event.target, BLOOM_SELECTOR);
    if (!element || mobilePerformanceMode()) return;
    endPress(element);
    triggerImpact(element, null);
  }, true);

  window.addEventListener('shinobi:route-change', () => scheduleRouteTransition());
  window.addEventListener('hashchange', () => scheduleRouteTransition());
  window.addEventListener('popstate', () => scheduleRouteTransition());
})();