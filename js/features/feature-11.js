import { tracks } from '../core/catalog-store.js';
import {
  harmonizeCatalogOrder,
  latestActiveTrackEntries,
  recentlyAddedTrackEntries
} from '../core/catalog-ordering.js';
import { ensureStylesheet } from '../core/assets.js';

const VIDEO_SELECTOR = 'video.track-video-player, video.lyrics-studio-canvas-video';
const VIDEO_PLAYBACK_HANDLER = Symbol('feature11PlaybackHandler');
const SHAREABLE_ROUTE_PATTERN = /^#(?:track|album|lyrics|studio)=.+/i;
const LEGACY_DISCOGRAPHY_PATH = /\/discography\/?$/i;
const ROUTE_TRANSITION_CLASS = 'route-entering';
const ROUTE_TRANSITION_DURATION = 260;
let routeTransitionTimer = 0;

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function launchRootPath(pathname = window.location.pathname) {
  if (!LEGACY_DISCOGRAPHY_PATH.test(pathname)) return pathname;
  const parent = pathname.replace(LEGACY_DISCOGRAPHY_PATH, '');
  return `${parent || ''}/`;
}

export function normalizeLaunchRoute() {
  const hash = window.location.hash.trim();
  if (SHAREABLE_ROUTE_PATTERN.test(hash)) return;

  const target = `${launchRootPath()}${window.location.search}#home`;
  const current = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  if (current === target) return;
  window.history.replaceState(null, '', target);
}

export function prepareFeature11Catalog() {
  harmonizeCatalogOrder(tracks);
}

function featuredCard(track, index, { fallback = false, recent = false } = {}) {
  const dateLabel = fallback
    ? '<small class="release-date-fallback">Release date unavailable</small>'
    : '';
  const recentLabel = recent
    ? '<span class="catalog-card-context">Recently added</span>'
    : '';

  return `
    <article class="album-card" data-index="${index}" data-genre="${escapeHtml(track.genre)}">
      <div class="cover-wrap">
        <img src="${escapeHtml(track.cover)}" alt="Cover art for ${escapeHtml(track.title)}" loading="lazy">
        ${track.lyrics ? '<span class="lyrics-card-badge">LYRICS</span>' : ''}
        ${recentLabel}
        <button class="play-overlay" data-play-index="${index}" aria-label="Listen to ${escapeHtml(track.title)}">▶</button>
      </div>
      <h3>${escapeHtml(track.title)}</h3>
      <p>${escapeHtml(track.genre)} • ${escapeHtml(track.mood)}</p>
      ${dateLabel}
    </article>`;
}

function renderLatestReleases() {
  const grid = document.querySelector('#featured-grid');
  if (!grid) return;
  grid.innerHTML = latestActiveTrackEntries(tracks, 5)
    .map(({ track, index, sort }) => featuredCard(track, index, { fallback: sort.fallback }))
    .join('');
}

function ensureRecentlyAddedSection() {
  const featuredGrid = document.querySelector('#featured-grid');
  if (!featuredGrid) return null;

  let section = document.querySelector('#recently-added-section');
  if (section) return section;

  section = document.createElement('section');
  section.id = 'recently-added-section';
  section.className = 'recently-added-section';
  section.innerHTML = `
    <div class="section-head">
      <div><span class="eyebrow">CATALOG ACTIVITY</span><h2>Recently added</h2></div>
      <button class="text-button" data-view-target="library">View all →</button>
    </div>
    <p class="recently-added-description">Restored and newly imported catalog entries, ordered by technical import date.</p>
    <div class="album-grid" id="recently-added-grid"></div>`;
  featuredGrid.insertAdjacentElement('afterend', section);
  return section;
}

function renderRecentlyAdded() {
  const section = ensureRecentlyAddedSection();
  const grid = section?.querySelector('#recently-added-grid');
  if (!grid) return;

  const latestIds = new Set(
    latestActiveTrackEntries(tracks, 5).map(({ track }) => track.id)
  );
  const entries = recentlyAddedTrackEntries(tracks, tracks.length)
    .filter(({ track }) => !latestIds.has(track.id))
    .slice(0, 5);

  section.hidden = entries.length === 0;
  grid.innerHTML = entries
    .map(({ track, index }) => featuredCard(track, index, { recent: true }))
    .join('');
}

function renderHomeCatalogSections() {
  renderLatestReleases();
  renderRecentlyAdded();
}

function replayRouteTransition() {
  const activeView = document.querySelector('.view.active');
  if (!activeView) return;

  if (globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
    activeView.classList.remove(ROUTE_TRANSITION_CLASS);
    return;
  }

  activeView.classList.add(ROUTE_TRANSITION_CLASS);
  window.clearTimeout(routeTransitionTimer);
  routeTransitionTimer = window.setTimeout(() => {
    activeView.classList.remove(ROUTE_TRANSITION_CLASS);
  }, ROUTE_TRANSITION_DURATION + 40);
}

function installRouteTransitions() {
  if (window.__shinobiRouteTransitionsReady) return;
  window.__shinobiRouteTransitionsReady = true;
  window.addEventListener('shinobi:route-change', replayRouteTransition);
}

