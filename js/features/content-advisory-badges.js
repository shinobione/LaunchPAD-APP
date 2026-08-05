import { tracks } from '../core/catalog-store.js';
import { ensureStylesheet } from '../core/assets.js';

function advisoryFor(track) {
  if (track?.explicit === true) return { value: 'explicit', label: 'EXPLICIT' };
  if (track?.explicit === false) return { value: 'clean', label: 'CLEAN' };
  return null;
}

function trackForCard(card) {
  const candidates = [
    card?.dataset?.index,
    card?.dataset?.playIndex,
    card?.dataset?.albumDetailTrack
  ];
  for (const candidate of candidates) {
    const index = Number(candidate);
    if (Number.isInteger(index) && tracks[index]) return tracks[index];
  }
  return null;
}

function decorateLyricsBadge(badge) {
  if (!(badge instanceof HTMLElement) || badge.dataset.advisoryDecorated === 'true') return;
  const card = badge.closest('[data-index], [data-play-index], [data-album-detail-track]');
  const track = trackForCard(card);
  const advisory = advisoryFor(track);
  if (!track || !advisory) return;

  let stack = badge.closest('.track-cover-status-stack');
  if (!stack) {
    stack = document.createElement('span');
    stack.className = 'track-cover-status-stack';
    badge.before(stack);
    stack.appendChild(badge);
  }

  stack.querySelector('[data-content-advisory]')?.remove();
  const content = document.createElement('span');
  content.className = `content-advisory-badge ${advisory.value}`;
  content.dataset.contentAdvisory = advisory.value;
  content.textContent = advisory.label;
  stack.appendChild(content);
  badge.dataset.advisoryDecorated = 'true';
}

function removeSpotifyCanvasBadges(root = document) {
  root.querySelectorAll?.('.lyrics-studio-canvas-badge').forEach(element => element.remove());
}

function hydrate(root = document) {
  if (root instanceof HTMLElement && root.matches('.lyrics-card-badge')) decorateLyricsBadge(root);
  root.querySelectorAll?.('.lyrics-card-badge').forEach(decorateLyricsBadge);
  removeSpotifyCanvasBadges(root);
}

export function initContentAdvisoryBadges() {
  if (window.__shinobiContentAdvisoryReady) return;
  window.__shinobiContentAdvisoryReady = true;
  ensureStylesheet('css/feature-10.css');
  hydrate();

  const observer = new MutationObserver(records => {
    records.forEach(record => record.addedNodes.forEach(node => {
      if (node instanceof HTMLElement) hydrate(node);
    }));
  });
  observer.observe(document.body, { childList: true, subtree: true });

  window.addEventListener('shinobi:catalog-filtered', () => hydrate());
}
