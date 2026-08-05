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
  const current = [...groups.children].map(group => group.dataset.filterGroup).filter(Boolean);
  const desired = FILTER_GROUP_ORDER.filter(key => groups.querySelector(`[data-filter-group="${key}"]`));
  if (current.join('|') !== desired.join('|')) {
    desired.forEach(key => groups.appendChild(groups.querySelector(`[data-filter-group="${key}"]`)));
  }
  groups.dataset.phase12Order = 'genre-language-content-energy-era-secondary-mood';
}

function cleanStudioVideoLabels(root = document) {
  root.querySelectorAll('.lyrics-studio-canvas-badge').forEach(badge => badge.remove());
  root.querySelectorAll('[data-lyrics-studio="canvas"]').forEach(button => {
    const active = button.getAttribute('aria-pressed') !== 'false';
    const text = active ? 'Video on' : 'Video off';
    const label = active ? 'Disable track video' : 'Enable track video';
    if (button.textContent !== text) button.textContent = text;
    if (button.getAttribute('aria-label') !== label) button.setAttribute('aria-label', label);
  });
}

function integrateTrackSignals(view) {
  const copy = view?.querySelector('.track-detail-copy');
  const signals = view?.querySelector('.track-detail-signal-groups');
  if (!copy || !signals) return;
  signals.classList.add('track-detail-hero-signals');
  const tags = copy.querySelector('.track-detail-tags');
  if (tags && signals.previousElementSibling !== tags) tags.insertAdjacentElement('afterend', signals);
  else if (!tags && signals.parentElement !== copy) copy.appendChild(signals);
}

function applyLocalTrackTheme() {
  const view = document.querySelector('#view-track');
  const track = trackFromRoute();
  if (!view || !track) return;
  const [accent, accent2] = getTrackPalette(track);
  if (view.style.getPropertyValue('--accent') !== accent) view.style.setProperty('--accent', accent);
  if (view.style.getPropertyValue('--accent2') !== accent2) view.style.setProperty('--accent2', accent2);
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

  let scheduled = false;
  const schedule = () => {
    if (scheduled) return;
    scheduled = true;
    queueMicrotask(() => {
      scheduled = false;
      synchronizePhase12();
    });
  };
  const observer = new MutationObserver(records => {
    if (records.some(record => record.addedNodes.length || record.type === 'attributes')) schedule();
  });
  observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'aria-pressed'] });

  window.addEventListener('hashchange', schedule);
  window.addEventListener('shinobi:route-change', schedule);
  window.addEventListener('shinobi:catalog-filtered', schedule);
  window.addEventListener('shinobi:ready', schedule);

  synchronizePhase12();
}
