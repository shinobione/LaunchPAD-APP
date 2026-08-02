import {
  tracks,
  getTrackIndex,
  getAlbumTrackIndexes,
  getCatalogTags,
  getGenreCounts,
  getLatestTrackEntries,
  validateCatalogRuntime
} from './core/catalog-store.js';
import { createQueueController } from './core/player-queue.js';
import { createRouter } from './core/router.js';
import { applyTrackTheme } from './core/theme.js';
import { shareRoute } from './core/share.js';
import { installExtendedUI } from './features/ui/ui-controller.js';
import { createLyricsController } from './features/lyrics/lyrics-engine.js';
import { createVisualController } from './features/visual/visual-engine.js';
import { createMediaSessionController } from './features/media-session.js';
import { createQueueUI } from './features/queue-ui.js';
import { createAlbumDetail } from './features/album-detail.js';
import { initLyricsStudio } from './features/lyrics-studio.js';

installExtendedUI();

const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];
const audio = $('#audio');
const allTrackIndexes = tracks.map((_, index) => index);

let currentIndex = 0;
let activeFilter = 'all';
let activeView = 'home';
let router;

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function getAccent() {
  const styles = getComputedStyle(document.documentElement);
  return [
    styles.getPropertyValue('--accent').trim() || '#a63cff',
    styles.getPropertyValue('--accent2').trim() || '#5c6cff'
  ];
}

function card(track, index) {
  return `
    <article class="album-card" data-index="${index}" data-genre="${escapeHtml(track.genre)}">
      <div class="cover-wrap">
        <img src="${escapeHtml(track.cover)}" alt="Cover art for ${escapeHtml(track.title)}" loading="lazy">
        ${track.lyrics ? '<span class="lyrics-card-badge">LYRICS</span>' : ''}
        <button class="play-overlay" data-play-index="${index}" aria-label="Listen to ${escapeHtml(track.title)}">▶</button>
      </div>
      <h3>${escapeHtml(track.title)}</h3>
      <p>${escapeHtml(track.genre)} • ${escapeHtml(track.mood)}</p>
    </article>
  `;
}

function renderLibraryFilters() {
  const filterRow = $('#view-library .filter-row');
  if (!filterRow) return;

  const preferredOrder = ['R&B', 'Hip-hop', 'Love', 'Vietnam'];
  const catalogTags = getCatalogTags();
  const orderedTags = [
    ...preferredOrder.filter(tag => catalogTags.includes(tag)),
    ...catalogTags
      .filter(tag => !preferredOrder.includes(tag))
      .sort((a, b) => a.localeCompare(b, 'en', { sensitivity: 'base' }))
  ];

  filterRow.innerHTML = [
    '<button class="chip active" data-filter="all">All</button>',
    ...orderedTags.map(tag =>
      `<button class="chip" data-filter="${escapeHtml(tag)}">${escapeHtml(tag)}</button>`
    ),
    '<button class="chip" data-filter="with-lyrics">With lyrics</button>'
  ].join('');
}

function renderGenreBars() {
  const target = $('#genre-bars');
  if (!target) return;

  const counts = getGenreCounts();
  const max = Math.max(1, ...Object.values(counts));
  target.innerHTML = Object.entries(counts).map(([genre, value]) => `
    <div class="bar-row">
      <span>${escapeHtml(genre)}</span>
      <div class="bar-track"><div class="bar-fill" style="width:${value / max * 100}%"></div></div>
      <strong>${value}</strong>
    </div>
  `).join('');
}

function render() {
  renderLibraryFilters();

  $('#featured-grid').innerHTML = getLatestTrackEntries()
    .map(({ track, index }) => card(track, index))
    .join('');

  $('#library-grid').innerHTML = tracks.map(card).join('');
  $('#metric-tracks').textContent = String(tracks.length);
  $('#metric-lyrics').textContent = String(tracks.filter(track => track.lyrics).length);
  $('#lyrics-track-select').innerHTML = tracks.map((track, index) =>
    `<option value="${index}">${escapeHtml(track.title)}${track.lyrics ? '' : ' — lyrics unavailable'}</option>`
  ).join('');
  renderGenreBars();
}

const queue = createQueueController({ allIndexes: allTrackIndexes });
const visuals = createVisualController({ audio, $, getAccent });

function normalizeView(name) {
  if (name === 'albums') return 'analytics';
  return name;
}

