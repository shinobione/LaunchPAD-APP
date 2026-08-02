import { tracks, getTrack, getTrackIndex, getAlbum } from '../core/catalog-store.js';
import { ensureStylesheet } from '../core/assets.js';
import { shareRoute } from '../core/share.js';

const TRACK_HASH_PREFIX = '#track=';
const TRACK_DETAIL_HISTORY_KEY = 'shinobiTrackDetail';

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function formatDuration(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return 'Unavailable';
  const total = Math.round(seconds);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor(total % 3600 / 60);
  const remaining = total % 60;
  return hours
    ? `${hours}:${String(minutes).padStart(2, '0')}:${String(remaining).padStart(2, '0')}`
    : `${minutes}:${String(remaining).padStart(2, '0')}`;
}

function formatReleaseDate(value) {
  if (!value) return 'Date TBD';
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return value;
  return new Intl.DateTimeFormat('en', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }).format(date);
}

function explicitLabel(value) {
  if (value === true) return 'Explicit';
  if (value === false) return 'Clean';
  return 'Unrated';
}

function explicitStatus(value) {
  if (value === true) return 'explicit';
  if (value === false) return 'clean';
  return 'unrated';
}

function ensureView() {
  let view = document.querySelector('#view-track');
  if (view) return view;

  view = document.createElement('section');
  view.id = 'view-track';
  view.className = 'view track-detail-view';
  view.tabIndex = -1;
  const main = document.querySelector('.main-content');
  const about = document.querySelector('#view-about');
  main?.insertBefore(view, about || null);
  return view;
}

function currentTrackFromHash() {
  if (!window.location.hash.startsWith(TRACK_HASH_PREFIX)) return null;
  const id = decodeURIComponent(window.location.hash.slice(TRACK_HASH_PREFIX.length));
  return getTrack(id);
}

function metadataItem(label, value, extra = '') {
  return `
    <div class="track-detail-data-item${extra ? ` ${extra}` : ''}">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(value)}</strong>
    </div>
  `;
}

function colorItem(label, color) {
  return `
    <div class="track-detail-data-item track-detail-color-item">
      <span>${escapeHtml(label)}</span>
      <strong><i style="--track-color:${escapeHtml(color)}" aria-hidden="true"></i>${escapeHtml(color)}</strong>
    </div>
  `;
}

function normaliseList(value) {
  return Array.isArray(value) ? value.filter(Boolean) : [];
}

function remoteSignalSection(track) {
  const metadata = track.remoteMetadata;
  if (!metadata) return '';

  const moods = normaliseList(metadata.moods);
  const themes = normaliseList(metadata.themes);
  const year = Number.isInteger(metadata.year) ? String(metadata.year) : 'Unknown';
  const type = metadata.type || 'Release';
  const era = metadata.era || 'Independent catalog';
  const energy = metadata.energy || 'Unspecified';
  const timedLyrics = metadata.timestampsAvailable ? 'Timestamped' : 'Not timestamped';

  return `
    <section class="track-detail-section track-detail-cloud-section" aria-labelledby="track-detail-cloud-heading">
      <div class="track-detail-section-head">
        <div>
          <span class="eyebrow">RELEASE CONTEXT</span>
          <h2 id="track-detail-cloud-heading">Release profile</h2>
        </div>
        <span class="pill track-detail-cloud-pill">CATALOG DATA</span>
      </div>

      <div class="track-detail-data-grid track-detail-cloud-grid">
        ${metadataItem('Release year', year)}
        ${metadataItem('Release type', type)}
        ${metadataItem('Era', era)}
        ${metadataItem('Energy', energy)}
        ${metadataItem('Lyrics timing', timedLyrics)}
      </div>

      ${moods.length || themes.length ? `
        <div class="track-detail-signal-groups">
          ${moods.length ? `
            <div class="track-detail-signal-group">
              <span>Moods</span>
              <div class="track-detail-signal-chips">
                ${moods.map(item => `<span>${escapeHtml(item)}</span>`).join('')}
              </div>
            </div>
          ` : ''}
          ${themes.length ? `
            <div class="track-detail-signal-group">
              <span>Themes</span>
              <div class="track-detail-signal-chips">
                ${themes.map(item => `<span>${escapeHtml(item)}</span>`).join('')}
              </div>
            </div>
          ` : ''}
        </div>
      ` : ''}
    </section>
  `;
}

