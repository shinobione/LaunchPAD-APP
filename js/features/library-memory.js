import { tracks, getTrackIndex } from '../core/catalog-store.js';
import { ensureStylesheet } from '../core/assets.js';

const STORAGE_KEY = 'shinobi-launchpad-memory-v1';
const HISTORY_LIMIT = 12;
const VALID_REPEAT = new Set(['off', 'all', 'one']);
const VALID_VISUALS = new Set(['orbital', 'circle', 'spectrum', 'constellation', 'vortex', 'pulse', 'nebula']);
const trackIds = new Set(tracks.map(track => track.id));

const clamp = (value, minimum, maximum) => Math.min(maximum, Math.max(minimum, value));

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function defaults() {
  return {
    favorites: [],
    history: [],
    lastTrackId: null,
    lastPosition: 0,
    volume: .85,
    shuffle: false,
    repeat: 'off',
    visualMode: 'nebula'
  };
}

function normalize(raw = {}) {
  const fallback = defaults();
  const favorites = Array.isArray(raw.favorites)
    ? [...new Set(raw.favorites.filter(id => trackIds.has(id)))]
    : fallback.favorites;
  const history = Array.isArray(raw.history)
    ? [...new Set(raw.history.filter(id => trackIds.has(id)))].slice(0, HISTORY_LIMIT)
    : fallback.history;

  return {
    favorites,
    history,
    lastTrackId: trackIds.has(raw.lastTrackId) ? raw.lastTrackId : null,
    lastPosition: Number.isFinite(Number(raw.lastPosition)) ? Math.max(0, Number(raw.lastPosition)) : 0,
    volume: Number.isFinite(Number(raw.volume)) ? clamp(Number(raw.volume), 0, 1) : fallback.volume,
    shuffle: Boolean(raw.shuffle),
    repeat: VALID_REPEAT.has(raw.repeat) ? raw.repeat : fallback.repeat,
    visualMode: VALID_VISUALS.has(raw.visualMode) ? raw.visualMode : fallback.visualMode
  };
}

function readState() {
  try {
    return normalize(JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'));
  } catch {
    return defaults();
  }
}

function writeState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Private browsing and storage policies can disable localStorage.
  }
}

function trackCard(track, index, isFavorite) {
  return `
    <article class="album-card memory-card" data-index="${index}" data-genre="${escapeHtml(track.genre)}">
      <div class="cover-wrap">
        <img src="${escapeHtml(track.cover)}" alt="Cover art for ${escapeHtml(track.title)}" loading="lazy">
        ${track.lyrics ? '<span class="lyrics-card-badge">LYRICS</span>' : ''}
        <button class="favorite-toggle${isFavorite ? ' active' : ''}" type="button" data-favorite-toggle="${escapeHtml(track.id)}" aria-pressed="${isFavorite}" aria-label="${isFavorite ? 'Remove' : 'Add'} ${escapeHtml(track.title)} ${isFavorite ? 'from' : 'to'} favorites">♥</button>
        <button class="play-overlay" type="button" data-play-index="${index}" aria-label="Listen to ${escapeHtml(track.title)}">▶</button>
      </div>
      <h3>${escapeHtml(track.title)}</h3>
      <p>${escapeHtml(track.genre)} • ${escapeHtml(track.mood)}</p>
    </article>
  `;
}

function historyRow(track, index, isFavorite, order) {
  return `
    <article class="memory-history-row">
      <span class="memory-history-number">${String(order + 1).padStart(2, '0')}</span>
      <img src="${escapeHtml(track.cover)}" alt="" loading="lazy">
      <button class="memory-history-play" type="button" data-play-index="${index}">
        <strong>${escapeHtml(track.title)}</strong>
        <small>${escapeHtml(track.album)} • ${escapeHtml(track.mood)}</small>
      </button>
      <button class="favorite-toggle memory-row-favorite${isFavorite ? ' active' : ''}" type="button" data-favorite-toggle="${escapeHtml(track.id)}" aria-pressed="${isFavorite}" aria-label="${isFavorite ? 'Remove' : 'Add'} ${escapeHtml(track.title)} ${isFavorite ? 'from' : 'to'} favorites">♥</button>
    </article>
  `;
}