function viewRoute(name) {
  const normalized = normalizeView(name);
  if (normalized === 'analytics') return { type: 'view', value: 'albums' };
  if (normalized === 'lyrics') return { type: 'lyrics', id: tracks[currentIndex]?.id };
  return { type: 'view', value: normalized };
}

function switchView(name, { syncRoute = true, replaceRoute = false } = {}) {
  const normalized = normalizeView(name);
  const target = $(`#view-${normalized}`);
  if (!target) return false;

  activeView = normalized;
  $$('.view').forEach(view => view.classList.toggle('active', view === target));
  $$('[data-view]').forEach(button => {
    button.classList.toggle('active', normalizeView(button.dataset.view) === normalized);
  });
  $('.sidebar')?.classList.remove('open');
  window.scrollTo({ top: 0, behavior: 'smooth' });

  if (normalized === 'lyrics') window.setTimeout(() => lyrics.scrollToActive(), 120);
  if (syncRoute && router) router.write(viewRoute(normalized), { replace: replaceRoute });
  return true;
}

const lyrics = createLyricsController({
  tracks,
  audio,
  getCurrentIndex: () => currentIndex,
  selectTrack,
  switchView,
  $,
  $$,
  escapeHtml
});

function buildVisualCaption(track) {
  const mood = track.mood.charAt(0).toLowerCase() + track.mood.slice(1);
  return `${track.title} is shaping a live ${track.genre} signal with a ${mood} pulse.`;
}

function updateTrackUI(track) {
  ['player-cover', 'mini-cover', 'lab-cover', 'lyrics-cover'].forEach(id => {
    const image = $(`#${id}`);
    if (!image) return;
    image.src = track.cover;
    image.alt = `Cover art for ${track.title}`;
  });

  ['player-title', 'mini-title', 'lab-title', 'lyrics-title'].forEach(id => {
    const element = $(`#${id}`);
    if (element) element.textContent = track.title;
  });

  $('#player-genre').textContent = `${track.genre} • ${track.mood}`;
  $('#lyrics-meta').textContent = `${track.genre} • ${track.mood}`;
  $('#lyrics-ep').textContent = track.album.toUpperCase();
  $('#lyrics-track-select').value = String(currentIndex);

  const caption = $('#now-visual-caption');
  if (caption) caption.textContent = buildVisualCaption(track);

  $$('.album-card, .album-detail-track, .project-track').forEach(element => {
    const index = Number(
      element.dataset.index
      ?? element.dataset.albumDetailTrack
      ?? element.dataset.playIndex
    );
    element.classList.toggle('is-current', index === currentIndex);
  });

  document.title = `${track.title} — SHINOBIWAN`;
  mediaSession.update(track);
}

function selectTrack(index, shouldPlay = true, { syncQueue = true, preserveQueue = true } = {}) {
  if (!Number.isInteger(index) || !tracks[index]) return;

  if (syncQueue) queue.select(index, { preserveContext: preserveQueue });
  currentIndex = index;
  const track = tracks[currentIndex];
  applyTrackTheme(track);

  const sameTrack = audio.dataset.trackId === track.id;
  if (!sameTrack) {
    audio.src = track.file;
    audio.dataset.trackId = track.id;
    audio.load();
  }

  updateTrackUI(track);
  lyrics.load(track);

  if (activeView === 'lyrics' && router) {
    router.write({ type: 'lyrics', id: track.id }, { replace: true });
  }

  if (shouldPlay) {
    if (sameTrack && audio.ended) audio.currentTime = 0;
    visuals.resume();
    audio.play().catch(error => {
      console.warn('Playback was blocked by the browser', error);
      updatePlayButtons(false);
    });
  } else {
    updatePlayButtons(false);
  }
}

function playTrack(index, { albumId = null } = {}) {
  if (albumId) {
    const albumIndexes = getAlbumTrackIndexes(albumId);
    queue.setContext(albumIndexes, index, { type: 'album', id: albumId });
    selectTrack(index, true, { syncQueue: false });
    return;
  }

  queue.setContext(allTrackIndexes, index, { type: 'catalog', id: 'all' });
  selectTrack(index, true, { syncQueue: false });
}

function playAlbum(albumId, startIndex = null) {
  const indexes = getAlbumTrackIndexes(albumId);
  if (!indexes.length) return;
  const firstIndex = indexes.includes(startIndex) ? startIndex : indexes[0];
  queue.setContext(indexes, firstIndex, { type: 'album', id: albumId });
  selectTrack(firstIndex, true, { syncQueue: false });
}

