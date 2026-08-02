import { getAlbum, getAlbumTracks } from '../core/catalog-store.js';
import { shareRoute } from '../core/share.js';

const durationCache = new Map();
let durationHydrationId = 0;

function formatDuration(value) {
  if (!Number.isFinite(value) || value < 0) return '--:--';

  const totalSeconds = Math.round(value);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor(totalSeconds % 3600 / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }

  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

function readDuration(track) {
  if (Number.isFinite(track.duration) && track.duration > 0) {
    return Promise.resolve(track.duration);
  }

  if (durationCache.has(track.id)) return durationCache.get(track.id);

  const request = new Promise(resolve => {
    const probe = document.createElement('audio');
    probe.preload = 'metadata';
    let settled = false;

    const finish = value => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeout);
      probe.removeAttribute('src');
      probe.load();
      resolve(Number.isFinite(value) && value > 0 ? value : null);
    };

    const timeout = window.setTimeout(() => finish(null), 15000);
    probe.addEventListener('loadedmetadata', () => finish(probe.duration), { once: true });
    probe.addEventListener('error', () => finish(null), { once: true });
    probe.src = track.file;
    probe.load();
  });

  durationCache.set(track.id, request);
  return request;
}

function ensureView() {
  let view = document.querySelector('#view-album');
  if (view) return view;

  view = document.createElement('section');
  view.id = 'view-album';
  view.className = 'view album-detail-view';
  const main = document.querySelector('.main-content');
  const about = document.querySelector('#view-about');
  main?.insertBefore(view, about || null);
  return view;
}

export function createAlbumDetail({ escapeHtml, onPlayAlbum, onPlayTrack, onBack }) {
  const view = ensureView();
  let currentAlbumId = null;

  async function hydrateDurations(albumId, albumTracks) {
    const hydrationId = ++durationHydrationId;

    const durations = await Promise.all(albumTracks.map(async track => {
      const duration = await readDuration(track);
      if (hydrationId !== durationHydrationId || currentAlbumId !== albumId) return duration;

      const target = view.querySelector(`[data-album-track-duration="${track.id}"]`);
      if (target) {
        target.textContent = formatDuration(duration);
        target.classList.toggle('unavailable', !Number.isFinite(duration));
        target.setAttribute(
          'aria-label',
          Number.isFinite(duration) ? `Duration ${formatDuration(duration)}` : 'Duration unavailable'
        );
      }
      return duration;
    }));

    if (hydrationId !== durationHydrationId || currentAlbumId !== albumId) return;

    const totalTarget = view.querySelector('[data-album-total-duration]');
    if (!totalTarget) return;

    const available = durations.filter(Number.isFinite);
    if (available.length === albumTracks.length) {
      totalTarget.textContent = `${formatDuration(available.reduce((sum, value) => sum + value, 0))} total`;
      totalTarget.classList.remove('unavailable');
    } else {
      totalTarget.textContent = 'Duration unavailable';
      totalTarget.classList.add('unavailable');
    }
  }

  function render(albumId) {
    const album = getAlbum(albumId);
    if (!album) return false;

    const albumTracks = getAlbumTracks(albumId);
    const tags = [...new Set(albumTracks.flatMap(track => track.tags || [track.genre]))];
    const lyricCount = albumTracks.filter(track => track.lyrics).length;
    currentAlbumId = albumId;

    view.innerHTML = `
      <button type="button" class="album-detail-back text-button" data-album-detail-action="back">← All albums</button>
      <article class="album-detail-hero">
        <img class="album-detail-cover" src="${escapeHtml(album.cover)}" alt="${escapeHtml(album.title)} cover">
        <div class="album-detail-copy">
          <span class="eyebrow">${escapeHtml(album.type === 'singles' ? 'COLLECTION' : 'ALBUM')} • ${escapeHtml(album.year || '')}</span>
          <h1>${escapeHtml(album.title)}</h1>
          <p>${escapeHtml(album.description || '')}</p>
          <div class="album-detail-meta">
            <span>${albumTracks.length} tracks</span>
            <span data-album-total-duration aria-live="polite">Loading duration…</span>
            <span>${lyricCount} lyric files</span>
            ${tags.map(tag => `<span>${escapeHtml(tag)}</span>`).join('')}
          </div>
          <div class="album-detail-actions">
            <button type="button" class="primary" data-album-detail-action="play">▶ Play album</button>
            <button type="button" class="secondary" data-album-detail-action="share">Share album ↗</button>
          </div>
        </div>
      </article>
      <div class="album-detail-tracks">
        ${albumTracks.map((track, index) => `
          <button type="button" class="album-detail-track" data-album-detail-track="${track.index}">
            <span class="album-detail-track-number">${String(index + 1).padStart(2, '0')}</span>
            <img src="${escapeHtml(track.cover)}" alt="" loading="lazy">
            <span class="album-detail-track-copy">
              <strong>${escapeHtml(track.title)}</strong>
              <small>
                ${escapeHtml(track.genre)} • ${escapeHtml(track.mood)}
                <span aria-hidden="true"> • </span>
                <span class="album-detail-duration" data-album-track-duration="${escapeHtml(track.id)}" aria-label="Duration loading">--:--</span>
              </small>
            </span>
            ${track.lyrics ? '<span class="album-detail-lyrics">LYRICS</span>' : '<span aria-hidden="true"></span>'}
            <span class="album-detail-play">▶</span>
          </button>
        `).join('')}
      </div>
    `;

    hydrateDurations(albumId, albumTracks);
    return true;
  }

  view.addEventListener('click', event => {
    const trackButton = event.target.closest('[data-album-detail-track]');
    if (trackButton) {
      onPlayTrack(Number(trackButton.dataset.albumDetailTrack), currentAlbumId);
      return;
    }

    const actionButton = event.target.closest('[data-album-detail-action]');
    if (!actionButton) return;
    const action = actionButton.dataset.albumDetailAction;

    if (action === 'back') onBack();
    if (action === 'play') onPlayAlbum(currentAlbumId);
    if (action === 'share') {
      const album = getAlbum(currentAlbumId);
      shareRoute({
        title: `${album.title} — SHINOBIWAN`,
        text: `Listen to ${album.title} on the SHINOBIWAN Launchpad.`,
        route: { type: 'album', id: currentAlbumId }
      });
    }
  });

  return { render, getCurrentAlbumId: () => currentAlbumId };
}
