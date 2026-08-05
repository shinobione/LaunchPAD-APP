import { tracks } from '../core/catalog-store.js';
import { harmonizeCatalogOrder, latestActiveTrackEntries } from '../core/catalog-ordering.js';
import { ensureStylesheet } from '../core/assets.js';

const VIDEO_SELECTOR = 'video.track-video-player, video.lyrics-studio-canvas-video';

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

export function normalizeLaunchRoute() {
  const hash = window.location.hash;
  const rootLaunch = !hash || hash === '#' || hash === '#/' || hash === '#discography';
  if (!rootLaunch) return;
  window.history.replaceState(window.history.state, '', '#home');
}

export function prepareFeature11Catalog() {
  harmonizeCatalogOrder(tracks);
}

function featuredCard(track, index) {
  return `
    <article class="album-card" data-index="${index}" data-genre="${escapeHtml(track.genre)}">
      <div class="cover-wrap">
        <img src="${escapeHtml(track.cover)}" alt="Cover art for ${escapeHtml(track.title)}" loading="lazy">
        ${track.lyrics ? '<span class="lyrics-card-badge">LYRICS</span>' : ''}
        <button class="play-overlay" data-play-index="${index}" aria-label="Listen to ${escapeHtml(track.title)}">▶</button>
      </div>
      <h3>${escapeHtml(track.title)}</h3>
      <p>${escapeHtml(track.genre)} • ${escapeHtml(track.mood)}</p>
    </article>`;
}

function renderLatestReleases() {
  const grid = document.querySelector('#featured-grid');
  if (!grid) return;
  grid.innerHTML = latestActiveTrackEntries(tracks, 5)
    .map(({ track, index }) => featuredCard(track, index))
    .join('');
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

function stabilizeVideo(video, audio) {
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
    if (!visible() || audio?.paused || document.visibilityState === 'hidden') return;
    video.muted = true;
    if (video.readyState < HTMLMediaElement.HAVE_FUTURE_DATA && video.networkState !== HTMLMediaElement.NETWORK_LOADING) {
      try { video.load(); } catch {}
    }
    const result = video.play();
    Promise.resolve(result).catch(error => console.info(`Track video recovery (${reason}) awaits a gesture.`, error));
  };

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

  audio?.addEventListener('play', () => ensurePlayback('audio-play'));
  audio?.addEventListener('playing', () => ensurePlayback('audio-playing'));
  audio?.addEventListener('pause', () => video.pause());
  audio?.addEventListener('ended', () => video.pause());

  if (audio && !audio.paused) ensurePlayback('registered');
}

function installVideoStability(audio) {
  const hydrate = root => {
    if (root instanceof HTMLVideoElement && root.matches(VIDEO_SELECTOR)) stabilizeVideo(root, audio);
    root.querySelectorAll?.(VIDEO_SELECTOR).forEach(video => stabilizeVideo(video, audio));
    relabelVideoUI(root);
  };

  hydrate(document);
  new MutationObserver(records => {
    records.forEach(record => record.addedNodes.forEach(node => {
      if (node instanceof Element) hydrate(node);
    }));
  }).observe(document.body, { childList: true, subtree: true });

  document.addEventListener('click', () => queueMicrotask(() => relabelVideoUI(document)), true);
  window.addEventListener('shinobi:route-change', () => queueMicrotask(() => {
    hydrate(document);
    renderLatestReleases();
  }));
}

export function initFeature11({ audio = document.querySelector('#audio') } = {}) {
  if (window.__shinobiFeature11Ready) return;
  window.__shinobiFeature11Ready = true;
  ensureStylesheet('css/feature-11.css');
  renderLatestReleases();
  relabelVideoUI();
  installVideoStability(audio);
}
