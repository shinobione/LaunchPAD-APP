import { getTrack } from '../core/catalog-store.js';
import { ensureStylesheet } from '../core/assets.js';

const TRACK_HASH_PREFIX = '#track=';
const MOBILE_VIDEO_QUERY = '(max-width: 760px)';

function currentTrack() {
  if (!window.location.hash.startsWith(TRACK_HASH_PREFIX)) return null;
  const id = decodeURIComponent(window.location.hash.slice(TRACK_HASH_PREFIX.length));
  return getTrack(id);
}

function mobileVideoLayout() {
  return window.matchMedia(MOBILE_VIDEO_QUERY).matches;
}

function createVideoPanel(track) {
  const panel = document.createElement('aside');
  panel.className = 'track-detail-canvas-panel';
  panel.dataset.trackVideoPanel = track.id;
  panel.hidden = true;
  panel.setAttribute('aria-label', `Looping track video for ${track.title}`);

  const toolbar = document.createElement('div');
  toolbar.className = 'track-detail-canvas-toolbar';

  const badge = document.createElement('span');
  badge.className = 'track-detail-canvas-badge';
  badge.textContent = 'VIDEO';

  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'chip track-video-loop-control';
  toggle.dataset.trackVideoLoopAction = track.id;
  toggle.setAttribute('aria-pressed', 'true');
  toggle.textContent = 'Pause';

  const shell = document.createElement('div');
  shell.className = 'track-detail-canvas-shell';

  const video = document.createElement('video');
  video.className = 'track-video-player';
  video.controls = false;
  video.muted = true;
  video.defaultMuted = true;
  video.loop = true;
  video.playsInline = true;
  video.preload = 'auto';
  video.disablePictureInPicture = true;
  video.dataset.src = track.video;
  video.dataset.contentType = track.videoContentType || 'video/mp4';
  video.setAttribute('muted', '');
  video.setAttribute('loop', '');
  video.setAttribute('playsinline', '');
  video.setAttribute('webkit-playsinline', '');
  video.setAttribute('preload', 'auto');
  video.setAttribute('aria-label', `Silent looping track video for ${track.title}`);
  video.setAttribute('controlslist', 'nodownload noplaybackrate noremoteplayback');

  toolbar.append(badge, toggle);
  shell.appendChild(video);
  panel.append(toolbar, shell);
  return panel;
}

function syncLoopControl(panel, playing) {
  const control = panel?.querySelector('[data-track-video-loop-action]');
  if (!control) return;
  const label = playing ? 'Pause' : 'Play';
  control.setAttribute('aria-pressed', String(playing));
  control.classList.toggle('active', playing);
  if (control.textContent !== label) control.textContent = label;
}

function loadAndPlay(video, panel) {
  if (!video.src) {
    video.src = video.dataset.src;
    video.load();
  }
  video.muted = true;
  return video.play()
    .then(() => syncLoopControl(panel, true))
    .catch(error => {
      syncLoopControl(panel, false);
      console.info('Video playback awaits another user gesture.', error);
    });
}

function releaseVideoDecoder(video, panel) {
  if (!video) return;
  try { video.pause(); } catch {}
  video.removeAttribute('src');
  try { video.load(); } catch {}
  syncLoopControl(panel, false);
}

function teardownTrackVideoRoute(view) {
  if (!view || currentTrack()) return;
  view.querySelectorAll('[data-track-video-panel]').forEach(panel => {
    const trackId = panel.dataset.trackVideoPanel || '';
    const { button, hero, video } = videoElements(view, trackId);
    releaseVideoDecoder(video, panel);
    panel.hidden = true;
    hero?.classList.remove('has-track-canvas');
    if (button) {
      button.setAttribute('aria-expanded', 'false');
      button.textContent = 'Video';
      delete button.dataset.mobileReady;
    }
  });
}

function installStudioEntry(view, track) {
  if (!view || !track?.lyrics) return;
  const actions = view.querySelector('.track-detail-actions');
  if (!actions || actions.querySelector('[data-track-studio-action]')) return;

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'secondary track-detail-studio-entry';
  button.dataset.trackStudioAction = track.id;
  button.textContent = 'Studio';
  button.setAttribute('aria-label', `Open Lyrics Studio for ${track.title}`);

  const shareButton = actions.querySelector('[data-track-detail-action="share"]');
  if (shareButton) shareButton.after(button);
  else actions.appendChild(button);
}

function videoElements(view, trackId) {
  const panel = view.querySelector(`[data-track-video-panel="${CSS.escape(trackId)}"]`);
  const button = view.querySelector(`[data-track-video-action="${CSS.escape(trackId)}"]`);
  const hero = panel?.closest('.track-detail-hero');
  const video = panel?.querySelector('video.track-video-player');
  return { panel, button, hero, video };
}