export function initTrackDetail({ audio = document.querySelector('#audio') } = {}) {
  if (window.__shinobiTrackDetailReady) return;
  window.__shinobiTrackDetailReady = true;
  ensureStylesheet('css/track-detail.css');
  ensureStylesheet('css/r2-track-details.css');

  const view = ensureView();
  const coverPaths = new Map(tracks.map(track => [new URL(track.cover, window.location.href).pathname, track]));
  let returnHash = '#home';
  let currentTrackId = null;

  function trackForImage(image) {
    if (!(image instanceof HTMLImageElement)) return null;
    const src = image.getAttribute('src');
    if (!src) return null;
    try {
      return coverPaths.get(new URL(src, window.location.href).pathname) || null;
    } catch {
      return null;
    }
  }

  function decorateImage(image) {
    const track = trackForImage(image);
    if (!track || image.closest('#view-track')) {
      image?.removeAttribute?.('data-track-cover-link');
      return;
    }

    image.dataset.trackCoverLink = track.id;
    image.classList.add('track-cover-link');
    image.tabIndex = 0;
    image.setAttribute('role', 'link');
    image.setAttribute('aria-label', `Open details for ${track.title}`);
    image.title = `Open ${track.title}`;
  }

  function decorateCovers(root = document) {
    if (root instanceof HTMLImageElement) decorateImage(root);
    root.querySelectorAll?.('img').forEach(decorateImage);
  }

  function render(trackId) {
    const track = getTrack(trackId);
    if (!track) return false;
    const album = getAlbum(track.albumId);
    const index = getTrackIndex(track.id);
    const tags = Array.isArray(track.tags) ? track.tags : [track.genre].filter(Boolean);
    const languages = Array.isArray(track.languages) && track.languages.length
      ? track.languages.join(', ')
      : 'Unavailable';
    const lyricsLabel = track.lyrics ? 'Lyrics available' : 'Lyrics unavailable';
    const confidence = Number.isFinite(track.keyConfidence)
      ? `${Math.round(track.keyConfidence * 100)}% analysis confidence`
      : 'Unavailable';
    const isRemoteSignal = Boolean(track.remoteMetadata);
    const detailCover = track.fullCover || track.cover;

    currentTrackId = track.id;
    view.innerHTML = `
      <button type="button" class="track-detail-back text-button" data-track-detail-action="back">← Back</button>

      <article class="track-detail-hero${isRemoteSignal ? ' has-cloud-signal' : ''}">
        <div class="track-detail-artwork-shell">
          <img class="track-detail-cover" src="${escapeHtml(detailCover)}" alt="Cover art for ${escapeHtml(track.title)}">
          <span class="track-detail-status" data-status="${explicitStatus(track.explicit)}">${escapeHtml(explicitLabel(track.explicit))}</span>
        </div>

        <div class="track-detail-copy">
          <span class="eyebrow">TRACK • ${escapeHtml(album?.type === 'singles' ? 'SINGLE' : 'ALBUM CUT')}</span>
          <h1>${escapeHtml(track.title)}</h1>
          <p class="track-detail-summary">${escapeHtml(track.genre)} • ${escapeHtml(track.mood)}</p>
          <button type="button" class="track-detail-album-link text-button" data-open-album="${escapeHtml(track.albumId)}">
            From ${escapeHtml(album?.title || track.album)} →
          </button>

          <div class="track-detail-tags" aria-label="Track tags">
            ${tags.map(tag => `<span>${escapeHtml(tag)}</span>`).join('')}
          </div>

          <div class="track-detail-actions">
            <button type="button" class="primary" data-play-index="${index}">▶ Play track</button>
            ${track.lyrics ? '<button type="button" class="secondary" data-track-detail-route="lyrics">Open lyrics</button>' : ''}
            <button type="button" class="secondary" data-track-detail-action="share">Share track ↗</button>
          </div>
        </div>
      </article>

      ${remoteSignalSection(track)}

      <section class="track-detail-section" aria-labelledby="track-detail-dna-heading">
        <div class="track-detail-section-head">
          <div>
            <span class="eyebrow">FULL CATALOG DATA</span>
            <h2 id="track-detail-dna-heading">Track DNA</h2>
          </div>
          <span class="pill">${escapeHtml(track.id)}</span>
        </div>

        <div class="track-detail-data-grid">
          ${metadataItem('BPM', Number.isFinite(track.bpm) ? String(track.bpm) : 'Unavailable')}
          ${metadataItem('Key', track.key || 'Unavailable')}
          ${metadataItem('Key analysis', confidence)}
          ${metadataItem('Language', languages)}
          ${metadataItem('Genre', track.genre || 'Unavailable')}
          ${metadataItem('Mood', track.mood || 'Unavailable')}
          ${metadataItem('Project', album?.title || track.album || 'Unavailable')}
          ${metadataItem('Release date', formatReleaseDate(track.releaseDate))}
          ${metadataItem('Duration', formatDuration(track.duration))}
          ${metadataItem('Content rating', explicitLabel(track.explicit), `status-${explicitStatus(track.explicit)}`)}
          ${metadataItem('Lyrics', lyricsLabel)}
          ${metadataItem('Catalog ID', track.id)}
          ${colorItem('Primary accent', track.accent || '#a63cff')}
          ${colorItem('Secondary accent', track.accent2 || '#5c6cff')}
        </div>
      </section>
    `;

    document.querySelectorAll('.view').forEach(section => section.classList.toggle('active', section === view));
    document.querySelectorAll('[data-view]').forEach(button => button.classList.remove('active'));
    document.querySelector('.sidebar')?.classList.remove('open');
    window.scrollTo({ top: 0, behavior: 'auto' });
    view.focus({ preventScroll: true });
    document.title = `${track.title} — Track details — SHINOBIWAN`;
    return true;
  }

  function openRoute() {
    const track = currentTrackFromHash();
    if (!track) return;
    render(track.id);
  }

  function navigateToTrack(trackId) {
    if (!window.location.hash.startsWith(TRACK_HASH_PREFIX)) {
      returnHash = window.location.hash || '#home';
    }

    const target = `${TRACK_HASH_PREFIX}${encodeURIComponent(trackId)}`;
    if (window.location.hash === target) {
      render(trackId);
      return;
    }

    const currentState = window.history.state;
    const state = currentState && typeof currentState === 'object'
      ? { ...currentState, [TRACK_DETAIL_HISTORY_KEY]: true }
      : { [TRACK_DETAIL_HISTORY_KEY]: true };

    window.history.pushState(state, '', target);
    render(trackId);
  }

  document.addEventListener('click', event => {
    const cover = event.target.closest?.('img[data-track-cover-link]');
    if (cover) {
      event.preventDefault();
      event.stopImmediatePropagation();
      navigateToTrack(cover.dataset.trackCoverLink);
      return;
    }

    const action = event.target.closest?.('[data-track-detail-action]');
    if (action) {
      const type = action.dataset.trackDetailAction;
      if (type === 'back') {
        event.preventDefault();
        window.location.hash = returnHash.startsWith(TRACK_HASH_PREFIX) ? '#home' : returnHash;
      }
      if (type === 'share' && currentTrackId) {
        event.preventDefault();
        const track = getTrack(currentTrackId);
        shareRoute({
          title: `${track.title} — SHINOBIWAN`,
          text: `Explore ${track.title}, its tags and musical metadata on the SHINOBIWAN Launchpad.`,
          route: { type: 'track', id: track.id }
        });
      }
      return;
    }

    const route = event.target.closest?.('[data-track-detail-route="lyrics"]');
    if (route && currentTrackId) {
      event.preventDefault();
      window.location.hash = `#lyrics=${encodeURIComponent(currentTrackId)}`;
    }
  }, true);

  document.addEventListener('keydown', event => {
    const cover = event.target.closest?.('img[data-track-cover-link]');
    if (!cover || !['Enter', ' '].includes(event.key)) return;
    event.preventDefault();
    navigateToTrack(cover.dataset.trackCoverLink);
  });

  window.addEventListener('hashchange', openRoute);
  window.addEventListener('popstate', openRoute);

  const observer = new MutationObserver(records => {
    records.forEach(record => {
      if (record.type === 'attributes' && record.target instanceof HTMLImageElement) {
        decorateImage(record.target);
      }
      record.addedNodes.forEach(node => {
        if (node instanceof Element) decorateCovers(node);
      });
    });
  });
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['src']
  });

  decorateCovers();
  if (audio) {
    new MutationObserver(() => decorateCovers()).observe(audio, {
      attributes: true,
      attributeFilter: ['data-track-id']
    });
  }
  openRoute();
}
