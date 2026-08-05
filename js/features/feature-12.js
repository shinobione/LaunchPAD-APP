import { getTrack } from '../core/catalog-store.js';
import { getTrackPalette } from '../core/theme.js';

const TRACK_ROUTE_PREFIX = '#track=';
const FILTER_GROUP_ORDER = ['genre', 'language', 'content', 'energy', 'era', 'type', 'media', 'year', 'mood'];

function trackFromRoute() {
  if (!window.location.hash.startsWith(TRACK_ROUTE_PREFIX)) return null;
  const id = decodeURIComponent(window.location.hash.slice(TRACK_ROUTE_PREFIX.length));
  return getTrack(id) || null;
}

function reorderCatalogFilters(root = document) {
  const groups = root.querySelector('.catalog-filter-groups');
  if (!groups) return;
  FILTER_GROUP_ORDER.forEach(key => {
    const group = groups.querySelector(`[data-filter-group="${key}"]`);
    if (group) groups.appendChild(group);
  });
  groups.dataset.phase12Order = 'genre-language-content-energy-era-secondary-mood';
}

function cleanStudioVideoLabels(root = document) {
  root.querySelectorAll('.lyrics-studio-canvas-badge').forEach(badge => badge.remove());
  root.querySelectorAll('[data-lyrics-studio="canvas"]').forEach(button => {
    const active = button.getAttribute('aria-pressed') !== 'false';
    button.textContent = active ? 'Video on' : 'Video off';
    button.setAttribute('aria-label', active ? 'Disable track video' : 'Enable track video');
  });
}

function integrateTrackSignals(view) {
  const copy = view?.querySelector('.track-detail-copy');
  const signals = view?.querySelector('.track-detail-signal-groups');
  if (!copy || !signals) return;
  signals.classList.add('track-detail-hero-signals');
  const tags = copy.querySelector('.track-detail-tags');
  if (tags) tags.insertAdjacentElement('afterend', signals);
  else copy.appendChild(signals);
}

function applyLocalTrackTheme() {
  const view = document.querySelector('#view-track');
  const track = trackFromRoute();
  if (!view || !track) return;
  const [accent, accent2] = getTrackPalette(track);
  view.style.setProperty('--accent', accent);
  view.style.setProperty('--accent2', accent2);
  view.dataset.localTrackTheme = track.id;
  integrateTrackSignals(view);
}

function synchronizePhase12(root = document) {
  reorderCatalogFilters(root);
  cleanStudioVideoLabels(root);
  applyLocalTrackTheme();
}

export function initPhase12() {
  if (window.__shinobiPhase12Ready) return;
  window.__shinobiPhase12Ready = true;

  const observer = new MutationObserver(records => {
    const relevant = records.some(record => record.addedNodes.length || record.type === 'attributes');
    if (relevant) queueMicrotask(() => synchronizePhase12());
  });
  observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'aria-pressed'] });

  window.addEventListener('hashchange', () => queueMicrotask(applyLocalTrackTheme));
  window.addEventListener('shinobi:route-change', () => queueMicrotask(applyLocalTrackTheme));
  window.addEventListener('shinobi:catalog-filtered', () => queueMicrotask(reorderCatalogFilters));
  window.addEventListener('shinobi:ready', () => synchronizePhase12());

  synchronizePhase12();
}
