import { getTrack } from '../core/catalog-store.js';
import { getTrackPalette } from '../core/theme.js';

const TRACK_ROUTE_PREFIX = '#track=';

function routeTrack() {
  if (!window.location.hash.startsWith(TRACK_ROUTE_PREFIX)) return null;
  const id = decodeURIComponent(window.location.hash.slice(TRACK_ROUTE_PREFIX.length));
  return getTrack(id) || null;
}

function applyTrackDetailPalette() {
  const view = document.querySelector('#view-track');
  const track = routeTrack();
  if (!view || !track || !view.classList.contains('active')) return false;
  const [accent, accent2] = getTrackPalette(track);
  view.style.setProperty('--accent', accent);
  view.style.setProperty('--accent2', accent2);
  view.dataset.localTrackTheme = track.id;
  const hero = view.querySelector('.track-detail-hero');
  if (hero) {
    hero.style.setProperty('--accent', accent);
    hero.style.setProperty('--accent2', accent2);
  }
  const play = view.querySelector('.track-detail-actions .primary');
  if (play) {
    play.style.setProperty('--accent', accent);
    play.style.setProperty('--accent2', accent2);
  }
  document.title = `${track.title} — Track details — SHINOBIWAN`;
  window.dispatchEvent(new CustomEvent('shinobi:track-detail-themed', {
    detail: { trackId: track.id, accent, accent2 }
  }));
  return true;
}

function clearTrackDetailPalette() {
  const view = document.querySelector('#view-track');
  if (!view || view.classList.contains('active')) return;
  view.style.removeProperty('--accent');
  view.style.removeProperty('--accent2');
  view.removeAttribute('data-local-track-theme');
}

export function initPhase13({ audio = document.querySelector('#audio') } = {}) {
  if (window.__shinobiPhase13Ready) return;
  window.__shinobiPhase13Ready = true;

  let scheduled = false;
  const synchronize = () => {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      if (!applyTrackDetailPalette()) clearTrackDetailPalette();
    });
  };

  window.addEventListener('hashchange', synchronize);
  window.addEventListener('popstate', synchronize);
  window.addEventListener('shinobi:route-change', synchronize);
  window.addEventListener('shinobi:ready', synchronize);
  audio?.addEventListener('play', synchronize);
  audio?.addEventListener('pause', synchronize);
  audio?.addEventListener('loadedmetadata', synchronize);

  const view = document.querySelector('#view-track');
  if (view) {
    new MutationObserver(synchronize).observe(view, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class']
    });
  }

  const title = document.querySelector('title');
  if (title) new MutationObserver(synchronize).observe(title, { childList: true });

  document.addEventListener('click', event => {
    if (event.target.closest?.('img[data-track-cover-link], [data-track-detail-action], [data-play-index]')) synchronize();
  }, true);

  synchronize();
}
