import { getTrack } from '../core/catalog-store.js';
import { ensureStylesheet } from '../core/assets.js';

const TRACK_HASH_PREFIX = '#track=';

function currentTrack() {
  if (!window.location.hash.startsWith(TRACK_HASH_PREFIX)) return null;
  const id = decodeURIComponent(window.location.hash.slice(TRACK_HASH_PREFIX.length));
  return getTrack(id);
}

function createVideoHeader(track) {
  const header = document.createElement('div');
  header.className = 'track-detail-section-head track-video-head';

  const copy = document.createElement('div');
  const eyebrow = document.createElement('span');
  eyebrow.className = 'eyebrow';
  eyebrow.textContent = 'SPOTIFY CANVAS';

  const heading = document.createElement('h2');
  heading.id = `track-video-heading-${track.id}`;
  heading.textContent = track.title;
  copy.append(eyebrow, heading);

  const meta = document.createElement('div');
  meta.className = 'track-video-meta';

  const format = document.createElement('span');
  format.className = 'pill';
  format.textContent = '9:16 • MUTED LOOP';

  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'chip track-video-loop-control';
  toggle.dataset.trackVideoLoopAction = track.id;
  toggle.setAttribute('aria-pressed', 'true');
  toggle.textContent = 'Pause loop';

  meta.append(format, toggle);
  header.append(copy, meta);
  return header;
}

function createVideoSection(track) {
  const section = document.createElement('section');
  section.className = 'track-detail-section track-video-section';
  section.dataset.trackVideoSection = track.id;
  section.hidden = true;
  section.setAttribute('aria-labelledby', `track-video-heading-${track.id}`);

  const shell = document.createElement('div');
  shell.className = 'track-video-shell';

  const video = document.createElement('video');
  video.className = 'track-video-player';
  video.controls = false;
  video.muted = true;
  video.defaultMuted = true;
  video.loop = true;
  video.playsInline = true;
  video.preload = 'none';
  video.disablePictureInPicture = true;
  video.dataset.src = track.video;
  video.dataset.contentType = track.videoContentType || 'video/mp4';
  video.setAttribute('muted', '');
  video.setAttribute('loop', '');
  video.setAttribute('playsinline', '');
  video.setAttribute('aria-label', `Silent looping Spotify Canvas for ${track.title}`);
  video.setAttribute('controlslist', 'nodownload noplaybackrate noremoteplayback');

  shell.appendChild(video);
  section.append(createVideoHeader(track), shell);
  return section;
}

function syncLoopControl(section, playing) {
  const control = section?.querySelector('[data-track-video-loop-action]');
  if (!control) return;
  control.setAttribute('aria-pressed', String(playing));
  control.textContent = playing ? 'Pause loop' : 'Play loop';
}

function loadAndPlay(video, section) {
  if (!video.src) {
    video.src = video.dataset.src;
    video.load();
  }
  video.muted = true;
  return video.play()
    .then(() => syncLoopControl(section, true))
    .catch(error => {
      syncLoopControl(section, false);
      console.info('Canvas playback awaits another user gesture.', error);
    });
}

function installVideoUI(view, track) {
  if (!view || !track?.video) return;
  if (view.querySelector(`[data-track-video-section="${CSS.escape(track.id)}"]`)) return;

  const actions = view.querySelector('.track-detail-actions');
  const hero = view.querySelector('.track-detail-hero');
  if (!actions || !hero) return;

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'secondary';
  button.dataset.trackVideoAction = track.id;
  button.textContent = 'Open Canvas';
  button.setAttribute('aria-expanded', 'false');

  const lyricsButton = actions.querySelector('[data-track-detail-route="lyrics"]');
  actions.insertBefore(button, lyricsButton || actions.lastElementChild);

  hero.insertAdjacentElement('afterend', createVideoSection(track));
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
    if (track) installVideoUI(view, track);
  }

  function scheduleHydration() {
    window.clearTimeout(hydrationTimer);
    hydrationTimer = window.setTimeout(hydrate, 0);
  }

  document.addEventListener('click', event => {
    const loopControl = event.target.closest?.('[data-track-video-loop-action]');
    if (loopControl) {
      event.preventDefault();
      const section = loopControl.closest('[data-track-video-section]');
      const video = section?.querySelector('video.track-video-player');
      if (!video) return;
      if (video.paused) loadAndPlay(video, section);
      else {
        video.pause();
        syncLoopControl(section, false);
      }
      return;
    }

    const button = event.target.closest?.('[data-track-video-action]');
    if (!button) return;

    event.preventDefault();
    const trackId = button.dataset.trackVideoAction;
    const section = view.querySelector(`[data-track-video-section="${CSS.escape(trackId)}"]`);
    const video = section?.querySelector('video.track-video-player');
    if (!section || !video) return;

    const opening = section.hidden;
    section.hidden = !opening;
    button.setAttribute('aria-expanded', String(opening));
    button.textContent = opening ? 'Hide Canvas' : 'Open Canvas';

    if (!opening) {
      video.pause();
      syncLoopControl(section, false);
      return;
    }

    section.scrollIntoView({ behavior: 'smooth', block: 'center' });
    loadAndPlay(video, section);
  }, true);

  new MutationObserver(scheduleHydration).observe(view, { childList: true, subtree: true });
  window.addEventListener('hashchange', scheduleHydration);
  window.addEventListener('popstate', scheduleHydration);
  scheduleHydration();
}
