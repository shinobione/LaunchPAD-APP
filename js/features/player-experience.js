import { getTrack, tracks } from '../core/catalog-store.js';

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

export function applyPlaybackState(root = document, playing = false) {
  root.querySelectorAll('[data-action="toggle"]').forEach(button => {
    button.textContent = playing ? '❚❚' : '▶';
    button.classList.toggle('is-playing', playing);
    button.classList.remove('is-loading');
    button.setAttribute('aria-label', playing ? 'Pause' : 'Play');
    button.setAttribute('aria-pressed', String(playing));
    button.dataset.playbackState = playing ? 'playing' : 'paused';
  });
}

function applyLoadingState(root = document) {
  root.querySelectorAll('[data-action="toggle"]').forEach(button => {
    button.textContent = '…';
    button.classList.remove('is-playing');
    button.classList.add('is-loading');
    button.setAttribute('aria-label', 'Loading audio');
    button.setAttribute('aria-pressed', 'true');
    button.dataset.playbackState = 'loading';
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

  const panel = document.querySelector('.discovery-panel');
  if (panel) installTrackDNA(panel);

  let scheduled = false;

  function isPlaying() {
    return !audio.paused && !audio.ended;
  }

  function sync() {
    scheduled = false;
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

  function updateTrack(track = getTrack(audio.dataset.trackId) || tracks[0]) {
    if (!track) {
      document.title = 'ShinoBiWan LaunchPAD';
      return;
    }

    document.title = `ShinoBiWan LaunchPAD — ${track.title}`;
    if (!panel) return;

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
    if (records.some(record => record.addedNodes.length || record.removedNodes.length)) scheduleSync();
  });
  controlsObserver.observe(document.body, { childList: true, subtree: true });

  const trackObserver = new MutationObserver(() => {
    updateTrack();
    scheduleSync();
  });
  trackObserver.observe(audio, { attributes: true, attributeFilter: ['data-track-id'] });

  updateTrack();
  sync();

  return { sync, updateTrack };
}
