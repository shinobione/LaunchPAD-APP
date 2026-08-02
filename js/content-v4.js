import { tracks } from './catalog.js';

const escapeHtml = value => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#039;');

function ensureStylesheet(href) {
  if (document.querySelector(`link[href="${href}"]`)) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = href;
  document.head.appendChild(link);
}

function installFavicon() {
  document.querySelectorAll('link[rel~="icon"]').forEach(link => link.remove());

  const icon = document.createElement('link');
  icon.rel = 'icon';
  icon.type = 'image/svg+xml';
  icon.href = 'assets/favicon-v6.svg?v=20260801-6';
  document.head.appendChild(icon);

  const shortcut = document.createElement('link');
  shortcut.rel = 'shortcut icon';
  shortcut.type = 'image/svg+xml';
  shortcut.href = 'assets/favicon-v6.svg?v=20260801-6';
  document.head.appendChild(shortcut);
}

function installManifesto() {
  const heroCopy = document.querySelector('.launchpad-hero .hero-copy');
  if (heroCopy && !heroCopy.querySelector('.artist-manifesto')) {
    const tagline = heroCopy.querySelector('.hero-tagline');
    const paragraph = heroCopy.querySelector('p');
    if (tagline) tagline.remove();
    if (paragraph) {
      paragraph.className = 'artist-manifesto';
      paragraph.innerHTML = `
        <span class="manifesto-lead">✨🎵 Sound architect with no borders.</span>
        HipHop atmospheres, heavy 808s, trap foundations... and everything in between.
        <span class="manifesto-impact">Bass, emotion &amp; precision — no genre left untouched. The only constant? Impact.</span>
        <span class="manifesto-dedication">~ I love you, my Trân ❤️🎶</span>
      `;
    }
  }

  const aboutCopy = document.querySelector('#view-about .about-card > div');
  if (aboutCopy) {
    const heading = aboutCopy.querySelector('h2');
    const paragraph = aboutCopy.querySelector('p');
    if (heading) heading.textContent = 'ARTIST • BEATMAKER • PRODUCER';
    if (paragraph) {
      paragraph.className = 'about-manifesto';
      paragraph.innerHTML = `
        <strong>✨🎵 Sound architect with no borders.</strong>
        <span>HipHop atmospheres, heavy 808s, trap foundations... and everything in between.</span>
        <span>Bass, emotion &amp; precision — no genre left untouched. The only constant? Impact.</span>
        <span class="dedication">~ I love you, my Trân ❤️🎶</span>
      `;
    }
  }
}

function installGoldenAboutLogo() {
  const aboutCard = document.querySelector('#view-about .about-card');
  if (!aboutCard || aboutCard.querySelector('.about-golden-logo-wrap')) return;

  const logoWrap = document.createElement('div');
  logoWrap.className = 'about-golden-logo-wrap';
  logoWrap.innerHTML = `
    <img
      class="about-golden-logo"
      src="assets/ShinoBiWan-Golden-LOGO-clean.svg?v=20260802-1"
      alt="SHINOBIWAN golden logo"
      loading="lazy"
      decoding="async"
    >
  `;
  aboutCard.appendChild(logoWrap);
}

function groupTracksByAlbum() {
  const albums = new Map();

  tracks.forEach((track, index) => {
    const albumName = track.album || 'Singles';
    if (!albums.has(albumName)) {
      albums.set(albumName, {
        title: albumName,
        cover: track.cover,
        tracks: [],
        tags: new Set()
      });
    }

    const album = albums.get(albumName);
    album.tracks.push({ ...track, index });
    if (track.genre) album.tags.add(track.genre);
    if (track.lyrics) album.tags.add('With Lyrics');
  });

  return [...albums.values()];
}

function renderAlbums() {
  const navButton = document.querySelector('.main-nav [data-view="analytics"]');
  if (navButton) {
    navButton.innerHTML = '<span aria-hidden="true">▣</span><span>Albums</span>';
    navButton.setAttribute('aria-label', 'Albums and projects');
  }

  const view = document.querySelector('#view-analytics');
  if (!view) return;

  const previousGenreBars = view.querySelector('#genre-bars')?.innerHTML || '';
  const albums = groupTracksByAlbum();
  const lyricCount = tracks.filter(track => track.lyrics).length;

  view.innerHTML = `
    <div class="page-intro albums-intro">
      <div>
        <span class="eyebrow">PROJECT LIBRARY</span>
        <h1>Albums</h1>
        <p>Every project, single and future release is organized directly from the catalog.</p>
      </div>
      <div class="albums-summary" aria-label="Catalog summary">
        <span>${albums.length} projects</span>
        <span>${tracks.length} tracks</span>
        <span>${lyricCount} lyric files</span>
      </div>
    </div>

    <div class="album-collection">
      ${albums.map((album, albumIndex) => `
        <article class="project-album">
          <div class="project-album-head">
            <img class="project-album-cover" src="${escapeHtml(album.cover)}" alt="${escapeHtml(album.title)} cover" loading="lazy">
            <div class="project-album-copy">
              <small>PROJECT ${String(albumIndex + 1).padStart(2, '0')}</small>
              <h2>${escapeHtml(album.title)}</h2>
              <div class="project-tags">
                ${[...album.tags].map(tag => `<span>${escapeHtml(tag)}</span>`).join('')}
              </div>
            </div>
          </div>
          <div class="project-track-list">
            ${album.tracks.map((track, trackIndex) => `
              <button class="project-track" type="button" data-album-play-index="${track.index}" aria-label="Play ${escapeHtml(track.title)}">
                <span class="track-number">${String(trackIndex + 1).padStart(2, '0')}</span>
                <span class="track-name">${escapeHtml(track.title)}</span>
                <span class="track-play">▶</span>
              </button>
            `).join('')}
          </div>
        </article>
      `).join('')}
    </div>

    <article class="panel albums-dna">
      <div class="panel-head">
        <h3>Catalog DNA</h3>
        <span class="pill">AUTO-GENERATED</span>
      </div>
      <div id="genre-bars" class="genre-bars">${previousGenreBars}</div>
    </article>

    <span id="metric-tracks" hidden>${tracks.length}</span>
    <span id="metric-lyrics" hidden>${lyricCount}</span>
  `;

  view.querySelectorAll('[data-album-play-index]').forEach(button => {
    button.addEventListener('click', () => {
      const index = button.dataset.albumPlayIndex;
      const sourceButton = document.querySelector(`#library-grid [data-play-index="${index}"]`)
        || document.querySelector(`#featured-grid [data-play-index="${index}"]`);
      sourceButton?.click();
    });
  });
}

function removeVisibleSearch() {
  const search = document.querySelector('.search');
  if (search) {
    search.setAttribute('aria-hidden', 'true');
    search.tabIndex = -1;
  }
}

export function installContentV4() {
  ensureStylesheet('css/content-v4.css');
  installFavicon();
  removeVisibleSearch();
  installManifesto();
  installGoldenAboutLogo();
  renderAlbums();
}
