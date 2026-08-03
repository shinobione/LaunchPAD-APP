import { getTrack } from '../core/catalog-store.js';
import { ensureStylesheet } from '../core/assets.js';

const TRACK_HASH_PREFIX = '#track=';
const videoAssets = new Map();

function currentTrack() {
  if (!window.location.hash.startsWith(TRACK_HASH_PREFIX)) return null;
  const id = decodeURIComponent(window.location.hash.slice(TRACK_HASH_PREFIX.length));
  return getTrack(id);
}

async function fetchVideoAsset(track) {
  if (!track?.remoteMetadata?.apiUrl) return null;
  if (videoAssets.has(track.id)) return videoAssets.get(track.id);

  const promise = fetch(track.remoteMetadata.apiUrl, {
    method: 'GET',
    headers: { Accept: 'application/json' },
    cache: 'no-store'
  })
    .then(async response => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const payload = await response.json();
      const asset = payload?.track?.assets?.video;
      return asset?.url
        ? {
            url: asset.url,
            contentType: asset.contentType || 'video/mp4',
            filename: asset.filename || asset.originalName || 'video'
          }
        : null;
    })
    .catch(error => {
      console.warn(`Unable to load video metadata for ${track.title}.`, error);
      return null;
    });

  videoAssets.set(track.id, promise);
  return promise;
}

function createVideoHeader(track, asset) {
  const header = document.createElement('div');
  header.className = 'track-detail-section-head';

  const copy = document.createElement('div');
  const eyebrow = document.createElement('span');
  eyebrow.className = 'eyebrow';
  eyebrow.textContent = 'OFFICIAL VISUAL';

  const heading = document.createElement('h2');
  heading.id = `track-video-heading-${track.id}`;
  heading.textContent = track.title;
  copy.append(eyebrow, heading);

  const filename = document.createElement('span');
  filename.className = 'pill';
  filename.textContent = asset.filename;
  header.append(copy, filename);
  return header;
}

function createVideoSection(track, asset, audio) {
  const section = document.createElement('section');
  section.className = 'track-detail-section track-video-section';
  section.dataset.trackVideoSection = track.id;
  section.hidden = true;
  section.setAttribute('aria-labelledby', `track-video-heading-${track.id}`);

  const shell = document.createElement('div');
  shell.className = 'track-video-shell';

  const video = document.createElement('video');
  video.className = 'track-video-player';
  video.controls = true;
  video.playsInline = true;
  video.preload = 'none';
  video.poster = track.fullCover || track.cover || '';
  video.dataset.src = asset.url;
  video.dataset.contentType = asset.contentType;
  video.setAttribute('aria-label', `Video for ${track.title}`);
  video.addEventListener('play', () => audio?.pause());

  shell.appendChild(video);
  section.append(createVideoHeader(track, asset), shell);
  return section;
}

function installVideoUI(view, track, asset, audio) {
  if (!view || !track || !asset) return;
  if (view.querySelector(`[data-track-video-section="${CSS.escape(track.id)}"]`)) return;

  const actions = view.querySelector('.track-detail-actions');
  const hero = view.querySelector('.track-detail-hero');
  if (!actions || !hero) return;

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'secondary';
  button.dataset.trackVideoAction = track.id;
  button.textContent = 'Watch video';
  button.setAttribute('aria-expanded', 'false');

  const lyricsButton = actions.querySelector('[data-track-detail-route="lyrics"]');
  actions.insertBefore(button, lyricsButton || actions.lastElementChild);

  const section = createVideoSection(track, asset, audio);
  hero.insertAdjacentElement('afterend', section);
}

export function initTrackVideos({ audio = document.querySelector('#audio') } = {}) {
  if (window.__shinobiTrackVideosReady) return;
  window.__shinobiTrackVideosReady = true;
  ensureStylesheet('css/track-videos.css');

  const view = document.querySelector('#view-track');
  if (!view) return;

  let hydrationTimer = null;
  let hydrationToken = 0;

  async function hydrate() {
    const token = ++hydrationToken;
    const track = currentTrack();
    if (!track) return;
    if (view.querySelector(`[data-track-video-section="${CSS.escape(track.id)}"]`)) return;

    const asset = await fetchVideoAsset(track);
    if (token !== hydrationToken || currentTrack()?.id !== track.id) return;
    installVideoUI(view, track, asset, audio);
  }

  function scheduleHydration() {
    window.clearTimeout(hydrationTimer);
    hydrationTimer = window.setTimeout(hydrate, 0);
  }

  document.addEventListener('click', event => {
    const button = event.target.closest?.('[data-track-video-action]');
    if (!button) return;

    event.preventDefault();
    const trackId = button.dataset.trackVideoAction;
    const section = view.querySelector(`[data-track-video-section="${CSS.escape(trackId)}"]`);
    const video = section?.querySelector('video');
    if (!section || !video) return;

    const opening = section.hidden;
    section.hidden = !opening;
    button.setAttribute('aria-expanded', String(opening));
    button.textContent = opening ? 'Hide video' : 'Watch video';

    if (!opening) {
      video.pause();
      return;
    }

    audio?.pause();
    if (!video.src) {
      video.src = video.dataset.src;
      video.load();
    }
    section.scrollIntoView({ behavior: 'smooth', block: 'center' });
    video.play().catch(error => {
      console.info('Video playback awaits a second user gesture.', error);
    });
  }, true);

  audio?.addEventListener('play', () => {
    view.querySelectorAll('video.track-video-player').forEach(video => video.pause());
  });

  new MutationObserver(scheduleHydration).observe(view, { childList: true, subtree: true });
  window.addEventListener('hashchange', scheduleHydration);
  window.addEventListener('popstate', scheduleHydration);
  scheduleHydration();
}