function playNext({ ended = false } = {}) {
  const nextIndex = queue.next({ ended });
  if (nextIndex === null) {
    audio.pause();
    audio.currentTime = 0;
    return;
  }

  if (nextIndex === currentIndex) audio.currentTime = 0;
  selectTrack(nextIndex, true, { syncQueue: false });
}

function playPrevious() {
  if (audio.currentTime > 3) {
    audio.currentTime = 0;
    return;
  }

  const previousIndex = queue.previous();
  selectTrack(previousIndex, true, { syncQueue: false });
}

function togglePlayback() {
  if (!audio.src) {
    playTrack(currentIndex);
    return;
  }

  if (audio.paused) {
    visuals.resume();
    audio.play().catch(() => updatePlayButtons(false));
  } else {
    audio.pause();
  }
}

function updatePlayButtons(playing) {
  $$('[data-action="toggle"]').forEach(button => {
    button.textContent = playing ? '❚❚' : '▶';
    button.setAttribute('aria-label', playing ? 'Pause' : 'Play');
  });
}

function formatTime(seconds) {
  if (!Number.isFinite(seconds)) return '0:00';
  return `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;
}

function applyLibraryVisibility() {
  const query = $('#search').value.trim().toLowerCase();
  let visibleCount = 0;

  $$('#library-grid .album-card').forEach(cardElement => {
    const track = tracks[Number(cardElement.dataset.index)];
    const tags = Array.isArray(track.tags) ? track.tags : [track.genre];
    const filterMatches =
      activeFilter === 'all' ||
      tags.includes(activeFilter) ||
      (activeFilter === 'with-lyrics' && Boolean(track.lyrics));
    const queryMatches = !query || track.searchText.includes(query);
    const visible = filterMatches && queryMatches;
    cardElement.hidden = !visible;
    if (visible) visibleCount += 1;
  });

  $('#library-empty').hidden = visibleCount !== 0;
  $('#search-status').textContent = query
    ? `${visibleCount} result${visibleCount === 1 ? '' : 's'}${lyrics.isSearchHydrated() ? '' : ' • indexing…'}`
    : '';
}

function applyFilter(filter) {
  activeFilter = filter;
  $$('.chip[data-filter]').forEach(button => {
    button.classList.toggle('active', button.dataset.filter === filter);
  });
  switchView('library');
  applyLibraryVisibility();
}

const albumDetail = createAlbumDetail({
  escapeHtml,
  onPlayAlbum: albumId => playAlbum(albumId),
  onPlayTrack: (index, albumId) => playTrack(index, { albumId }),
  onBack: () => router.navigate({ type: 'view', value: 'albums' })
});

function openAlbum(albumId, { syncRoute = true } = {}) {
  if (!albumDetail.render(albumId)) return false;
  switchView('album', { syncRoute: false });
  if (syncRoute && router) router.write({ type: 'album', id: albumId }, { replace: false });
  return true;
}

const mediaSession = createMediaSessionController({
  audio,
  getTrack: () => tracks[currentIndex],
  onPlay: () => {
    visuals.resume();
    audio.play().catch(() => {});
  },
  onPause: () => audio.pause(),
  onNext: () => playNext(),
  onPrevious: () => playPrevious(),
  onSeekTo: time => { audio.currentTime = time; }
});

createQueueUI({
  tracks,
  queue,
  onSelect: index => selectTrack(index, true),
  onShareCurrent: () => {
    const track = tracks[currentIndex];
    shareRoute({
      title: `${track.title} — SHINOBIWAN`,
      text: `Listen to ${track.title} on the SHINOBIWAN Launchpad.`,
      route: { type: 'track', id: track.id }
    });
  }
});

initLyricsStudio();
render();

const catalogHealth = validateCatalogRuntime();
if (!catalogHealth.valid) console.error('Catalog validation errors:', catalogHealth.errors);
if (catalogHealth.warnings.length) console.info('Catalog notes:', catalogHealth.warnings);

function handleRoute(route) {
  if (route.type === 'track') {
    const index = getTrackIndex(route.id);
    if (index < 0) {
      router.navigate({ type: 'view', value: 'home' }, { replace: true });
      return;
    }
    selectTrack(index, false, { preserveQueue: false });
    switchView('home', { syncRoute: false });
    return;
  }

  if (route.type === 'lyrics') {
    const index = getTrackIndex(route.id);
    if (index < 0) {
      router.navigate({ type: 'view', value: 'home' }, { replace: true });
      return;
    }
    selectTrack(index, false, { preserveQueue: false });
    switchView('lyrics', { syncRoute: false });
    return;
  }

  if (route.type === 'album') {
    if (!openAlbum(route.id, { syncRoute: false })) {
      router.navigate({ type: 'view', value: 'albums' }, { replace: true });
    }
    return;
  }

  const requestedView = normalizeView(route.value || 'home');
  if (!switchView(requestedView, { syncRoute: false })) {
    router.navigate({ type: 'view', value: 'home' }, { replace: true });
  }
}

router = createRouter({ onRoute: handleRoute });

document.addEventListener('click', event => {
  if (event.defaultPrevented) return;

  const playButton = event.target.closest('[data-play-index]');
  if (playButton) {
    event.preventDefault();
    const albumId = playButton.dataset.albumContext || null;
    playTrack(Number(playButton.dataset.playIndex), { albumId });
    return;
  }

  const playAlbumButton = event.target.closest('[data-play-album]');
  if (playAlbumButton) {
    event.preventDefault();
    playAlbum(playAlbumButton.dataset.playAlbum);
    return;
  }

  const openAlbumButton = event.target.closest('[data-open-album]');
  if (openAlbumButton) {
    event.preventDefault();
    router.navigate({ type: 'album', id: openAlbumButton.dataset.openAlbum });
    return;
  }

  const actionButton = event.target.closest('[data-action]');
  if (actionButton) {
    const action = actionButton.dataset.action;
    if (action === 'toggle') togglePlayback();
    if (action === 'next') playNext();
    if (action === 'prev') playPrevious();
    return;
  }

  const viewButton = event.target.closest('[data-view]');
  if (viewButton) {
    event.preventDefault();
    const view = normalizeView(viewButton.dataset.view);
    router.navigate(viewRoute(view));
    return;
  }

  const viewTarget = event.target.closest('[data-view-target]');
  if (viewTarget) {
    event.preventDefault();
    const view = normalizeView(viewTarget.dataset.viewTarget);
    router.navigate(viewRoute(view));
    return;
  }

  const filterButton = event.target.closest('[data-filter]');
  if (filterButton) applyFilter(filterButton.dataset.filter);
});

$('#menu-button').addEventListener('click', () => $('.sidebar').classList.toggle('open'));

$('#seek').addEventListener('input', event => {
  if (audio.duration) audio.currentTime = Number(event.target.value) / 100 * audio.duration;
});

$('#volume').addEventListener('input', event => {
  audio.volume = Number(event.target.value);
});
audio.volume = .85;

$('#search').addEventListener('input', event => {
  const query = event.target.value.trim();
  if (query) switchView('library');
  applyLibraryVisibility();
  if (query && !lyrics.isSearchHydrated()) {
    lyrics.hydrateSearchIndex(applyLibraryVisibility);
  }
});

audio.addEventListener('timeupdate', () => {
  const progress = audio.duration ? audio.currentTime / audio.duration * 100 : 0;
  $('#seek').value = String(progress);
  $('#mini-progress').style.width = `${progress}%`;
  $('#lyrics-progress-fill').style.width = `${progress}%`;
  $('#current-time').textContent = formatTime(audio.currentTime);
  $('#duration').textContent = formatTime(audio.duration);
  $('#lyrics-current-time').textContent = formatTime(audio.currentTime);
  $('#lyrics-duration').textContent = formatTime(audio.duration);
  lyrics.update(audio.currentTime);
  mediaSession.updatePosition();
});

audio.addEventListener('play', () => {
  updatePlayButtons(true);
  mediaSession.updatePlaybackState();
});
audio.addEventListener('pause', () => {
  updatePlayButtons(false);
  mediaSession.updatePlaybackState();
});
audio.addEventListener('ended', () => playNext({ ended: true }));

document.addEventListener('keydown', event => {
  const target = event.target;
  const typing = target instanceof HTMLInputElement || target instanceof HTMLSelectElement || target instanceof HTMLTextAreaElement;
  if (event.key === 'Escape') $('.sidebar').classList.remove('open');
  if ((event.key === 'Enter' || event.key === ' ') && target?.classList?.contains('current-track')) {
    event.preventDefault();
    router.navigate({ type: 'lyrics', id: tracks[currentIndex].id });
  }
  if (event.code === 'Space' && !typing && !(target instanceof HTMLButtonElement) && !target?.classList?.contains('current-track')) {
    event.preventDefault();
    togglePlayback();
  }
});

queue.setContext(allTrackIndexes, 0, { type: 'catalog', id: 'all' });
selectTrack(0, false, { syncQueue: false });
lyrics.hydrateSearchIndex();
router.start();