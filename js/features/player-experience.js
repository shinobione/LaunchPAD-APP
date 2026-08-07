import { getTrack, tracks } from '../core/catalog-store.js';

const SITE_TITLE = 'ShinoBiWan LaunchPAD';
const TOGGLE_SELECTOR = '[data-action="toggle"]';

function formatReleaseDate(value) {
  if (!value) return 'Date TBD';
  const date = new Date(`${value}T00:00:00`);
  if (!Number.isFinite(date.getTime())) return 'Date TBD';
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  }).format(date);
}

function explicitLabel(value) {
  if (value === true) return 'EXPLICIT';
  if (value === false) return 'CLEAN';
  return 'UNRATED';
}

function installStudioReliabilityStyles() {
  if (document.querySelector('#studio-reliability-styles')) return;
  const style = document.createElement('style');
  style.id = 'studio-reliability-styles';
  style.textContent = `
    [data-action="toggle"].is-loading{cursor:progress}
    @media(max-width:760px){
      #view-lyrics.lyrics-studio-mode .lyrics-track-select-label,
      #view-lyrics.lyrics-studio-mode .lyrics-track-select{display:none!important}
    }
  `;
  document.head.appendChild(style);
}

function setTextIfChanged(element, value) {
  if (element.textContent !== value) element.textContent = value;
}

function setAttributeIfChanged(element, name, value) {
  if (element.getAttribute(name) !== value) element.setAttribute(name, value);
}

function setClassIfChanged(element, className, active) {
  if (element.classList.contains(className) !== active) element.classList.toggle(className, active);
}

function setPlaybackDatasetIfChanged(button, state) {
  if (button.dataset.playbackState !== state) button.dataset.playbackState = state;
}

export function applyPlaybackState(root = document, playing = false) {
  const state = playing ? 'playing' : 'paused';
  const text = playing ? '❚❚' : '▶';
  const label = playing ? 'Pause' : 'Play';

  root.querySelectorAll(TOGGLE_SELECTOR).forEach(button => {
    setTextIfChanged(button, text);
    setClassIfChanged(button, 'is-playing', playing);
    setClassIfChanged(button, 'is-loading', false);
    setAttributeIfChanged(button, 'aria-label', label);
    setAttributeIfChanged(button, 'aria-pressed', String(playing));
    setPlaybackDatasetIfChanged(button, state);
  });
}

function applyLoadingState(root = document) {
  root.querySelectorAll(TOGGLE_SELECTOR).forEach(button => {
    setTextIfChanged(button, '…');
    setClassIfChanged(button, 'is-playing', false);
    setClassIfChanged(button, 'is-loading', true);
    setAttributeIfChanged(button, 'aria-label', 'Loading audio');
    setAttributeIfChanged(button, 'aria-pressed', 'true');
    setPlaybackDatasetIfChanged(button, 'loading');
  });
}

function installTrackDNA(panel) {
  panel.classList.add('track-dna-panel');
  panel.innerHTML = `
    <div class="panel-head track-dna-head">
      <div>
        <span class="eyebrow">CURRENT TRACK</span>
        <h3>Track DNA</h3>
      </div>
      <span class="pill" id="track-dna-explicit">UNRATED</span>
    </div>
    <div class="track-dna-title">
      <strong id="track-dna-title">—</strong>
      <span id="track-dna-album">—</span>
    </div>
    <div class="track-dna-grid" aria-label="Current track metadata">
      <div><span>BPM</span><strong id="track-dna-bpm">—</strong></div>
      <div><span>KEY</span><strong id="track-dna-key">—</strong></div>
      <div><span>LANGUAGE</span><strong id="track-dna-language">—</strong></div>
      <div><span>RELEASE</span><strong id="track-dna-date">Date TBD</strong></div>
    </div>
    <button type="button" class="text-button track-dna-album-link" id="track-dna-album-link">Open album →</button>
  `;
}

export function createPlayerExperience({ audio = document.querySelector('#audio') } = {}) {
  if (!audio) return { sync() {}, updateTrack() {} };

  installStudioReliabilityStyles();
  const panel = document.querySelector('.discovery-panel');
  if (panel) installTrackDNA(panel);

  let scheduled = false;
  let correctingTitle = false;

  function playingTrack() {
    return getTrack(audio.dataset.trackId) || null;
  }

  function expectedTitle() {
    const track = playingTrack();
    return track ? `${SITE_TITLE} — ${track.title}` : SITE_TITLE;
  }

  function syncDocumentTitle() {
    const expected = expectedTitle();
    if (document.title === expected) return;
    correctingTitle = true;
    document.title = expected;
    queueMicrotask(() => { correctingTitle = false; });
  }

  function isPlaying() {
    return !audio.paused && !audio.ended;
  }

  function sync() {
    scheduled = false;
    syncDocumentTitle();
    if (audio.dataset.playbackRequestState === 'starting') {
      applyLoadingState(document);
      return;
    }
    applyPlaybackState(document, isPlaying());
  }

  function scheduleSync() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(sync);
  }

  function updateTrack(track = playingTrack() || tracks[0]) {
    syncDocumentTitle();
    if (!track || !panel) return;

    const languages = Array.isArray(track.languages) && track.languages.length
      ? track.languages.join(' / ')
      : '—';

    panel.querySelector('#track-dna-title').textContent = track.title;
    panel.querySelector('#track-dna-album').textContent = track.album;
    panel.querySelector('#track-dna-bpm').textContent = Number.isFinite(track.bpm) ? String(track.bpm) : '—';
    panel.querySelector('#track-dna-key').textContent = track.key || '—';
    panel.querySelector('#track-dna-language').textContent = languages;
    panel.querySelector('#track-dna-date').textContent = formatReleaseDate(track.releaseDate);

    const explicit = panel.querySelector('#track-dna-explicit');
    explicit.textContent = explicitLabel(track.explicit);
    explicit.dataset.status = track.explicit === true
      ? 'explicit'
      : track.explicit === false ? 'clean' : 'unrated';

    const albumLink = panel.querySelector('#track-dna-album-link');
    albumLink.dataset.openAlbum = track.albumId;
    albumLink.setAttribute('aria-label', `Open ${track.album}`);
  }

  ['play', 'playing', 'waiting', 'stalled', 'pause', 'ended', 'emptied', 'abort', 'error', 'shinobi:audio-request-state'].forEach(type => {
    audio.addEventListener(type, scheduleSync);
  });

  const controlsObserver = new MutationObserver(records => {
    const addedToggleControl = records.some(record => [...record.addedNodes].some(node =>
      node instanceof Element && (node.matches?.(TOGGLE_SELECTOR) || node.querySelector?.(TOGGLE_SELECTOR))
    ));
    if (addedToggleControl) scheduleSync();
  });
  controlsObserver.observe(document.body, { childList: true, subtree: true });

  const titleElement = document.querySelector('title') || document.head.appendChild(document.createElement('title'));
  const titleObserver = new MutationObserver(() => {
    if (!correctingTitle) scheduleSync();
  });
  titleObserver.observe(titleElement, { childList: true, characterData: true, subtree: true });

  const trackObserver = new MutationObserver(() => {
    updateTrack();
    scheduleSync();
  });
  trackObserver.observe(audio, { attributes: true, attributeFilter: ['data-track-id'] });

  window.addEventListener('shinobi:route-change', scheduleSync);
  window.addEventListener('hashchange', scheduleSync);
  window.addEventListener('popstate', scheduleSync);

  updateTrack();
  sync();

  return { sync, updateTrack };
}
