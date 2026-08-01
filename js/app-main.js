import { tracks } from './catalog.js';
import { installExtendedUI } from './ui.js';
import { createLyricsController } from './lyrics-engine.js';
import { createVisualController } from './visual-engine.js';

installExtendedUI();

const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];
const audio = $('#audio');

let currentIndex = 0;
let activeFilter = 'all';

const palettes = {
  'R&B': ['#a63cff', '#5c6cff'],
  Love: ['#e64d9b', '#8a55ff'],
  'Hip-hop': ['#ff4d68', '#8d3cff'],
  Vietnam: ['#ff9955', '#d83cff']
};

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

function renderGenreBars() {
  const counts = {};
  tracks.forEach(track => {
    counts[track.genre] = (counts[track.genre] || 0) + 1;
  });
  const max = Math.max(...Object.values(counts));
  $('#genre-bars').innerHTML = Object.entries(counts).map(([genre, value]) => `
    <div class="bar-row">
      <span>${escapeHtml(genre)}</span>
      <div class="bar-track"><div class="bar-fill" style="width:${value / max * 100}%"></div></div>
      <strong>${value}</strong>
    </div>
  `).join('');
}

function render() {
  $('#featured-grid').innerHTML = tracks.slice(0, 5).map(card).join('');
  $('#library-grid').innerHTML = tracks.map(card).join('');
  $('#metric-tracks').textContent = String(tracks.length);
  $('#metric-lyrics').textContent = String(tracks.filter(track => track.lyrics).length);
  $('#lyrics-track-select').innerHTML = tracks.map((track, index) =>
    `<option value="${index}">${escapeHtml(track.title)}${track.lyrics ? '' : ' — lyrics unavailable'}</option>`
  ).join('');
  renderGenreBars();
}

const visuals = createVisualController({ audio, $, getAccent });

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

function setTheme(track) {
  const [accent, accent2] = palettes[track.genre] || palettes['R&B'];
  document.documentElement.style.setProperty('--accent', accent);
  document.documentElement.style.setProperty('--accent2', accent2);
}

function buildVisualCaption(track) {
  const mood = track.mood.charAt(0).toLowerCase() + track.mood.slice(1);
  return `${track.title} is shaping a live ${track.genre} signal with a ${mood} pulse.`;
}

function updateTrackUI(track) {
  ['player-cover', 'mini-cover', 'lab-cover', 'lyrics-cover'].forEach(id => {
    const image = $(`#${id}`);
    if (image) {
      image.src = track.cover;
      image.alt = `Cover art for ${track.title}`;
    }
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

  $$('.album-card').forEach(cardElement => {
    cardElement.classList.toggle('is-current', Number(cardElement.dataset.index) === currentIndex);
  });
}

function selectTrack(index, shouldPlay = true) {
  currentIndex = (index + tracks.length) % tracks.length;
  const track = tracks[currentIndex];
  setTheme(track);

  if (audio.dataset.trackId !== track.id) {
    audio.src = track.file;
    audio.dataset.trackId = track.id;
    audio.load();
  }

  updateTrackUI(track);
  lyrics.load(track);

  if (shouldPlay) {
    visuals.resume();
    audio.play().catch(error => {
      console.warn('Playback was blocked by the browser', error);
      updatePlayButtons(false);
    });
  } else {
    updatePlayButtons(false);
  }
}

function playTrack(index) {
  selectTrack(index, true);
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

function switchView(name) {
  $$('.view').forEach(view => view.classList.toggle('active', view.id === `view-${name}`));
  $$('[data-view]').forEach(button => button.classList.toggle('active', button.dataset.view === name));
  $('.sidebar').classList.remove('open');
  window.scrollTo({ top: 0, behavior: 'smooth' });
  if (name === 'lyrics') window.setTimeout(() => lyrics.scrollToActive(), 120);
}

function applyLibraryVisibility() {
  const query = $('#search').value.trim().toLowerCase();
  let visibleCount = 0;

  $$('#library-grid .album-card').forEach(cardElement => {
    const track = tracks[Number(cardElement.dataset.index)];
    const filterMatches =
      activeFilter === 'all' ||
      activeFilter === track.genre ||
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

render();

$$('[data-play-index]').forEach(button => {
  button.addEventListener('click', () => playTrack(Number(button.dataset.playIndex)));
});

$$('[data-action]').forEach(button => {
  button.addEventListener('click', () => {
    const action = button.dataset.action;
    if (action === 'toggle') togglePlayback();
    else playTrack(currentIndex + (action === 'next' ? 1 : -1));
  });
});

$$('[data-view]').forEach(button => {
  button.addEventListener('click', () => switchView(button.dataset.view));
});

$$('[data-view-target]').forEach(element => {
  element.addEventListener('click', event => {
    event.preventDefault();
    switchView(element.dataset.viewTarget);
  });
});

$$('[data-filter]').forEach(button => {
  button.addEventListener('click', () => applyFilter(button.dataset.filter));
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
});

audio.addEventListener('play', () => updatePlayButtons(true));
audio.addEventListener('pause', () => updatePlayButtons(false));
audio.addEventListener('ended', () => playTrack(currentIndex + 1));

document.addEventListener('keydown', event => {
  const target = event.target;
  const typing = target instanceof HTMLInputElement || target instanceof HTMLSelectElement || target instanceof HTMLTextAreaElement;
  if (event.key === 'Escape') $('.sidebar').classList.remove('open');
  if ((event.key === 'Enter' || event.key === ' ') && target?.classList?.contains('current-track')) {
    event.preventDefault();
    switchView('lyrics');
  }
  if (event.code === 'Space' && !typing && !(target instanceof HTMLButtonElement) && !target?.classList?.contains('current-track')) {
    event.preventDefault();
    togglePlayback();
  }
});

selectTrack(0, false);
lyrics.hydrateSearchIndex();
