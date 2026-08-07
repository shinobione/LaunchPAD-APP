import { getTrack } from '../core/catalog-store.js';
import { getTrackPalette } from '../core/theme.js';

const TRACK_ROUTE_PREFIX = '#track=';

function routeTrack() {
  if (!window.location.hash.startsWith(TRACK_ROUTE_PREFIX)) return null;
  const id = decodeURIComponent(window.location.hash.slice(TRACK_ROUTE_PREFIX.length));
  return getTrack(id) || null;
}

function setStyleIfChanged(target, property, value) {
  if (!target) return false;
  if (target.style.getPropertyValue(property) === value) return false;
  target.style.setProperty(property, value);
  return true;
}

function applyTrackDetailPalette() {
  const view = document.querySelector('#view-track');
  const track = routeTrack();
  if (!view || !track || !view.classList.contains('active')) return false;
  const [accent, accent2] = getTrackPalette(track);
  const hero = view.querySelector('.track-detail-hero');
  const play = view.querySelector('.track-detail-actions .primary');
  const signature = `${track.id}|${accent}|${accent2}`;
  let changed = view.dataset.phase13ThemeSignature !== signature;

  changed = setStyleIfChanged(view, '--accent', accent) || changed;
  changed = setStyleIfChanged(view, '--accent2', accent2) || changed;
  if (view.dataset.localTrackTheme !== track.id) {
    view.dataset.localTrackTheme = track.id;
    changed = true;
  }

  if (hero) {
    changed = setStyleIfChanged(hero, '--accent', accent) || changed;
    changed = setStyleIfChanged(hero, '--accent2', accent2) || changed;
  }
  if (play) {
    changed = setStyleIfChanged(play, '--accent', accent) || changed;
    changed = setStyleIfChanged(play, '--accent2', accent2) || changed;
  }

  const expectedTitle = `${track.title} — Track details — SHINOBIWAN`;
  if (document.title !== expectedTitle) document.title = expectedTitle;
  view.dataset.phase13ThemeSignature = signature;

  if (changed) {
    window.dispatchEvent(new CustomEvent('shinobi:track-detail-themed', {
      detail: { trackId: track.id, accent, accent2 }
    }));
  }
  return true;
}

function clearTrackDetailPalette() {
  const view = document.querySelector('#view-track');
  if (!view || view.classList.contains('active')) return;
  view.style.removeProperty('--accent');
  view.style.removeProperty('--accent2');
  view.removeAttribute('data-local-track-theme');
  view.removeAttribute('data-phase13-theme-signature');
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

  document.addEventListener('click', event => {
    if (event.target.closest?.('img[data-track-cover-link], [data-track-detail-action], [data-play-index]')) synchronize();
  }, true);

  synchronize();
}
