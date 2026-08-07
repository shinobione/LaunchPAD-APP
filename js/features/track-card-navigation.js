import { tracks } from '../core/catalog-store.js';
import { ensureStylesheet } from '../core/assets.js';

function proxyOpenTrack(trackId) {
  if (!trackId) return;
  const existing = document.querySelector(`img[data-track-cover-link="${CSS.escape(trackId)}"]`);
  if (existing) {
    existing.click();
    return;
  }

  const proxy = document.createElement('img');
  proxy.hidden = true;
  proxy.dataset.trackCoverLink = trackId;
  document.body.appendChild(proxy);
  proxy.click();
  proxy.remove();
}

function trackFromIndex(value) {
  const index = Number(value);
  return Number.isInteger(index) ? tracks[index] || null : null;
}

function addHistoryQuickPlay(row) {
  if (!(row instanceof Element) || row.querySelector('.memory-history-quick-play')) return;
  const legacy = row.querySelector('.memory-history-play[data-play-index],.memory-history-play[data-track-navigation-index]');
  if (!legacy) return;

  const index = legacy.dataset.playIndex ?? legacy.dataset.trackNavigationIndex;
  const track = trackFromIndex(index);
  if (!track) return;

  legacy.dataset.trackNavigationIndex = index;
  delete legacy.dataset.playIndex;
  legacy.setAttribute('aria-label', `Open details for ${track.title}`);
  legacy.title = `Open ${track.title}`;

  const play = document.createElement('button');
  play.type = 'button';
  play.className = 'memory-history-quick-play';
  play.dataset.playIndex = index;
  play.setAttribute('aria-label', `Play ${track.title}`);
  play.title = `Play ${track.title}`;
  play.textContent = '▶';
  row.insertBefore(play, row.querySelector('.memory-row-favorite') || null);
}

function decorateHistory(root = document) {
  if (root instanceof Element && root.matches('.memory-history-row')) addHistoryQuickPlay(root);
  root.querySelectorAll?.('.memory-history-row').forEach(addHistoryQuickPlay);
}

function isCardAction(target, card) {
  const action = target.closest?.('button,a,input,select,textarea,[role="button"]');
  return Boolean(action && action !== card);
}

function openRowImage(row) {
  const image = row.querySelector('img[data-track-cover-link]');
  if (!image) return false;
  image.click();
  return true;
}

function handleClick(event) {
  const target = event.target instanceof Element ? event.target : null;
  if (!target || target.closest('img[data-track-cover-link]')) return;

  const albumTrack = target.closest('.album-detail-track');
  if (albumTrack) {
    if (target.closest('.album-detail-play')) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    if (!openRowImage(albumTrack)) {
      const image = albumTrack.querySelector('img');
      const match = image?.getAttribute('src');
      const track = tracks.find(item => item.cover === match || item.fullCover === match);
      proxyOpenTrack(track?.id);
    }
    return;
  }

  const projectTrack = target.closest('.project-track');
  if (projectTrack) {
    if (target.closest('.track-play')) return;
    const track = trackFromIndex(projectTrack.dataset.playIndex);
    if (!track) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    proxyOpenTrack(track.id);
    return;
  }

  const historyRow = target.closest('.memory-history-row');
  if (historyRow) {
    if (target.closest('[data-favorite-toggle],.memory-history-quick-play')) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    if (!openRowImage(historyRow)) {
      const legacy = historyRow.querySelector('.memory-history-play[data-track-navigation-index]');
      proxyOpenTrack(trackFromIndex(legacy?.dataset.trackNavigationIndex)?.id);
    }
    return;
  }

  const card = target.closest('.album-card[data-index]');
  if (card) {
    if (isCardAction(target, card)) return;
    const track = trackFromIndex(card.dataset.index);
    if (!track) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    proxyOpenTrack(track.id);
  }
}

function handleKeydown(event) {
  if (!['Enter', ' '].includes(event.key)) return;
  const target = event.target instanceof Element ? event.target : null;
  if (!target) return;

  const card = target.closest('.album-card[data-track-surface]');
  if (card && target === card) {
    const track = trackFromIndex(card.dataset.index);
    if (!track) return;
    event.preventDefault();
    proxyOpenTrack(track.id);
    return;
  }

  const historyRow = target.closest('.memory-history-row[data-track-surface]');
  if (historyRow && target === historyRow) {
    const index = historyRow.querySelector('[data-track-navigation-index]')?.dataset.trackNavigationIndex;
    const track = trackFromIndex(index);
    if (!track) return;
    event.preventDefault();
    proxyOpenTrack(track.id);
  }
}

function decorateTrackSurfaces(root = document) {
  if (root instanceof Element && root.matches('.album-card[data-index]')) {
    root.dataset.trackSurface = 'true';
    if (!root.hasAttribute('tabindex')) root.tabIndex = 0;
  }
  root.querySelectorAll?.('.album-card[data-index]').forEach(card => {
    card.dataset.trackSurface = 'true';
    if (!card.hasAttribute('tabindex')) card.tabIndex = 0;
  });

  if (root instanceof Element && root.matches('.memory-history-row')) {
    root.dataset.trackSurface = 'true';
    if (!root.hasAttribute('tabindex')) root.tabIndex = 0;
  }
  root.querySelectorAll?.('.memory-history-row').forEach(row => {
    row.dataset.trackSurface = 'true';
    if (!row.hasAttribute('tabindex')) row.tabIndex = 0;
  });
  decorateHistory(root);
}

export function initTrackCardNavigation() {
  if (window.__shinobiTrackCardNavigationReady) return;
  window.__shinobiTrackCardNavigationReady = true;
  ensureStylesheet('css/track-card-navigation.css');
  decorateTrackSurfaces();

  document.addEventListener('click', handleClick, true);
  document.addEventListener('keydown', handleKeydown, true);

  const favorites = document.querySelector('#view-favorites');
  if (favorites) {
    const observer = new MutationObserver(records => {
      records.forEach(record => record.addedNodes.forEach(node => {
        if (node instanceof Element) decorateTrackSurfaces(node);
      }));
    });
    observer.observe(favorites, { childList: true, subtree: true });
  }

  window.addEventListener('shinobi:route-change', () => decorateTrackSurfaces());
  window.addEventListener('shinobi:favorites-updated', () => decorateTrackSurfaces());
  window.addEventListener('shinobi:ready', () => decorateTrackSurfaces());
}
