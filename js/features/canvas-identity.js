import { tracks } from '../core/catalog-store.js';
import { ensureStylesheet } from '../core/assets.js';

const CARD_SELECTOR = '.album-card[data-index]';
const PREVIEW_SELECTOR = 'video.canvas-card-preview-video';
const HOVER_DELAY = 420;
const VIEWPORT_THRESHOLD = 0.22;
const ROUTE_CHANGE_EVENT = 'shinobi:route-change';

function fallbackMediaQuery() {
  return {
    matches: false,
    addEventListener() {},
    removeEventListener() {}
  };
}

function queryMedia(query) {
  try {
    return window.matchMedia?.(query) || fallbackMediaQuery();
  } catch {
    return fallbackMediaQuery();
  }
}

function createBadge(track) {
  const badge = document.createElement('span');
  badge.className = 'canvas-card-badge';
  badge.textContent = 'CANVAS';
  badge.setAttribute('aria-label', `Canvas available for ${track.title}`);
  return badge;
}

function createPreviewVideo(track) {
  const video = document.createElement('video');
  video.className = 'canvas-card-preview-video';
  video.controls = false;
  video.muted = true;
  video.defaultMuted = true;
  video.loop = true;
  video.playsInline = true;
  video.preload = 'none';
  video.disablePictureInPicture = true;
  video.dataset.src = track.video;
  video.dataset.trackId = track.id;
  video.setAttribute('muted', '');
  video.setAttribute('loop', '');
  video.setAttribute('playsinline', '');
  video.setAttribute('aria-hidden', 'true');
  video.setAttribute('controlslist', 'nodownload noplaybackrate noremoteplayback');
  return video;
}

function createActions(track) {
  const actions = document.createElement('div');
  actions.className = 'canvas-card-actions';

  const preview = document.createElement('button');
  preview.type = 'button';
  preview.className = 'canvas-card-preview-toggle';
  preview.dataset.canvasPreviewTrack = track.id;
  preview.setAttribute('aria-pressed', 'false');
  preview.setAttribute('aria-label', `Preview Canvas for ${track.title}`);
  preview.textContent = 'Canvas';

  const destination = document.createElement('button');
  destination.type = 'button';
  destination.className = 'canvas-card-studio-link';
  destination.dataset.canvasStudioTrack = track.id;
  destination.dataset.canvasStudioAvailable = String(Boolean(track.lyrics));
  destination.setAttribute(
    'aria-label',
    `${track.lyrics ? 'Open Studio' : 'Open track'} for ${track.title}`
  );
  destination.textContent = track.lyrics ? 'Studio' : 'Track';

  actions.append(preview, destination);
  return actions;
}

