export function installExtendedUI() {
  const ensureStylesheet = href => {
    if (document.querySelector(`link[href="${href}"]`)) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    document.head.appendChild(link);
  };

  ensureStylesheet('css/lyrics.css');
  ensureStylesheet('css/fixes-v2.css');

  const mainNav = document.querySelector('.main-nav');
  const journeyNav = mainNav?.querySelector('[data-view="analytics"]');
  if (journeyNav) {
    journeyNav.innerHTML = '<span aria-hidden="true">✦</span><span>Journey</span>';
    journeyNav.setAttribute('aria-label', 'Artist journey');
  }

  if (mainNav && !mainNav.querySelector('[data-view="lyrics"]')) {
    const button = document.createElement('button');
    button.className = 'nav-item';
    button.dataset.view = 'lyrics';
    button.innerHTML = '<span aria-hidden="true">≋</span><span>Lyrics</span>';
    mainNav.insertBefore(button, journeyNav);
  }

  const topBadge = document.querySelector('.live-badge');
  if (topBadge) {
    topBadge.className = 'catalog-badge';
    topBadge.innerHTML = '<span>CATALOG</span><strong>10 TRACKS</strong>';
  }

  const journeyView = document.querySelector('#view-analytics');
  if (journeyView && !journeyView.dataset.upgraded) {
    journeyView.dataset.upgraded = 'true';
    journeyView.innerHTML = `
      <div class="page-intro journey-intro">
        <div>
          <span class="eyebrow">ARTIST JOURNEY</span>
          <h1>Three worlds, one signal.</h1>
          <p>Move through the projects that shaped the current SHINOBIWAN sound — from digital intimacy to pressure-forged rap and stories inspired by Saigon.</p>
        </div>
        <button class="secondary journey-library-link" data-view-target="library">Explore every track →</button>
      </div>

      <div class="journey-stats" aria-label="Catalog overview">
        <article><strong id="metric-tracks">10</strong><span>released tracks</span></article>
        <article><strong>3</strong><span>creative eras</span></article>
        <article><strong>4</strong><span>sonic worlds</span></article>
        <article><strong id="metric-lyrics">10</strong><span>lyric experiences</span></article>
      </div>

      <div class="journey-grid">
        <article class="journey-card neon-era">
          <div class="journey-cover-stack">
            <img src="assets/before-the-noise.jpeg" alt="Before the Noise cover">
            <img src="assets/low-bitrate-love.jpeg" alt="Low Bitrate Love cover">
          </div>
          <div class="journey-copy">
            <span class="journey-number">01</span>
            <small>NEON HEARTBREAKS</small>
            <h2>Digital intimacy</h2>
            <p>Glitched romance, close-mic emotion and nocturnal R&amp;B built around fragile connections.</p>
            <button class="text-button" data-play-index="0">Play this era →</button>
          </div>
        </article>

        <article class="journey-card pressure-era">
          <div class="journey-cover-stack">
            <img src="assets/thick.jpeg" alt="THICK cover">
            <img src="assets/carved-from-pressure.jpeg" alt="Carved from Pressure cover">
          </div>
          <div class="journey-copy">
            <span class="journey-number">02</span>
            <small>COAL TO DIAMOND</small>
            <h2>Pressure into power</h2>
            <p>Heavy drums, confidence, resilience and cinematic hip-hop with a sharper, more physical edge.</p>
            <button class="text-button" data-play-index="2">Play this era →</button>
          </div>
        </article>

        <article class="journey-card saigon-era">
          <div class="journey-cover-stack">
            <img src="assets/saigon-bound.png" alt="Saigon Bound cover">
            <img src="assets/tinh-bolero-cho-tran.png" alt="Tình Bolero Cho Trân cover">
          </div>
          <div class="journey-copy">
            <span class="journey-number">03</span>
            <small>LOVE LETTERS FROM SAIGON</small>
            <h2>Distance becomes a place</h2>
            <p>Vietnamese influences, travel memories and love songs shaped by two countries and one relationship.</p>
            <button class="text-button" data-play-index="5">Play this era →</button>
          </div>
        </article>
      </div>

      <article class="panel journey-palette">
        <div class="panel-head">
          <h3>The current sound palette</h3>
          <span class="pill">CATALOG DNA</span>
        </div>
        <div id="genre-bars" class="genre-bars"></div>
      </article>
    `;
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
      <div id="home-lyrics" class="home-lyrics" aria-live="polite">
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
          <div id="lyrics-reader" class="lyrics-reader" aria-live="polite">
            <p class="lyrics-placeholder">Loading lyrics…</p>
          </div>
        </div>
      </article>
    `;
    const main = document.querySelector('.main-content');
    main.insertBefore(section, document.querySelector('#view-analytics'));
  }
}
