import { ensureStylesheet } from '../../core/assets.js';

export function installExtendedUI() {
  ensureStylesheet('css/lyrics.css');
  ensureStylesheet('css/fixes-v2.css');

  const mainNav = document.querySelector('.main-nav');
  const albumsNav = mainNav?.querySelector('[data-view="analytics"]');

  if (mainNav && !mainNav.querySelector('[data-view="lyrics"]')) {
    const button = document.createElement('button');
    button.className = 'nav-item';
    button.dataset.view = 'lyrics';
    button.innerHTML = '<span aria-hidden="true">≋</span><span>Lyrics</span>';
    mainNav.insertBefore(button, albumsNav);
  }

  const mobileNav = document.querySelector('.mobile-nav');
  if (mobileNav && !mobileNav.querySelector('[data-view="lyrics"]')) {
    const button = document.createElement('button');
    button.dataset.view = 'lyrics';
    button.innerHTML = '≋<span>Lyrics</span>';
    mobileNav.insertBefore(button, mobileNav.querySelector('[data-view="lab"]'));
  }

  const sidePlayer = document.querySelector('.side-player');
  if (sidePlayer && !sidePlayer.querySelector('.side-lyrics-link')) {
    const button = document.createElement('button');
    button.className = 'side-lyrics-link';
    button.dataset.viewTarget = 'lyrics';
    button.textContent = 'Open lyrics →';
    sidePlayer.appendChild(button);
  }

  const search = document.querySelector('.search');
  if (search && !document.querySelector('#search-status')) {
    const status = document.createElement('span');
    status.id = 'search-status';
    status.className = 'search-status';
    status.setAttribute('aria-live', 'polite');
    search.appendChild(status);
    const input = search.querySelector('input');
    if (input) input.placeholder = 'Search tracks, moods or lyrics…';
  }

  const homePanels = document.querySelector('.home-panels');
  if (homePanels && !document.querySelector('#home-lyrics')) {
    const panel = document.createElement('article');
    panel.className = 'panel home-lyrics-panel';
    panel.innerHTML = `
      <div class="panel-head">
        <h3>Live lyrics</h3>
        <span id="home-lyrics-status" class="pill">SYNC</span>
      </div>
      <div id="home-lyrics" class="home-lyrics" aria-live="off">
        <p class="lyrics-placeholder">Start a track to follow the lyrics.</p>
      </div>
      <button class="text-button lyrics-open-button" data-view-target="lyrics">Open full lyrics →</button>
    `;
    homePanels.insertBefore(panel, homePanels.querySelector('.discovery-panel'));
  }

  const filterRow = document.querySelector('#view-library .filter-row');
  if (filterRow && !filterRow.querySelector('[data-filter="with-lyrics"]')) {
    const button = document.createElement('button');
    button.className = 'chip';
    button.dataset.filter = 'with-lyrics';
    button.textContent = 'With lyrics';
    filterRow.appendChild(button);
  }

  const libraryGrid = document.querySelector('#library-grid');
  if (libraryGrid && !document.querySelector('#library-empty')) {
    const empty = document.createElement('p');
    empty.id = 'library-empty';
    empty.className = 'empty-state';
    empty.hidden = true;
    empty.textContent = 'No tracks match this search.';
    libraryGrid.insertAdjacentElement('afterend', empty);
  }

  const currentTrack = document.querySelector('.current-track');
  if (currentTrack) {
    currentTrack.dataset.viewTarget = 'lyrics';
    currentTrack.setAttribute('role', 'button');
    currentTrack.setAttribute('tabindex', '0');
    currentTrack.setAttribute('aria-label', 'Show lyrics for the current track');
  }

  if (!document.querySelector('#view-lyrics')) {
    const section = document.createElement('section');
    section.className = 'view';
    section.id = 'view-lyrics';
    section.innerHTML = `
      <div class="page-intro lyrics-intro">
        <div>
          <span class="eyebrow">SYNCHRONIZED LYRICS</span>
          <h1>Lyrics</h1>
          <p>Lyrics follow playback in real time. Select a timestamped line to jump directly to that moment.</p>
        </div>
        <span id="lyrics-availability" class="lyrics-availability">SYNC READY</span>
      </div>

      <article class="lyrics-stage">
        <aside class="lyrics-track-panel">
          <div class="lyrics-cover-wrap">
            <div class="lyrics-cover-glow"></div>
            <img id="lyrics-cover" src="assets/before-the-noise.jpeg" alt="Current track cover">
          </div>
          <span id="lyrics-ep" class="eyebrow">NEON HEARTBREAKS</span>
          <h2 id="lyrics-title">Before the Noise</h2>
          <p id="lyrics-meta">R&amp;B • Digital melancholy</p>

          <div class="lyrics-transport">
            <button data-action="prev" aria-label="Previous track">⏮</button>
            <button class="lyrics-main-play" data-action="toggle" aria-label="Play">▶</button>
            <button data-action="next" aria-label="Next track">⏭</button>
          </div>

          <div class="lyrics-progress">
            <span id="lyrics-current-time">0:00</span>
            <div class="lyrics-progress-track"><i id="lyrics-progress-fill"></i></div>
            <span id="lyrics-duration">0:00</span>
          </div>

          <label class="lyrics-track-select-label" for="lyrics-track-select">Choose a track</label>
          <select id="lyrics-track-select" class="lyrics-track-select"></select>
        </aside>

        <div class="lyrics-reader-shell">
          <div class="lyrics-reader-head">
            <span id="lyrics-reader-label">SYNCHRONIZED LYRICS</span>
            <button id="lyrics-autoscroll" class="chip active" type="button" aria-pressed="true">Auto-scroll</button>
          </div>
          <div id="lyrics-reader" class="lyrics-reader" aria-live="off">
            <p class="lyrics-placeholder">Loading lyrics…</p>
          </div>
        </div>
      </article>
    `;
    const main = document.querySelector('.main-content');
    main.insertBefore(section, document.querySelector('#view-analytics'));
  }
}