function relabelVideoUI(root = document) {
  root.querySelectorAll?.('[data-track-video-action]').forEach(button => {
    const expanded = button.getAttribute('aria-expanded') === 'true';
    button.textContent = expanded ? 'Player' : 'Video';
    button.setAttribute('aria-label', expanded ? 'Show player and track information' : 'Show track video');
  });

  root.querySelectorAll?.('.track-detail-canvas-badge').forEach(badge => {
    badge.textContent = 'VIDEO';
  });

  root.querySelectorAll?.('[aria-label*="Spotify Canvas"], [aria-label*="Silent looping Spotify Canvas"]').forEach(element => {
    const label = element.getAttribute('aria-label') || '';
    element.setAttribute('aria-label', label.replace(/Silent looping Spotify Canvas|Spotify Canvas/g, 'Looping track video'));
  });

  root.querySelectorAll?.('button').forEach(button => {
    const label = button.textContent.trim().toLowerCase();
    if (label === 'cropped' || label === 'open canvas' || label === 'show canvas') button.textContent = 'Video';
    if (label === 'show track' || label === 'hide canvas') button.textContent = 'Player';
  });
}

function stabilizeVideo(video) {
  if (!(video instanceof HTMLVideoElement) || video.dataset.feature11Stable === 'true') return;
  video.dataset.feature11Stable = 'true';
  video.muted = true;
  video.defaultMuted = true;
  video.loop = true;
  video.playsInline = true;
  video.preload = 'auto';
  video.setAttribute('muted', '');
  video.setAttribute('loop', '');
  video.setAttribute('playsinline', '');
  video.setAttribute('webkit-playsinline', '');
  video.setAttribute('preload', 'auto');

  let recoveryTimer = 0;
  let lastRecovery = 0;

  const visible = () => {
    const view = video.closest('.view');
    return video.isConnected && !video.closest('[hidden]') && (!view || view.classList.contains('active'));
  };

  const ensurePlayback = reason => {
    if (!visible() || document.visibilityState === 'hidden') return;
    video.muted = true;
    if (video.readyState < HTMLMediaElement.HAVE_FUTURE_DATA && video.networkState !== HTMLMediaElement.NETWORK_LOADING) {
      try { video.load(); } catch {}
    }
    const result = video.play();
    Promise.resolve(result).catch(error => console.info(`Track video recovery (${reason}) awaits a gesture.`, error));
  };

  video[VIDEO_PLAYBACK_HANDLER] = ensurePlayback;

  const recoverLoop = reason => {
    const now = performance.now();
    if (now - lastRecovery < 180) return;
    lastRecovery = now;
    window.clearTimeout(recoveryTimer);
    recoveryTimer = window.setTimeout(() => {
      if (!Number.isFinite(video.duration) || video.duration <= 0) {
        ensurePlayback(reason);
        return;
      }
      if (video.ended || video.currentTime >= video.duration - 0.08) {
        try { video.currentTime = 0.01; } catch {}
      }
      ensurePlayback(reason);
    }, 20);
  };

  video.addEventListener('ended', () => recoverLoop('ended'));
  video.addEventListener('stalled', () => recoverLoop('stalled'));
  video.addEventListener('waiting', () => recoverLoop('waiting'));
  video.addEventListener('suspend', () => {
    if (video.readyState < HTMLMediaElement.HAVE_FUTURE_DATA) recoverLoop('suspend');
  });
  video.addEventListener('timeupdate', () => {
    if (Number.isFinite(video.duration) && video.duration - video.currentTime < 0.12) recoverLoop('boundary');
  });
}

function installVideoStability(audio) {
  const hydrate = root => {
    if (root instanceof HTMLVideoElement && root.matches(VIDEO_SELECTOR)) stabilizeVideo(root);
    root.querySelectorAll?.(VIDEO_SELECTOR).forEach(video => stabilizeVideo(video));
    relabelVideoUI(root);
  };

  const connectedVideos = () => [...document.querySelectorAll(VIDEO_SELECTOR)];
  const synchronizeWithAudio = reason => {
    connectedVideos().forEach(video => {
      stabilizeVideo(video);
      if (audio?.paused || audio?.ended) {
        if (!video.paused) video.pause();
        return;
      }
      video[VIDEO_PLAYBACK_HANDLER]?.(reason);
    });
  };

  hydrate(document);
  new MutationObserver(records => {
    records.forEach(record => record.addedNodes.forEach(node => {
      if (node instanceof Element) hydrate(node);
    }));
  }).observe(document.body, { childList: true, subtree: true });

  document.addEventListener('click', event => queueMicrotask(() => {
    const scope = event.target.closest?.('.view') || document.querySelector('.view.active') || document;
    relabelVideoUI(scope);
  }), true);

  window.addEventListener('shinobi:route-change', () => queueMicrotask(() => {
    const activeView = document.querySelector('.view.active') || document;
    hydrate(activeView);
  }));

  audio?.addEventListener('play', () => synchronizeWithAudio('audio-play'));
  audio?.addEventListener('playing', () => synchronizeWithAudio('audio-playing'));
  audio?.addEventListener('pause', () => synchronizeWithAudio('audio-pause'));
  audio?.addEventListener('ended', () => synchronizeWithAudio('audio-ended'));
}

export function initFeature11({ audio = document.querySelector('#audio') } = {}) {
  if (window.__shinobiFeature11Ready) return;
  window.__shinobiFeature11Ready = true;
  ensureStylesheet('css/feature-11.css');
  installRouteTransitions();
  renderHomeCatalogSections();
  relabelVideoUI();
  installVideoStability(audio);
}