export function initCanvasIdentity({ root = document } = {}) {
  if (window.__shinobiCanvasIdentity) return window.__shinobiCanvasIdentity;

  ensureStylesheet('css/canvas-identity.css');

  const hoverPreview = queryMedia('(hover: hover) and (pointer: fine)');
  const reducedMotion = queryMedia('(prefers-reduced-motion: reduce)');
  const reducedData = queryMedia('(prefers-reduced-data: reduce)');
  const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  const visibleCards = new WeakSet();

  let activeCard = null;
  let hoverTimer = 0;
  let disposed = false;
  let visibilityObserver = null;

  function policyAllowsPreview() {
    return !reducedMotion.matches
      && !reducedData.matches
      && !connection?.saveData;
  }

  function trackForCard(card) {
    const index = Number(card?.dataset.index);
    return Number.isInteger(index) ? tracks[index] || null : null;
  }

  function previewVideo(card) {
    return card?.querySelector(PREVIEW_SELECTOR) || null;
  }

  function previewButton(card) {
    return card?.querySelector('[data-canvas-preview-track]') || null;
  }

  function cardIsUseful(card) {
    if (!card?.isConnected || card.hidden || document.visibilityState === 'hidden') return false;
    const view = card.closest('.view');
    if (view && !view.classList.contains('active')) return false;
    return !visibilityObserver || visibleCards.has(card);
  }

  function releaseVideo(video) {
    if (!video) return;
    video.removeAttribute('src');
    try {
      video.load();
    } catch {
      // Some older WebViews reject load() while a card is being removed.
    }
  }

  function syncCardState(card, playing, { unavailable = false } = {}) {
    if (!card) return;
    const button = previewButton(card);
    card.classList.toggle('is-canvas-previewing', playing);
    card.classList.remove('is-canvas-loading');
    card.classList.toggle('is-canvas-unavailable', unavailable);
    if (!button) return;
    button.setAttribute('aria-pressed', String(playing));
    button.textContent = playing ? 'Stop' : 'Canvas';
    if (unavailable) {
      button.setAttribute('aria-disabled', 'true');
      button.title = 'Canvas preview unavailable';
    } else if (policyAllowsPreview()) {
      button.removeAttribute('aria-disabled');
      button.removeAttribute('title');
    }
  }

  function syncPolicyControls() {
    const allowed = policyAllowsPreview();
    root.querySelectorAll?.('[data-canvas-preview-track]').forEach(button => {
      const card = button.closest(CARD_SELECTOR);
      if (card?.classList.contains('is-canvas-unavailable')) return;
      button.setAttribute('aria-disabled', String(!allowed));
      button.title = allowed ? '' : 'Canvas preview disabled by motion or data-saving settings';
      card?.classList.toggle('is-canvas-policy-blocked', !allowed);
    });
  }

  function stopPreview(card = activeCard, { release = true } = {}) {
    if (!card) return;
    const video = previewVideo(card);
    if (video && !video.paused) video.pause();
    syncCardState(card, false);
    if (release) releaseVideo(video);
    if (activeCard === card) activeCard = null;
  }

  async function startPreview(card, reason = 'manual') {
    const track = trackForCard(card);
    const video = previewVideo(card);
    if (!track?.video || !video || !policyAllowsPreview() || !cardIsUseful(card)) return false;

    if (activeCard && activeCard !== card) stopPreview(activeCard, { release: true });
    activeCard = card;
    card.classList.add('is-canvas-loading');
    card.classList.remove('is-canvas-unavailable');

    if (!video.getAttribute('src')) {
      video.src = video.dataset.src;
      video.load();
    }

    video.muted = true;
    try {
      await video.play();
      if (activeCard !== card || !cardIsUseful(card)) {
        stopPreview(card, { release: true });
        return false;
      }
      syncCardState(card, true);
      card.dataset.canvasPreviewReason = reason;
      return true;
    } catch (error) {
      console.info('Canvas card preview could not start.', error);
      syncCardState(card, false, { unavailable: true });
      releaseVideo(video);
      if (activeCard === card) activeCard = null;
      return false;
    }
  }

  function decorateCard(card) {
    if (!(card instanceof Element) || card.dataset.canvasIdentityReady === 'true') return;
    const track = trackForCard(card);
    if (!track?.video) return;
    const cover = card.querySelector('.cover-wrap');
    if (!cover) return;

    card.dataset.canvasIdentityReady = 'true';
    card.dataset.canvasTrackId = track.id;
    card.classList.add('has-canvas-identity');
    if (cover.querySelector('.lyrics-card-badge')) card.classList.add('has-lyrics-badge');

    cover.prepend(createPreviewVideo(track));
    cover.append(createBadge(track), createActions(track));
    visibilityObserver?.observe(card);
  }

  function decorate(scope = root) {
    if (scope instanceof Element && scope.matches(CARD_SELECTOR)) decorateCard(scope);
    scope.querySelectorAll?.(CARD_SELECTOR).forEach(decorateCard);
    syncPolicyControls();
  }

  function clearHoverTimer() {
    window.clearTimeout(hoverTimer);
    hoverTimer = 0;
  }

  function onPointerOver(event) {
    const card = event.target.closest?.(CARD_SELECTOR);
    if (!card?.classList.contains('has-canvas-identity')) return;
    if (event.relatedTarget instanceof Node && card.contains(event.relatedTarget)) return;
    if (!hoverPreview.matches || !policyAllowsPreview() || !cardIsUseful(card)) return;
    clearHoverTimer();
    hoverTimer = window.setTimeout(() => startPreview(card, 'desktop-hover'), HOVER_DELAY);
  }

  function onPointerOut(event) {
    const card = event.target.closest?.(CARD_SELECTOR);
    if (!card?.classList.contains('has-canvas-identity')) return;
    if (event.relatedTarget instanceof Node && card.contains(event.relatedTarget)) return;
    clearHoverTimer();
    if (activeCard === card) stopPreview(card, { release: true });
  }

  function onClick(event) {
    const preview = event.target.closest?.('[data-canvas-preview-track]');
    if (preview) {
      event.preventDefault();
      event.stopPropagation();
      const card = preview.closest(CARD_SELECTOR);
      if (!card || preview.getAttribute('aria-disabled') === 'true') return;
      if (activeCard === card && !previewVideo(card)?.paused) {
        stopPreview(card, { release: true });
      } else {
        startPreview(card, 'explicit-action');
      }
      return;
    }

    const studio = event.target.closest?.('[data-canvas-studio-track]');
    if (!studio) return;
    event.preventDefault();
    event.stopPropagation();
    stopPreview(activeCard, { release: true });
    const trackId = studio.dataset.canvasStudioTrack;
    const route = studio.dataset.canvasStudioAvailable === 'true' ? 'studio' : 'track';
    window.location.hash = `#${route}=${encodeURIComponent(trackId)}`;
  }

  function onPreviewPlay(event) {
    const video = event.target.closest?.(PREVIEW_SELECTOR);
    if (!video) return;
    const card = video.closest(CARD_SELECTOR);
    if (activeCard && activeCard !== card) stopPreview(activeCard, { release: true });
    activeCard = card;
    syncCardState(card, true);
  }

  function onPreviewPause(event) {
    const video = event.target.closest?.(PREVIEW_SELECTOR);
    if (!video) return;
    const card = video.closest(CARD_SELECTOR);
    syncCardState(card, false);
    if (activeCard === card) activeCard = null;
  }

  function onVideoError(event) {
    const video = event.target.closest?.(PREVIEW_SELECTOR);
    if (!video) return;
    const card = video.closest(CARD_SELECTOR);
    syncCardState(card, false, { unavailable: true });
    releaseVideo(video);
    if (activeCard === card) activeCard = null;
  }

  function stopForPolicyChange() {
    if (!policyAllowsPreview()) stopPreview(activeCard, { release: true });
    syncPolicyControls();
  }

  function stopForContextChange() {
    clearHoverTimer();
    stopPreview(activeCard, { release: true });
  }

  visibilityObserver = typeof IntersectionObserver === 'function'
    ? new IntersectionObserver(records => {
      records.forEach(record => {
        const visible = Boolean(record.isIntersecting && record.intersectionRatio >= VIEWPORT_THRESHOLD);
        if (visible) visibleCards.add(record.target);
        else visibleCards.delete(record.target);
        if (!visible && activeCard === record.target) stopPreview(record.target, { release: true });
      });
    }, { threshold: [0, VIEWPORT_THRESHOLD, 0.5, 1] })
    : null;

  const observer = new MutationObserver(records => {
    records.forEach(record => record.addedNodes.forEach(node => {
      if (node instanceof Element) decorate(node);
    }));
    if (activeCard && !activeCard.isConnected) activeCard = null;
  });
  observer.observe(root.documentElement || root, { childList: true, subtree: true });

  root.addEventListener('pointerover', onPointerOver, true);
  root.addEventListener('pointerout', onPointerOut, true);
  root.addEventListener('click', onClick, true);
  root.addEventListener('play', onPreviewPlay, true);
  root.addEventListener('pause', onPreviewPause, true);
  root.addEventListener('error', onVideoError, true);
  document.addEventListener('visibilitychange', stopForContextChange);
  window.addEventListener('hashchange', stopForContextChange);
  window.addEventListener(ROUTE_CHANGE_EVENT, stopForContextChange);
  window.addEventListener('pagehide', stopForContextChange);
  reducedMotion.addEventListener?.('change', stopForPolicyChange);
  reducedData.addEventListener?.('change', stopForPolicyChange);
  connection?.addEventListener?.('change', stopForPolicyChange);

  const controller = {
    decorate,
    stopPreview,
    get activePreview() {
      return previewVideo(activeCard);
    },
    destroy() {
      if (disposed) return;
      disposed = true;
      clearHoverTimer();
      stopPreview(activeCard, { release: true });
      observer.disconnect();
      visibilityObserver?.disconnect();
      root.removeEventListener('pointerover', onPointerOver, true);
      root.removeEventListener('pointerout', onPointerOut, true);
      root.removeEventListener('click', onClick, true);
      root.removeEventListener('play', onPreviewPlay, true);
      root.removeEventListener('pause', onPreviewPause, true);
      root.removeEventListener('error', onVideoError, true);
      document.removeEventListener('visibilitychange', stopForContextChange);
      window.removeEventListener('hashchange', stopForContextChange);
      window.removeEventListener(ROUTE_CHANGE_EVENT, stopForContextChange);
      window.removeEventListener('pagehide', stopForContextChange);
      reducedMotion.removeEventListener?.('change', stopForPolicyChange);
      reducedData.removeEventListener?.('change', stopForPolicyChange);
      connection?.removeEventListener?.('change', stopForPolicyChange);
      if (window.__shinobiCanvasIdentity === controller) delete window.__shinobiCanvasIdentity;
    }
  };

  window.__shinobiCanvasIdentity = controller;
  decorate(root);
  return controller;
}
