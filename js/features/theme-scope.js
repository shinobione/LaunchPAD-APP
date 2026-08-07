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

function setStyleIfChanged(target, property, value) {
  if (!target || target.style.getPropertyValue(property) === value) return false;
  target.style.setProperty(property, value);
  return true;
}

function setDataIfChanged(target, attribute, value) {
  if (!target || !attribute) return false;
  if (target.dataset[attribute] === value) return false;
  target.dataset[attribute] = value;
  return true;
}

function setPalette(target, track, attribute) {
  if (!target || !track) return false;
  const [accent, accent2] = getTrackPalette(track);
  let changed = false;
  changed = setStyleIfChanged(target, '--accent', accent) || changed;
  changed = setStyleIfChanged(target, '--accent2', accent2) || changed;
  changed = setStyleIfChanged(target, '--page-accent', accent) || changed;
  changed = setStyleIfChanged(target, '--page-accent2', accent2) || changed;
  if (attribute) changed = setDataIfChanged(target, attribute, track.id) || changed;
  return changed;
}

function clearPlayerScope(target) {
  let changed = false;
  for (const property of ['--accent', '--accent2', '--player-accent', '--player-accent2']) {
    if (target.style.getPropertyValue(property)) {
      target.style.removeProperty(property);
      changed = true;
    }
  }
  if (target.dataset.playerTrackTheme !== undefined) {
    delete target.dataset.playerTrackTheme;
    changed = true;
  }
  return changed;
}

function applyPlayerPalette(track) {
  const nodes = [...document.querySelectorAll(PLAYER_SCOPE_SELECTOR)];
  let changed = false;
  if (!track) {
    nodes.forEach(node => { changed = clearPlayerScope(node) || changed; });
    return changed;
  }
  const [accent, accent2] = getTrackPalette(track);
  nodes.forEach(node => {
    changed = setStyleIfChanged(node, '--accent', accent) || changed;
    changed = setStyleIfChanged(node, '--accent2', accent2) || changed;
    changed = setStyleIfChanged(node, '--player-accent', accent) || changed;
    changed = setStyleIfChanged(node, '--player-accent2', accent2) || changed;
    changed = setDataIfChanged(node, 'playerTrackTheme', track.id) || changed;
  });
  return changed;
}

function applyPagePalette(viewedTrack, fallbackTrack) {
  const pageTrack = viewedTrack || fallbackTrack;
  if (!pageTrack) return false;
  let changed = false;
  changed = setPalette(document.documentElement, pageTrack, 'pageTrackTheme') || changed;
  const app = document.querySelector('.app-shell');
  if (app) changed = setPalette(app, pageTrack, 'pageTrackTheme') || changed;

  const detail = document.querySelector('#view-track');
  if (viewedTrack && detail?.classList.contains('active')) {
    changed = setPalette(detail, viewedTrack, 'localTrackTheme') || changed;
    if (document.body.dataset.viewedTrackTheme !== viewedTrack.id) {
      document.body.dataset.viewedTrackTheme = viewedTrack.id;
      changed = true;
    }
  } else if (document.body.dataset.viewedTrackTheme !== undefined) {
    delete document.body.dataset.viewedTrackTheme;
    changed = true;
  }
  return changed;
}

export function initThemeScoping({ audio = document.querySelector('#audio') } = {}) {
  if (window.__shinobiThemeScopingReady) return;
  window.__shinobiThemeScopingReady = true;

  let scheduled = false;
  let lastSignature = '';
  const synchronize = () => {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      const played = playingTrack(audio);
      const viewed = trackFromRoute();
      const signature = `${viewed?.id || ''}|${played?.id || ''}`;
      let changed = false;
      changed = applyPagePalette(viewed, played) || changed;
      changed = applyPlayerPalette(played) || changed;
      const scope = viewed && played && viewed.id !== played.id ? 'split' : 'unified';
      if (document.documentElement.dataset.themeScope !== scope) {
        document.documentElement.dataset.themeScope = scope;
        changed = true;
      }

      if (changed || signature !== lastSignature) {
        lastSignature = signature;
        window.dispatchEvent(new CustomEvent('shinobi:theme-scope', {
          detail: { viewedTrackId: viewed?.id || null, playingTrackId: played?.id || null }
        }));
      }
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