export function initLibraryMemory({ audio = document.querySelector('#audio') } = {}) {
  if (!audio || window.__shinobiLibraryMemoryReady) return;
  window.__shinobiLibraryMemoryReady = true;
  ensureStylesheet('css/library-memory.css');

  const state = readState();
  let lastPositionWrite = 0;
  let pendingResume = null;
  let restoringControls = true;

  function save() {
    writeState(state);
  }

  function isFavorite(trackId) {
    return state.favorites.includes(trackId);
  }

  function ensureNavigation() {
    const nav = document.querySelector('.main-nav');
    if (!nav || nav.querySelector('[data-view="favorites"]')) return;

    const button = document.createElement('button');
    button.className = 'nav-item';
    button.dataset.view = 'favorites';
    button.innerHTML = '<span aria-hidden="true">♥</span><span>Favorites</span>';
    button.setAttribute('aria-label', 'Favorites and listening history');

    const library = nav.querySelector('[data-view="library"]');
    library?.insertAdjacentElement('afterend', button);
    if (!library) nav.appendChild(button);
  }

  function ensureView() {
    let view = document.querySelector('#view-favorites');
    if (view) return view;

    view = document.createElement('section');
    view.id = 'view-favorites';
    view.className = 'view memory-view';
    const main = document.querySelector('.main-content');
    const about = document.querySelector('#view-about');
    main?.insertBefore(view, about || null);
    return view;
  }

  function ensurePlayerFavorites() {
    const desktopControls = document.querySelector('.player-mode-controls');
    if (desktopControls && !desktopControls.querySelector('[data-favorite-current]')) {
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.favoriteCurrent = 'true';
      button.className = 'player-favorite-trigger';
      button.setAttribute('aria-label', 'Add current track to favorites');
      button.title = 'Favorite';
      button.textContent = '♥';
      desktopControls.prepend(button);
    }

    const currentTrack = document.querySelector('.current-track');
    if (currentTrack && !currentTrack.querySelector('.mobile-favorite-trigger')) {
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.favoriteCurrent = 'true';
      button.className = 'mobile-favorite-trigger';
      button.setAttribute('aria-label', 'Add current track to favorites');
      button.textContent = '♥';
      const queueButton = currentTrack.querySelector('.mobile-queue-trigger');
      currentTrack.insertBefore(button, queueButton || null);
    }
  }

  function decorateCards(root = document) {
    root.querySelectorAll('.album-card[data-index] .cover-wrap').forEach(cover => {
      if (cover.querySelector('[data-favorite-toggle]')) return;
      const card = cover.closest('.album-card');
      const track = tracks[Number(card?.dataset.index)];
      if (!track) return;

      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'favorite-toggle';
      button.dataset.favoriteToggle = track.id;
      button.textContent = '♥';
      cover.appendChild(button);
    });
  }

  function updateButtons() {
    document.querySelectorAll('[data-favorite-toggle]').forEach(button => {
      const track = tracks.find(item => item.id === button.dataset.favoriteToggle);
      if (!track) return;
      const active = isFavorite(track.id);
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
      button.setAttribute('aria-label', `${active ? 'Remove' : 'Add'} ${track.title} ${active ? 'from' : 'to'} favorites`);
    });

    const currentId = audio.dataset.trackId;
    document.querySelectorAll('[data-favorite-current]').forEach(button => {
      const track = tracks.find(item => item.id === currentId);
      const active = Boolean(track && isFavorite(track.id));
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
      button.setAttribute('aria-label', track
        ? `${active ? 'Remove' : 'Add'} ${track.title} ${active ? 'from' : 'to'} favorites`
        : 'Add current track to favorites');
    });
  }

  function renderView() {
    const view = ensureView();
    const favoriteTracks = state.favorites
      .map(id => tracks.find(track => track.id === id))
      .filter(Boolean);
    const historyTracks = state.history
      .map(id => tracks.find(track => track.id === id))
      .filter(Boolean);

    view.innerHTML = `
      <div class="page-intro memory-intro">
        <div>
          <span class="eyebrow">YOUR LOCAL COLLECTION</span>
          <h1>Favorites</h1>
          <p>Your favorites, recent plays and playback position stay on this device. No account and no tracking profile required.</p>
        </div>
        <div class="memory-summary" aria-label="Local listening summary">
          <span><strong>${favoriteTracks.length}</strong> favorites</span>
          <span><strong>${historyTracks.length}</strong> recent tracks</span>
        </div>
      </div>

      <section class="memory-section" aria-labelledby="favorite-tracks-heading">
        <div class="section-head memory-section-head">
          <div>
            <span class="eyebrow">SAVED TRACKS</span>
            <h2 id="favorite-tracks-heading">Your favorites</h2>
          </div>
        </div>
        ${favoriteTracks.length
          ? `<div class="album-grid memory-favorites-grid">${favoriteTracks.map(track => {
              const index = getTrackIndex(track.id);
              return trackCard(track, index, true);
            }).join('')}</div>`
          : '<div class="memory-empty"><strong>No favorites yet.</strong><span>Use the heart on a cover or in the player to save a track here.</span></div>'}
      </section>

      <section class="memory-section" aria-labelledby="recently-played-heading">
        <div class="section-head memory-section-head">
          <div>
            <span class="eyebrow">LISTENING HISTORY</span>
            <h2 id="recently-played-heading">Recently played</h2>
          </div>
          ${historyTracks.length ? '<button type="button" class="text-button" data-memory-action="clear-history">Clear history</button>' : ''}
        </div>
        ${historyTracks.length
          ? `<div class="memory-history-list">${historyTracks.map((track, order) => historyRow(track, getTrackIndex(track.id), isFavorite(track.id), order)).join('')}</div>`
          : '<div class="memory-empty"><strong>Your history is empty.</strong><span>Tracks appear here after playback starts.</span></div>'}
      </section>
    `;

    decorateCards(view);
    updateButtons();
  }

  function toggleFavorite(trackId) {
    if (!trackIds.has(trackId)) return;
    state.favorites = isFavorite(trackId)
      ? state.favorites.filter(id => id !== trackId)
      : [trackId, ...state.favorites];
    save();
    renderView();
    decorateCards();
    updateButtons();
  }

  function recordHistory(trackId) {
    if (!trackIds.has(trackId)) return;
    state.history = [trackId, ...state.history.filter(id => id !== trackId)].slice(0, HISTORY_LIMIT);
    state.lastTrackId = trackId;
    save();
    renderView();
  }

  function currentTrackId() {
    return trackIds.has(audio.dataset.trackId) ? audio.dataset.trackId : null;
  }

  function persistPosition(force = false) {
    const trackId = currentTrackId();
    if (!trackId || !Number.isFinite(audio.currentTime)) return;
    const now = Date.now();
    if (!force && now - lastPositionWrite < 4000) return;
    lastPositionWrite = now;
    state.lastTrackId = trackId;
    state.lastPosition = audio.ended ? 0 : Math.max(0, audio.currentTime);
    save();
  }

  function applyPendingResume() {
    if (!pendingResume || audio.dataset.trackId !== pendingResume.trackId || !Number.isFinite(audio.duration)) return;
    const safePosition = pendingResume.position > 0 && pendingResume.position < audio.duration - 8
      ? pendingResume.position
      : 0;
    audio.currentTime = safePosition;
    pendingResume = null;
  }

  function restoreTrackAndPosition() {
    const route = window.location.hash.replace(/^#/, '') || 'home';
    if (!['home', ''].includes(route) || !state.lastTrackId) return;

    pendingResume = { trackId: state.lastTrackId, position: state.lastPosition };
    const originalHash = window.location.hash || '#home';
    window.history.replaceState(null, '', `#track=${encodeURIComponent(state.lastTrackId)}`);
    window.dispatchEvent(new HashChangeEvent('hashchange'));
    window.history.replaceState(null, '', originalHash === '#track=' ? '#home' : originalHash);
    if (audio.readyState >= 1) applyPendingResume();
  }

  function restoreControls() {
    const volumeInput = document.querySelector('#volume');
    audio.volume = state.volume;
    if (volumeInput) volumeInput.value = String(state.volume);

    const shuffle = document.querySelector('.player-mode-controls [data-queue-action="shuffle"]');
    if (state.shuffle && shuffle?.getAttribute('aria-pressed') !== 'true') shuffle.click();

    const repeat = document.querySelector('.player-mode-controls [data-queue-action="repeat"]');
    if (repeat) {
      for (let step = 0; step < 3 && repeat.dataset.repeat !== state.repeat; step += 1) repeat.click();
    }

    const visual = document.querySelector(`[data-visual="${CSS.escape(state.visualMode)}"]`);
    visual?.click();
    restoringControls = false;
  }

  ensureNavigation();
  ensureView();
  ensurePlayerFavorites();
  decorateCards();
  renderView();
  restoreControls();
  restoreTrackAndPosition();
  updateButtons();

  const cardObserver = new MutationObserver(records => {
    records.forEach(record => record.addedNodes.forEach(node => {
      if (node instanceof Element) decorateCards(node);
    }));
    updateButtons();
  });
  const main = document.querySelector('.main-content');
  if (main) cardObserver.observe(main, { childList: true, subtree: true });

  const audioObserver = new MutationObserver(() => {
    const trackId = currentTrackId();
    if (!trackId) return;
    if (state.lastTrackId !== trackId) {
      state.lastTrackId = trackId;
      state.lastPosition = 0;
      save();
    }
    updateButtons();
  });
  audioObserver.observe(audio, { attributes: true, attributeFilter: ['data-track-id'] });

  document.addEventListener('click', event => {
    const toggle = event.target.closest('[data-favorite-toggle]');
    if (toggle) {
      event.preventDefault();
      event.stopImmediatePropagation();
      toggleFavorite(toggle.dataset.favoriteToggle);
      return;
    }

    const current = event.target.closest('[data-favorite-current]');
    if (current) {
      event.preventDefault();
      event.stopImmediatePropagation();
      const trackId = currentTrackId();
      if (trackId) toggleFavorite(trackId);
      return;
    }

    const clear = event.target.closest('[data-memory-action="clear-history"]');
    if (clear) {
      event.preventDefault();
      state.history = [];
      save();
      renderView();
      return;
    }

    if (restoringControls) return;
    const queueAction = event.target.closest('[data-queue-action]')?.dataset.queueAction;
    const visualMode = event.target.closest('[data-visual]')?.dataset.visual;
    if (queueAction === 'shuffle' || queueAction === 'repeat' || visualMode) {
      window.setTimeout(() => {
        const shuffleButton = document.querySelector('.player-mode-controls [data-queue-action="shuffle"]');
        const repeatButton = document.querySelector('.player-mode-controls [data-queue-action="repeat"]');
        const activeVisual = document.querySelector('[data-visual].active');
        state.shuffle = shuffleButton?.getAttribute('aria-pressed') === 'true';
        state.repeat = VALID_REPEAT.has(repeatButton?.dataset.repeat) ? repeatButton.dataset.repeat : 'off';
        state.visualMode = VALID_VISUALS.has(activeVisual?.dataset.visual) ? activeVisual.dataset.visual : 'nebula';
        save();
      }, 0);
    }
  }, true);

  const volumeInput = document.querySelector('#volume');
  volumeInput?.addEventListener('input', () => {
    state.volume = clamp(audio.volume, 0, 1);
    save();
  });

  audio.addEventListener('loadedmetadata', applyPendingResume);
  audio.addEventListener('play', () => {
    const trackId = currentTrackId();
    if (trackId) recordHistory(trackId);
  });
  audio.addEventListener('timeupdate', () => persistPosition(false));
  audio.addEventListener('pause', () => persistPosition(true));
  audio.addEventListener('ended', () => {
    state.lastPosition = 0;
    save();
  });
  window.addEventListener('pagehide', () => persistPosition(true));

  window.__shinobiLibraryMemory = {
    getState: () => JSON.parse(JSON.stringify(state)),
    toggleFavorite,
    clear() {
      Object.assign(state, defaults());
      save();
      renderView();
      updateButtons();
    }
  };
}
