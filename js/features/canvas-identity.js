import { tracks } from '../core/catalog-store.js';
import { ensureStylesheet } from '../core/assets.js';

const CARD_SELECTOR = '.album-card[data-index]';
const PREVIEW_SELECTOR = 'video.canvas-card-preview-video';
const HOVER_DELAY = 420;
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

  let activeCard = null;
  let hoverTimer = 0;
  let disposed = false;

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
    } else {
      button.removeAttribute('aria-disabled');
      button.removeAttribute('title');
    }
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
    if (!track?.video || !video || !policyAllowsPreview()) return false;
    if (card.hidden || !card.closest('.view')?.classList.contains('active')) return false;

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
      if (activeCard !== card) return false;
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
  }

  function decorate(scope = root) {
    if (scope instanceof Element && scope.matches(CARD_SELECTOR)) decorateCard(scope);
    scope.querySelectorAll?.(CARD_SELECTOR).forEach(decorateCard);
  }

  function clearHoverTimer() {
    window.clearTimeout(hoverTimer);
    hoverTimer = 0;
  }

  function onPointerEnter(event) {
    const card = event.target.closest?.(CARD_SELECTOR);
    if (!card?.classList.contains('has-canvas-identity')) return;
    if (!hoverPreview.matches || !policyAllowsPreview()) return;
    clearHoverTimer();
    hoverTimer = window.setTimeout(() => startPreview(card, 'desktop-hover'), HOVER_DELAY);
  }

  function onPointerLeave(event) {
    const card = event.target.closest?.(CARD_SELECTOR);
    if (!card?.classList.contains('has-canvas-identity')) return;
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

  function onCanvasState(event) {
    const video = event.target.closest?.(PREVIEW_SELECTOR);
    if (!video) return;
    const card = video.closest(CARD_SELECTOR);
    const playing = Boolean(event.detail?.playing);
    syncCardState(card, playing);
    if (playing) activeCard = card;
    else if (activeCard === card && event.detail?.reason !== 'page-hidden' && event.detail?.reason !== 'offscreen') {
      activeCard = null;
    }
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
  }

  function stopForRouteChange() {
    clearHoverTimer();
    stopPreview(activeCard, { release: true });
  }

  const observer = new MutationObserver(records => {
    records.forEach(record => record.addedNodes.forEach(node => {
      if (node instanceof Element) decorate(node);
    }));
    if (activeCard && !activeCard.isConnected) activeCard = null;
  });
  observer.observe(root.documentElement || root, { childList: true, subtree: true });

  root.addEventListener('pointerenter', onPointerEnter, true);
  root.addEventListener('pointerleave', onPointerLeave, true);
  root.addEventListener('click', onClick, true);
  root.addEventListener('shinobi:canvas-state', onCanvasState);
  root.addEventListener('error', onVideoError, true);
  window.addEventListener('hashchange', stopForRouteChange);
  window.addEventListener(ROUTE_CHANGE_EVENT, stopForRouteChange);
  window.addEventListener('pagehide', stopForRouteChange);
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
      root.removeEventListener('pointerenter', onPointerEnter, true);
      root.removeEventListener('pointerleave', onPointerLeave, true);
      root.removeEventListener('click', onClick, true);
      root.removeEventListener('shinobi:canvas-state', onCanvasState);
      root.removeEventListener('error', onVideoError, true);
      window.removeEventListener('hashchange', stopForRouteChange);
      window.removeEventListener(ROUTE_CHANGE_EVENT, stopForRouteChange);
      window.removeEventListener('pagehide', stopForRouteChange);
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
