import { getTrack } from '../core/catalog-store.js';
import { getTrackPalette } from '../core/theme.js';

const TRACK_ROUTE_PREFIX = '#track=';
const PLAYER_SCOPE_SELECTOR = [
  '.side-player',
  '.player-bar',
  '.current-track',
  '.mini-player',
  '.lyrics-player',
  '[data-player-scope]'
].join(',');

function trackFromRoute() {
  if (!window.location.hash.startsWith(TRACK_ROUTE_PREFIX)) return null;
  const id = decodeURIComponent(window.location.hash.slice(TRACK_ROUTE_PREFIX.length));
  return getTrack(id) || null;
}

function playingTrack(audio) {
  return getTrack(audio?.dataset?.trackId || '') || null;
}

function setPalette(target, track, attribute) {
  if (!target || !track) return false;
  const [accent, accent2] = getTrackPalette(track);
  target.style.setProperty('--accent', accent);
  target.style.setProperty('--accent2', accent2);
  target.style.setProperty('--page-accent', accent);
  target.style.setProperty('--page-accent2', accent2);
  if (attribute) target.dataset[attribute] = track.id;
  return true;
}

function clearPlayerScope(target) {
  target.style.removeProperty('--accent');
  target.style.removeProperty('--accent2');
  target.style.removeProperty('--player-accent');
  target.style.removeProperty('--player-accent2');
  delete target.dataset.playerTrackTheme;
}

function applyPlayerPalette(track) {
  const nodes = [...document.querySelectorAll(PLAYER_SCOPE_SELECTOR)];
  if (!track) {
    nodes.forEach(clearPlayerScope);
    return;
  }
  const [accent, accent2] = getTrackPalette(track);
  nodes.forEach(node => {
    node.style.setProperty('--accent', accent);
    node.style.setProperty('--accent2', accent2);
    node.style.setProperty('--player-accent', accent);
    node.style.setProperty('--player-accent2', accent2);
    node.dataset.playerTrackTheme = track.id;
  });
}

function applyPagePalette(viewedTrack, fallbackTrack) {
  const pageTrack = viewedTrack || fallbackTrack;
  if (!pageTrack) return;
  setPalette(document.documentElement, pageTrack, 'pageTrackTheme');
  const app = document.querySelector('.app-shell');
  if (app) setPalette(app, pageTrack, 'pageTrackTheme');

  const detail = document.querySelector('#view-track');
  if (viewedTrack && detail?.classList.contains('active')) {
    setPalette(detail, viewedTrack, 'localTrackTheme');
    document.body.dataset.viewedTrackTheme = viewedTrack.id;
  } else {
    delete document.body.dataset.viewedTrackTheme;
  }
}

export function initThemeScoping({ audio = document.querySelector('#audio') } = {}) {
  if (window.__shinobiThemeScopingReady) return;
  window.__shinobiThemeScopingReady = true;

  let scheduled = false;
  const synchronize = () => {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      const played = playingTrack(audio);
      const viewed = trackFromRoute();
      applyPagePalette(viewed, played);
      applyPlayerPalette(played);
      document.documentElement.dataset.themeScope = viewed && played && viewed.id !== played.id
        ? 'split'
        : 'unified';
      window.dispatchEvent(new CustomEvent('shinobi:theme-scope', {
        detail: { viewedTrackId: viewed?.id || null, playingTrackId: played?.id || null }
      }));
    });
  };

  ['hashchange', 'popstate', 'shinobi:route-change', 'shinobi:ready', 'shinobi:track-detail-themed']
    .forEach(type => window.addEventListener(type, synchronize));
  ['play', 'playing', 'pause', 'loadedmetadata', 'emptied']
    .forEach(type => audio?.addEventListener(type, synchronize));

  if (audio) {
    new MutationObserver(synchronize).observe(audio, {
      attributes: true,
      attributeFilter: ['data-track-id', 'src']
    });
  }

  new MutationObserver(records => {
    if (records.some(record => [...record.addedNodes].some(node => node instanceof Element && (node.matches?.(PLAYER_SCOPE_SELECTOR) || node.querySelector?.(PLAYER_SCOPE_SELECTOR))))) {
      synchronize();
    }
  }).observe(document.body, { childList: true, subtree: true });

  synchronize();
}
