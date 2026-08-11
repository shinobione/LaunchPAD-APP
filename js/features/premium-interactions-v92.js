(() => {
  if (globalThis.__shinobiPremiumInteractionsV92Ready) return;
  globalThis.__shinobiPremiumInteractionsV92Ready = true;

  const REDUCED_MOTION = '(prefers-reduced-motion: reduce)';
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

  const pressTimers = new WeakMap();
  const impactTimers = new WeakMap();

  function reducedMotion() {
    return globalThis.matchMedia?.(REDUCED_MOTION)?.matches === true;
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
    if (!rect.width || !rect.height || event.detail === 0) {
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
    if (reducedMotion()) return;
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

  document.addEventListener('pointerdown', event => {
    if (event.button !== 0 || reducedMotion()) return;
    const element = closestInteractive(event.target);
    if (element) beginPress(element);
  }, { passive: true, capture: true });

  document.addEventListener('pointerup', event => {
    const element = closestInteractive(event.target);
    if (element) endPress(element);
  }, { passive: true, capture: true });

  document.addEventListener('pointercancel', event => {
    const element = closestInteractive(event.target);
    if (element) endPress(element);
  }, { passive: true, capture: true });

  document.addEventListener('pointerleave', event => {
    const element = closestInteractive(event.target);
    if (element) endPress(element);
  }, { passive: true, capture: true });

  document.addEventListener('click', event => {
    const element = closestInteractive(event.target, BLOOM_SELECTOR);
    if (!element) return;
    endPress(element);
    triggerImpact(element, event);
  }, true);

  document.addEventListener('keydown', event => {
    if (event.repeat || (event.key !== 'Enter' && event.key !== ' ')) return;
    const element = closestInteractive(event.target, BLOOM_SELECTOR);
    if (element && !reducedMotion()) beginPress(element);
  }, true);

  document.addEventListener('keyup', event => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    const element = closestInteractive(event.target, BLOOM_SELECTOR);
    if (!element) return;
    endPress(element);
    triggerImpact(element, { ...event, detail: 0, clientX: 0, clientY: 0 });
  }, true);
})();
