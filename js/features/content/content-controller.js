import { ensureStylesheet } from '../../core/assets.js';
import {
  albums,
  tracks,
  getAlbumTracks,
  getGenreCounts,
  journeyEras
} from '../../core/catalog-store.js';

const escapeHtml = value => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#039;');


function installManifesto() {
  const heroCopy = document.querySelector('.launchpad-hero .hero-copy');
  if (heroCopy && !heroCopy.querySelector('.artist-manifesto')) {
    const tagline = heroCopy.querySelector('.hero-tagline');
    const paragraph = heroCopy.querySelector('p');
    tagline?.remove();

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
  if (!aboutCopy) return;

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

function syncCatalogSummary() {
  const count = tracks.length;
  const label = `${count} TRACK${count === 1 ? '' : 'S'}`;

  document.querySelectorAll('.catalog-badge strong').forEach(element => {
    element.textContent = label;
  });

  document.querySelectorAll('#metric-tracks').forEach(element => {
    element.textContent = String(count);
  });

  document.querySelectorAll('#metric-lyrics').forEach(element => {
    element.textContent = String(tracks.filter(track => track.lyrics).length);
  });
}

function orderedAlbums() {
  const byId = new Map(albums.map(album => [album.id, album]));
  const configured = journeyEras
    .map(era => ({ era, album: byId.get(era.albumId) }))
    .filter(entry => entry.album);
  const configuredIds = new Set(configured.map(entry => entry.album.id));
  const remaining = albums
    .filter(album => !configuredIds.has(album.id))
    .map(album => ({ era: null, album }));
  return [...configured, ...remaining];
}

function mobileAlbumLayout() {
  return Boolean(globalThis.matchMedia?.('(max-width: 760px)').matches);
}

function synchronizeAlbumFocus(view, toggle, expanded) {
  const card = toggle.closest('.project-album');
  const collection = card?.closest('.album-collection');
  if (!card || !collection || !view.contains(collection)) return;

  card.classList.toggle('is-tracklist-expanded', expanded);

  // Build 97: mobile cards expand independently. Do not turn the whole collection
  // into desktop "album focus" mode; that was the source of large mobile jumps.
  if (mobileAlbumLayout()) {
    collection.classList.remove('has-album-focus');
    delete collection.dataset.focusedAlbumId;
    return;
  }

  const focusedCard = collection.querySelector('.project-album.is-tracklist-expanded');
  collection.classList.toggle('has-album-focus', Boolean(focusedCard));

  if (focusedCard) collection.dataset.focusedAlbumId = focusedCard.dataset.albumId || '';
  else delete collection.dataset.focusedAlbumId;
}

function setAlbumTrackListExpanded(view, toggle, expanded) {
  const listId = toggle.getAttribute('aria-controls');
  const list = listId ? document.getElementById(listId) : null;
  if (!list || !view.contains(list)) return;

  const count = Number(toggle.dataset.trackCount || 0);
  const albumTitle = toggle.dataset.albumTitle || 'album';
  const showLabel = `Show ${count} track${count === 1 ? '' : 's'}`;

  toggle.setAttribute('aria-expanded', String(expanded));
  toggle.setAttribute('aria-label', expanded ? `Hide tracks for ${albumTitle}` : `${showLabel} for ${albumTitle}`);
  toggle.textContent = expanded ? 'Hide tracks' : showLabel;
  list.hidden = !expanded;
  synchronizeAlbumFocus(view, toggle, expanded);
}

function prefersReducedMotion() {
  return Boolean(globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
}

function runAlbumLayoutTransition(callback) {
  // Native document View Transitions looked good on desktop but, combined with
  // collapsing another card and auto-focusing the new one, made mobile Albums
  // visibly jump/repaint. Mobile now owns a simple local expansion only.
  if (mobileAlbumLayout()) {
    callback();
    return Promise.resolve();
  }

  if (!prefersReducedMotion() && typeof document.startViewTransition === 'function') {
    const transition = document.startViewTransition(callback);
    return transition?.finished || Promise.resolve();
  }
  callback();
  return Promise.resolve();
}

function focusExpandedAlbumOnNarrowScreen(toggle) {
  // Build 97: never programmatically move the page after a mobile Show tracks tap.
  // The card expands exactly where the user touched it.
  if (mobileAlbumLayout()) return;
  if (!globalThis.matchMedia?.('(max-width: 1180px)').matches) return;
  const card = toggle.closest('.project-album');
  if (!card) return;

  requestAnimationFrame(() => {
    const topbar = document.querySelector('.topbar');
    const topbarHeight = topbar?.getBoundingClientRect().height || 0;
    const top = Math.max(0, window.scrollY + card.getBoundingClientRect().top - topbarHeight - 12);
    window.scrollTo({
      top,
      behavior: prefersReducedMotion() ? 'auto' : 'smooth'
    });
  });
}

function installAlbumTrackToggles(view) {
  const toggles = [...view.querySelectorAll('[data-toggle-album-tracks]')];
  const cards = [...view.querySelectorAll('.project-album[data-album-id]')];

  cards.forEach((card, index) => {
    card.style.viewTransitionName = `album-card-${index + 1}`;
  });

  toggles.forEach(toggle => {
    toggle.addEventListener('click', () => {
      const shouldExpand = toggle.getAttribute('aria-expanded') !== 'true';

      if (mobileAlbumLayout()) {
        // Independent mobile accordions: opening Coal to Diamond must not collapse
        // Neon Heartbreaks above it and yank the viewport underneath the user's finger.
        setAlbumTrackListExpanded(view, toggle, shouldExpand);
        return;
      }

      const layoutFinished = runAlbumLayoutTransition(() => {
        toggles.forEach(other => setAlbumTrackListExpanded(view, other, false));
        if (shouldExpand) setAlbumTrackListExpanded(view, toggle, true);
      });

      if (shouldExpand) {
        Promise.resolve(layoutFinished)
          .catch(() => {})
          .then(() => focusExpandedAlbumOnNarrowScreen(toggle));
      }
    });
  });
}

function renderAlbums() {
  const navButton = document.querySelector('.main-nav [data-view="analytics"]');
  if (navButton) {
    navButton.innerHTML = '<span aria-hidden="true">▣</span><span>Albums</span>';
    navButton.setAttribute('aria-label', 'Albums and projects');
  }

  const view = document.querySelector('#view-analytics');
  if (!view) return;

  const lyricCount = tracks.filter(track => track.lyrics).length;
  const genreCounts = getGenreCounts();
  const maxGenreCount = Math.max(1, ...Object.values(genreCounts));

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
      ${orderedAlbums().map(({ album, era }, albumIndex) => {
        const albumTracks = getAlbumTracks(album.id);
        const tags = [...new Set(albumTracks.flatMap(track => track.tags || [track.genre]))];
        const trackListId = `album-track-list-${albumIndex + 1}`;
        const showTracksLabel = `Show ${albumTracks.length} track${albumTracks.length === 1 ? '' : 's'}`;

        return `
          <article class="project-album" data-album-id="${escapeHtml(album.id)}">
            <button class="project-album-open" type="button" data-open-album="${escapeHtml(album.id)}" aria-label="Open ${escapeHtml(album.title)}">
              <div class="project-album-head">
                <img class="project-album-cover" src="${escapeHtml(album.cover)}" alt="${escapeHtml(album.title)} cover" loading="lazy">
                <div class="project-album-copy">
                  <small>PROJECT ${String(albumIndex + 1).padStart(2, '0')} • ${escapeHtml(album.year || '')}</small>
                  <h2>${escapeHtml(album.title)}</h2>
                  <p>${escapeHtml(era?.description || album.description || '')}</p>
                  ${era?.heading ? `<strong class="project-era-heading">${escapeHtml(era.heading)}</strong>` : ''}
                  <div class="project-tags" style="margin-top:16px;column-gap:10px;row-gap:8px">
                    ${tags.map(tag => `<span>${escapeHtml(tag)}</span>`).join('')}
                  </div>
                </div>
              </div>
            </button>
            <div class="project-album-actions">
              <button class="secondary" type="button" data-play-album="${escapeHtml(album.id)}">▶ Play album</button>
              <button class="text-button" type="button" data-open-album="${escapeHtml(album.id)}">Open project →</button>
              ${albumTracks.length ? `<button class="text-button project-album-toggle" type="button" data-toggle-album-tracks data-track-count="${albumTracks.length}" data-album-title="${escapeHtml(album.title)}" aria-expanded="false" aria-controls="${trackListId}" aria-label="${showTracksLabel} for ${escapeHtml(album.title)}">${showTracksLabel}</button>` : ''}
            </div>
            <div class="project-track-list" id="${trackListId}" hidden>
              ${albumTracks.map((track, trackIndex) => `
                <button class="project-track" type="button" data-play-index="${track.index}" data-album-context="${escapeHtml(album.id)}" aria-label="Play ${escapeHtml(track.title)}">
                  <span class="track-number">${String(trackIndex + 1).padStart(2, '0')}</span>
                  <span class="track-name">${escapeHtml(track.title)}</span>
                  <span class="track-play">▶</span>
                </button>
              `).join('')}
            </div>
          </article>
        `;
      }).join('')}
    </div>

    <article class="panel albums-dna">
      <div class="panel-head">
        <h3>Catalog DNA</h3>
        <span class="pill">AUTO-GENERATED</span>
      </div>
      <div id="genre-bars" class="genre-bars">
        ${Object.entries(genreCounts).map(([genre, count]) => `
          <div class="bar-row">
            <span>${escapeHtml(genre)}</span>
            <div class="bar-track"><div class="bar-fill" style="width:${count / maxGenreCount * 100}%"></div></div>
            <strong>${count}</strong>
          </div>
        `).join('')}
      </div>
    </article>

    <span id="metric-tracks" hidden>${tracks.length}</span>
    <span id="metric-lyrics" hidden>${lyricCount}</span>
  `;

  installAlbumTrackToggles(view);
}

function removeVisibleSearch() {
  const search = document.querySelector('.search');
  if (!search) return;
  search.setAttribute('aria-hidden', 'true');
  search.tabIndex = -1;
}

export function installContentV4() {
  ensureStylesheet('css/content-v4.css');
  installManifesto();
  removeVisibleSearch();
  renderAlbums();
  syncCatalogSummary();
}