function syncResponsiveVideo(view, trackId, { resetMobile = false } = {}) {
  const { panel, button, hero, video } = videoElements(view, trackId);
  if (!panel || !button || !hero || !video) return;

  if (!mobileVideoLayout()) {
    button.hidden = true;
    button.setAttribute('aria-expanded', 'true');
    button.textContent = 'Player';
    panel.hidden = false;
    hero.classList.add('has-track-canvas');
    if (video.paused) loadAndPlay(video, panel);
    else syncLoopControl(panel, true);
    return;
  }

  button.hidden = false;
  if (!resetMobile && button.dataset.mobileReady === 'true') return;
  button.dataset.mobileReady = 'true';
  button.setAttribute('aria-expanded', 'false');
  button.textContent = 'Video';
  panel.hidden = true;
  hero.classList.remove('has-track-canvas');
  video.pause();
  syncLoopControl(panel, false);
}

function installVideoUI(view, track) {
  if (!view || !track?.video) return;
  if (view.querySelector(`[data-track-video-panel="${CSS.escape(track.id)}"]`)) {
    syncResponsiveVideo(view, track.id);
    return;
  }

  const actions = view.querySelector('.track-detail-actions');
  const hero = view.querySelector('.track-detail-hero');
  if (!actions || !hero) return;

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'secondary track-detail-canvas-toggle';
  button.dataset.trackVideoAction = track.id;
  button.textContent = 'Video';
  button.setAttribute('aria-expanded', 'false');
  button.setAttribute('aria-label', `Show track video for ${track.title}`);

  const lyricsButton = actions.querySelector('[data-track-detail-route="lyrics"]');
  actions.insertBefore(button, lyricsButton || actions.firstElementChild?.nextSibling || null);
  hero.appendChild(createVideoPanel(track));
  syncResponsiveVideo(view, track.id, { resetMobile: true });
}

function installTrackEnhancements(view, track) {
  installStudioEntry(view, track);
  installVideoUI(view, track);
}

function openStudioRoute(trackId) {
  window.location.hash = `#studio=${encodeURIComponent(trackId)}`;
}

export function initTrackVideos() {
  if (window.__shinobiTrackVideosReady) return;
  window.__shinobiTrackVideosReady = true;
  ensureStylesheet('css/track-videos.css');

  const view = document.querySelector('#view-track');
  if (!view) return;
  let hydrationTimer = null;

  function hydrate() {
    const track = currentTrack();
    if (track) installTrackEnhancements(view, track);
    else teardownTrackVideoRoute(view);
  }

  function scheduleHydration() {
    window.clearTimeout(hydrationTimer);
    hydrationTimer = window.setTimeout(hydrate, 0);
  }

  function syncRouteVideoState() {
    if (!currentTrack()) teardownTrackVideoRoute(view);
    scheduleHydration();
  }

  document.addEventListener('click', event => {
    const studioButton = event.target.closest?.('[data-track-studio-action]');
    if (studioButton) {
      event.preventDefault();
      const { panel, video } = videoElements(view, studioButton.dataset.trackStudioAction);
      releaseVideoDecoder(video, panel);
      openStudioRoute(studioButton.dataset.trackStudioAction);
      return;
    }

    const loopControl = event.target.closest?.('[data-track-video-loop-action]');
    if (loopControl) {
      event.preventDefault();
      const panel = loopControl.closest('[data-track-video-panel]');
      const video = panel?.querySelector('video.track-video-player');
      if (!video) return;
      if (video.paused) loadAndPlay(video, panel);
      else {
        video.pause();
        syncLoopControl(panel, false);
      }
      return;
    }

    const button = event.target.closest?.('[data-track-video-action]');
    if (!button || button.hidden || !mobileVideoLayout()) return;

    event.preventDefault();
    const trackId = button.dataset.trackVideoAction;
    const { panel, hero, video } = videoElements(view, trackId);
    if (!panel || !hero || !video) return;

    const opening = panel.hidden;
    panel.hidden = !opening;
    hero.classList.toggle('has-track-canvas', opening);
    button.setAttribute('aria-expanded', String(opening));
    button.textContent = opening ? 'Player' : 'Video';

    if (!opening) {
      video.pause();
      syncLoopControl(panel, false);
      return;
    }

    loadAndPlay(video, panel);
    window.setTimeout(() => panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 0);
  }, true);

  new MutationObserver(scheduleHydration).observe(view, { childList: true, subtree: true });
  window.addEventListener('hashchange', syncRouteVideoState);
  window.addEventListener('popstate', syncRouteVideoState);
  window.addEventListener('shinobi:route-change', syncRouteVideoState);

  const mediaQuery = window.matchMedia(MOBILE_VIDEO_QUERY);
  mediaQuery.addEventListener?.('change', () => {
    const track = currentTrack();
    if (track) syncResponsiveVideo(view, track.id, { resetMobile: true });
    else teardownTrackVideoRoute(view);
  });

  scheduleHydration();
}
