import { tracks } from '../core/catalog-store.js';
import {
  harmonizeCatalogOrder,
  latestActiveTrackEntries,
  recentlyAddedTrackEntries
} from '../core/catalog-ordering.js';
import { ensureStylesheet } from '../core/assets.js';

// Lyrics Studio owns its own Canvas lifecycle. Feature 11 stabilizes only the
// standalone Track Video surface so two independent loop owners can never race.
const VIDEO_SELECTOR = 'video.track-video-player';
const VIDEO_PLAYBACK_HANDLER = Symbol('feature11PlaybackHandler');
const VIDEO_RECOVERY_HANDLER = Symbol('feature11RecoveryHandler');
const VIDEO_PROGRESS_STATE = new WeakMap();
const SHAREABLE_ROUTE_PATTERN = /^#(?:track|album|lyrics|studio)=.+/i;
const LEGACY_DISCOGRAPHY_PATH = /\/discography\/?$/i;
const ROUTE_TRANSITION_CLASS = 'route-entering';
const ROUTE_TRANSITION_DURATION = 260;
const AUDIO_CLOCK_INTERVAL = 125;
const VIDEO_WATCHDOG_INTERVAL = 500;
const VIDEO_STALL_THRESHOLD = 1200;
const VIDEO_TERMINAL_STALL_WINDOW = 0.75;
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
  // Keep one explicit loop owner, but never pre-empt the real media boundary.
  // Most importantly: recovery must never force a media-element reload, because on
  // Android protected media a reload storm can contend with the canonical audio seek path.
  video.loop = false;
  video.removeAttribute('loop');
  video.playsInline = true;
  video.preload = 'auto';
  video.setAttribute('muted', '');
  video.setAttribute('playsinline', '');
  video.setAttribute('webkit-playsinline', '');
  video.setAttribute('preload', 'auto');

  let recoveryTimer = 0;
  let lastRecovery = 0;
  VIDEO_PROGRESS_STATE.set(video, { time: Number(video.currentTime) || 0, at: performance.now() });

  const visible = () => {
    const view = video.closest('.view');
    return video.isConnected && !video.closest('[hidden]') && (!view || view.classList.contains('active'));
  };

  const rememberProgress = () => {
    VIDEO_PROGRESS_STATE.set(video, {
      time: Number(video.currentTime) || 0,
      at: performance.now()
    });
  };

  const ensurePlayback = reason => {
    if (!visible() || document.visibilityState === 'hidden') return;
    video.muted = true;
    video.loop = false;
    video.removeAttribute('loop');
    const result = video.play();
    Promise.resolve(result).catch(error => console.info(`Track video recovery (${reason}) awaits a gesture.`, error));
  };

  video[VIDEO_PLAYBACK_HANDLER] = ensurePlayback;

  const recoverLoop = reason => {
    const now = performance.now();
    if (now - lastRecovery < 700) return;
    lastRecovery = now;
    window.clearTimeout(recoveryTimer);
    recoveryTimer = window.setTimeout(() => {
      if (!visible() || document.visibilityState === 'hidden') return;
      if (!Number.isFinite(video.duration) || video.duration <= 0) {
        ensurePlayback(reason);
        return;
      }

      const remaining = Math.max(0, video.duration - (Number(video.currentTime) || 0));
      const terminalRecovery = reason === 'ended' || reason === 'terminal-stall';
      if (terminalRecovery && (video.ended || remaining <= VIDEO_TERMINAL_STALL_WINDOW)) {
        try { video.currentTime = 0; } catch {}
        rememberProgress();
      }
      ensurePlayback(reason);
    }, 20);
  };

  video[VIDEO_RECOVERY_HANDLER] = recoverLoop;

  video.addEventListener('play', () => {
    video.loop = false;
    video.removeAttribute('loop');
  });
  video.addEventListener('playing', rememberProgress);
  video.addEventListener('seeked', rememberProgress);
  video.addEventListener('canplay', rememberProgress);
  video.addEventListener('ended', () => recoverLoop('ended'));

  // waiting/stalled/suspend are informative only. They must never seek, reload or
  // recursively mutate the media resource. The bounded watchdog below may recover
  // only a confirmed terminal stall, after the video has genuinely stopped moving.
  video.addEventListener('timeupdate', () => {
    const now = performance.now();
    const current = Number(video.currentTime) || 0;
    const state = VIDEO_PROGRESS_STATE.get(video);
    if (!state || Math.abs(current - state.time) > 0.025) {
      VIDEO_PROGRESS_STATE.set(video, { time: current, at: now });
    }
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

  window.setInterval(() => {
    if (document.visibilityState === 'hidden' || audio?.paused || audio?.ended) return;
    const now = performance.now();
    connectedVideos().forEach(video => {
      stabilizeVideo(video);
      if (video.paused || video.closest('[hidden]')) return;
      const current = Number(video.currentTime) || 0;
      const state = VIDEO_PROGRESS_STATE.get(video) || { time: current, at: now };
      if (Math.abs(current - state.time) > 0.025) {
        VIDEO_PROGRESS_STATE.set(video, { time: current, at: now });
        return;
      }
      if (now - state.at < VIDEO_STALL_THRESHOLD) return;

      VIDEO_PROGRESS_STATE.set(video, { time: current, at: now });
      const remaining = Number.isFinite(video.duration)
        ? Math.max(0, video.duration - current)
        : Number.POSITIVE_INFINITY;
      if (remaining <= VIDEO_TERMINAL_STALL_WINDOW) {
        video[VIDEO_RECOVERY_HANDLER]?.('terminal-stall');
      }
    });
  }, VIDEO_WATCHDOG_INTERVAL);

  window.addEventListener('pageshow', () => synchronizeWithAudio('pageshow'));
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') synchronizeWithAudio('visibility-resume');
  });
}

function installAudioClockStability(audio) {
  if (!audio || audio.dataset.feature11ClockStable === 'true') return;
  audio.dataset.feature11ClockStable = 'true';

  let frame = 0;
  let lastDispatch = 0;

  const refresh = () => {
    // Keep the existing player/lyrics/media-session listeners as the only render authority.
    // This heartbeat merely prevents Android from starving native `timeupdate` events.
    audio.dispatchEvent(new Event('timeupdate'));
  };

  const tick = now => {
    if (audio.paused || audio.ended) {
      frame = 0;
      return;
    }
    if (now - lastDispatch >= AUDIO_CLOCK_INTERVAL) {
      lastDispatch = now;
      refresh();
    }
    frame = requestAnimationFrame(tick);
  };

  const start = () => {
    refresh();
    if (!frame && !audio.paused && !audio.ended) frame = requestAnimationFrame(tick);
  };

  const stop = () => {
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
    refresh();
  };

  for (const eventName of ['play', 'playing', 'seeked', 'loadedmetadata', 'durationchange']) {
    audio.addEventListener(eventName, start);
  }
  audio.addEventListener('pause', stop);
  audio.addEventListener('ended', stop);

  window.addEventListener('pageshow', start);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') start();
    else if (frame) {
      cancelAnimationFrame(frame);
      frame = 0;
    }
  });

  if (!audio.paused && !audio.ended) start();
  else refresh();
}

export function initFeature11({ audio = document.querySelector('#audio') } = {}) {
  if (window.__shinobiFeature11Ready) return;
  window.__shinobiFeature11Ready = true;
  ensureStylesheet('css/feature-11.css');
  installRouteTransitions();
  renderHomeCatalogSections();
  relabelVideoUI();
  installAudioClockStability(audio);
  installVideoStability(audio);
}
