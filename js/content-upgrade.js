import { albums, tracks } from './catalog.js';

const ARTIST_COPY = `
  <span>✨🎵 Sound architect with no borders.</span>
  <span>HipHop atmospheres, heavy 808s, trap foundations... and everything in between.</span>
  <span>Bass, emotion &amp; precision — no genre left untouched. The only constant? Impact.</span>
  <span class="artist-dedication">~ I love you, my Trân ❤️🎶</span>
`;

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function getAlbumTracks(album) {
  return tracks.filter(track => track.albumId === album.id || track.album === album.title);
}

function getTrackTags(track) {
  const tags = Array.isArray(track.tags) ? [...track.tags] : [track.genre];
  if (track.lyrics) tags.push('With Lyrics');
  return [...new Set(tags.filter(Boolean))];
}

function renderAlbum(album) {
  const albumTracks = getAlbumTracks(album);
  const firstIndex = tracks.findIndex(track => track.id === albumTracks[0]?.id);
  const tags = [...new Set(albumTracks.flatMap(getTrackTags))];
  const cover = album.cover || albumTracks[0]?.cover || 'assets/logo.png';

  return `
    <article class="album-release-card" data-album-id="${escapeHtml(album.id)}">
      <div class="album-release-cover">
        <img src="${escapeHtml(cover)}" alt="${escapeHtml(album.title)} cover" loading="lazy">
        <span>${escapeHtml(album.type || 'album')}</span>
      </div>
      <div class="album-release-copy">
        <div class="album-release-heading">
          <div>
            <span class="eyebrow">${escapeHtml(album.year || 'SHINOBIWAN')}</span>
            <h2>${escapeHtml(album.title)}</h2>
          </div>
          ${firstIndex >= 0 ? `<button class="primary album-play" data-album-play-index="${firstIndex}">▶ Play album</button>` : ''}
        </div>
        <p>${escapeHtml(album.description || '')}</p>
        <div class="album-tag-row">${tags.map(tag => `<span>${escapeHtml(tag)}</span>`).join('')}</div>
        <ol class="album-track-list">
          ${albumTracks.map(track => {
            const index = tracks.findIndex(item => item.id === track.id);
            return `<li><button data-album-track-index="${index}"><span>${String(index + 1).padStart(2, '0')}</span><strong>${escapeHtml(track.title)}</strong><small>${escapeHtml(track.genre)} · ${escapeHtml(track.mood)}</small><b>▶</b></button></li>`;
          }).join('')}
        </ol>
      </div>
    </article>
  `;
}

function updateArtistCopy() {
  const homeCopy = document.querySelector('.launchpad-hero .hero-copy p');
  if (homeCopy) {
    homeCopy.className = 'artist-manifesto';
    homeCopy.innerHTML = ARTIST_COPY;
  }

  const aboutText = document.querySelector('#view-about .about-card div');
  if (aboutText) {
    const heading = aboutText.querySelector('h2');
    const paragraph = aboutText.querySelector('p');
    if (heading) heading.textContent = 'Sound architect with no borders.';
    if (paragraph) {
      paragraph.className = 'artist-manifesto about-manifesto';
      paragraph.innerHTML = ARTIST_COPY;
    }
  }
}

function installAlbumsView() {
  const navButton = document.querySelector('.main-nav [data-view="analytics"]');
  if (navButton) {
    navButton.innerHTML = '<span aria-hidden="true">▤</span><span>Albums</span>';
    navButton.setAttribute('aria-label', 'Albums');
  }

  const view = document.querySelector('#view-analytics');
  if (!view) return;

  view.innerHTML = `
    <div class="page-intro albums-intro">
      <div>
        <span class="eyebrow">FULL PROJECTS</span>
        <h1>Albums</h1>
        <p>Each project has its own world, artwork, tracklist and sonic identity. New albums and singles will appear here automatically from the catalog manifest.</p>
      </div>
      <span class="album-count">${albums.length} PROJECTS · ${tracks.length} TRACKS</span>
    </div>
    <div class="albums-release-grid">${albums.map(renderAlbum).join('')}</div>
  `;

  view.addEventListener('click', event => {
    const playAlbum = event.target.closest('[data-album-play-index]');
    const playTrack = event.target.closest('[data-album-track-index]');
    const rawIndex = playAlbum?.dataset.albumPlayIndex ?? playTrack?.dataset.albumTrackIndex;
    if (rawIndex === undefined) return;
    const index = Number(rawIndex);
    if (!Number.isInteger(index)) return;
    document.querySelector(`[data-play-index="${index}"]`)?.click();
  });
}

function removeSearchUI() {
  const search = document.querySelector('.search');
  if (search) {
    search.setAttribute('aria-hidden', 'true');
    search.tabIndex = -1;
  }
}

export function initContentUpgrade() {
  updateArtistCopy();
  installAlbumsView();
  removeSearchUI();
}
