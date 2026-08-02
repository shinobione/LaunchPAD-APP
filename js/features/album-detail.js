import { getAlbum, getAlbumTracks } from '../core/catalog-store.js';
import { shareRoute } from '../core/share.js';

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
              <small>${escapeHtml(track.genre)} • ${escapeHtml(track.mood)}</small>
            </span>
            ${track.lyrics ? '<span class="album-detail-lyrics">LYRICS</span>' : ''}
            <span class="album-detail-play">▶</span>
          </button>
        `).join('')}
      </div>
    `;

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
