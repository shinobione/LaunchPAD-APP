import { getAlbum, getAlbumTracks } from '../core/catalog-store.js';
import { shareRoute } from '../core/share.js';

const durationCache = new Map();
let durationHydrationId = 0;
const ALBUM_PALETTE_STYLE_ID = 'shinobi-album-palette-theme';

function normalizeAlbumThemeColor(value) {
  const color = String(value || '').trim().toLowerCase();
  if (/^#[0-9a-f]{6}$/i.test(color)) return color;
  if (/^#[0-9a-f]{3}$/i.test(color)) return `#${color.slice(1).split('').map(char => `${char}${char}`).join('')}`;
  return null;
}

function ensureAlbumPaletteStyles() {
  if (document.getElementById(ALBUM_PALETTE_STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = ALBUM_PALETTE_STYLE_ID;
  style.textContent = `
    .album-detail-view{--album-accent:var(--accent);--album-accent2:#8f58ff}
    .album-detail-view .album-detail-hero{border-color:color-mix(in srgb,var(--album-accent) 26%,rgba(255,255,255,.09));background:radial-gradient(circle at 18% 20%,color-mix(in srgb,var(--album-accent) 24%,transparent),transparent 34%),radial-gradient(circle at 84% 2%,color-mix(in srgb,var(--album-accent2) 18%,transparent),transparent 38%),linear-gradient(145deg,rgba(255,255,255,.05),rgba(255,255,255,.015));box-shadow:0 28px 80px rgba(0,0,0,.28),0 0 72px color-mix(in srgb,var(--album-accent2) 9%,transparent)}
    .album-detail-view .album-detail-cover{border:1px solid color-mix(in srgb,var(--album-accent) 24%,rgba(255,255,255,.08));box-shadow:0 30px 70px rgba(0,0,0,.48),0 0 42px color-mix(in srgb,var(--album-accent) 16%,transparent)}
    .album-detail-view .album-detail-copy .eyebrow{color:color-mix(in srgb,var(--album-accent) 82%,#fff)}
    .album-detail-view .album-detail-meta span{border-color:color-mix(in srgb,var(--album-accent2) 22%,rgba(255,255,255,.09));background:color-mix(in srgb,var(--album-accent2) 7%,rgba(255,255,255,.035))}
    .album-detail-view .album-detail-actions .primary{border-color:color-mix(in srgb,var(--album-accent) 48%,transparent);background:linear-gradient(135deg,color-mix(in srgb,var(--album-accent) 74%,#07040d),color-mix(in srgb,var(--album-accent2) 74%,#07040d));box-shadow:0 12px 34px color-mix(in srgb,var(--album-accent) 15%,transparent)}
    .album-detail-view .album-detail-actions .secondary{border-color:color-mix(in srgb,var(--album-accent2) 32%,rgba(255,255,255,.12));background:color-mix(in srgb,var(--album-accent2) 8%,rgba(255,255,255,.03))}
    .album-detail-view .album-detail-track:hover,.album-detail-view .album-detail-track.is-current{border-color:color-mix(in srgb,var(--album-accent) 42%,transparent);background:linear-gradient(90deg,color-mix(in srgb,var(--album-accent) 10%,transparent),color-mix(in srgb,var(--album-accent2) 6%,transparent))}
    .album-detail-view .album-detail-lyrics,.album-detail-view .album-detail-play{color:var(--album-accent)}
    .album-detail-view .album-detail-back{color:color-mix(in srgb,var(--album-accent2) 72%,#fff)}
  `;
  document.head.append(style);
}

function applyAlbumTheme(view, album) {
  const primary = normalizeAlbumThemeColor(album?.accent);
  const secondary = normalizeAlbumThemeColor(album?.accent2);
  if (primary) view.style.setProperty('--album-accent', primary);
  else view.style.removeProperty('--album-accent');
  if (secondary) view.style.setProperty('--album-accent2', secondary);
  else view.style.removeProperty('--album-accent2');
  view.dataset.albumPalette = primary || secondary ? 'canonical' : 'fallback';
}

function formatDuration(value) {
  if (!Number.isFinite(value) || value < 0) return '--:--';

  const totalSeconds = Math.round(value);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor(totalSeconds % 3600 / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }

  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

function readDuration(track) {
  if (Number.isFinite(track.duration) && track.duration > 0) {
    return Promise.resolve(track.duration);
  }

  if (durationCache.has(track.id)) return durationCache.get(track.id);

  const request = new Promise(resolve => {
    const probe = document.createElement('audio');
    probe.preload = 'metadata';
    let settled = false;

    const finish = value => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeout);
      probe.removeAttribute('src');
      probe.load();
      resolve(Number.isFinite(value) && value > 0 ? value : null);
    };

    const timeout = window.setTimeout(() => finish(null), 15000);
    probe.addEventListener('loadedmetadata', () => finish(probe.duration), { once: true });
    probe.addEventListener('error', () => finish(null), { once: true });
    probe.src = track.file;
    probe.load();
  });

  durationCache.set(track.id, request);
  return request;
}

function ensureView() {
  let view = document.querySelector('#view-album');
  if (view) return view;

  view = document.createElement('section');
  view.id = 'view-album';
  view.className = 'view album-detail-view';
  const main = document.querySelector('.main-content');
  const about = document.querySelector('#view-about');
  main?.insertBefore(view, about || null);
  return view;
}

export function createAlbumDetail({ escapeHtml, onPlayAlbum, onPlayTrack, onBack }) {
  ensureAlbumPaletteStyles();
  const view = ensureView();
  let currentAlbumId = null;

  async function hydrateDurations(albumId, albumTracks) {
    const hydrationId = ++durationHydrationId;

    const durations = await Promise.all(albumTracks.map(async track => {
      const duration = await readDuration(track);
      if (hydrationId !== durationHydrationId || currentAlbumId !== albumId) return duration;

      const target = view.querySelector(`[data-album-track-duration="${track.id}"]`);
      if (target) {
        target.textContent = formatDuration(duration);
        target.classList.toggle('unavailable', !Number.isFinite(duration));
        target.setAttribute(
          'aria-label',
          Number.isFinite(duration) ? `Duration ${formatDuration(duration)}` : 'Duration unavailable'
        );
      }
      return duration;
    }));

    if (hydrationId !== durationHydrationId || currentAlbumId !== albumId) return;

    const totalTarget = view.querySelector('[data-album-total-duration]');
    if (!totalTarget) return;

    const available = durations.filter(Number.isFinite);
    if (available.length === albumTracks.length) {
      totalTarget.textContent = `${formatDuration(available.reduce((sum, value) => sum + value, 0))} total`;
      totalTarget.classList.remove('unavailable');
    } else {
      totalTarget.textContent = 'Duration unavailable';
      totalTarget.classList.add('unavailable');
    }
  }

  function render(albumId) {
    const album = getAlbum(albumId);
    if (!album) return false;

    const albumTracks = getAlbumTracks(albumId);
    const tags = [...new Set(albumTracks.flatMap(track => track.tags || [track.genre]))];
    const lyricCount = albumTracks.filter(track => track.lyrics).length;
    currentAlbumId = albumId;
    applyAlbumTheme(view, album);

    view.innerHTML = `
      <button type="button" class="album-detail-back text-button" data-album-detail-action="back">← All albums</button>
      <article class="album-detail-hero">
        <img class="album-detail-cover" src="${escapeHtml(album.cover)}" alt="${escapeHtml(album.title)} cover">
        <div class="album-detail-copy">
          <span class="eyebrow">${escapeHtml(album.type === 'singles' ? 'COLLECTION' : 'ALBUM')} • ${escapeHtml(album.year || '')}</span>
          <h1>${escapeHtml(album.title)}</h1>
          <p>${escapeHtml(album.description || '')}</p>
          <div class="album-detail-meta">
            <span>${albumTracks.length} tracks</span>
            <span data-album-total-duration aria-live="polite">Loading duration…</span>
            <span>${lyricCount} lyric files</span>
            ${tags.map(tag => `<span>${escapeHtml(tag)}</span>`).join('')}
          </div>
          <div class="album-detail-actions">
            <button type="button" class="primary" data-album-detail-action="play">▶ Play album</button>
            <button type="button" class="secondary" data-album-detail-action="share">Share album ↗</button>
          </div>
        </div>
      </article>
      <div class="album-detail-tracks">
        ${albumTracks.map((track, index) => `
          <button type="button" class="album-detail-track" data-album-detail-track="${track.index}">
            <span class="album-detail-track-number">${String(index + 1).padStart(2, '0')}</span>
            <img src="${escapeHtml(track.cover)}" alt="" loading="lazy">
            <span class="album-detail-track-copy">
              <strong>${escapeHtml(track.title)}</strong>
              <small>
                ${escapeHtml(track.genre)} • ${escapeHtml(track.mood)}
                <span aria-hidden="true"> • </span>
                <span class="album-detail-duration" data-album-track-duration="${escapeHtml(track.id)}" aria-label="Duration loading">--:--</span>
              </small>
            </span>
            ${track.lyrics ? '<span class="album-detail-lyrics">LYRICS</span>' : '<span class="album-detail-lyrics" aria-hidden="true"></span>'}
            <span class="album-detail-play">▶</span>
          </button>
        `).join('')}
      </div>
    `;

    hydrateDurations(albumId, albumTracks);
    return true;
  }

  view.addEventListener('click', event => {
    const trackButton = event.target.closest('[data-album-detail-track]');
    if (trackButton) {
      onPlayTrack(Number(trackButton.dataset.albumDetailTrack), currentAlbumId);
      return;
    }

    const actionButton = event.target.closest('[data-album-detail-action]');
    if (!actionButton) return;
    const action = actionButton.dataset.albumDetailAction;

    if (action === 'back') onBack();
    if (action === 'play') onPlayAlbum(currentAlbumId);
    if (action === 'share') {
      const album = getAlbum(currentAlbumId);
      shareRoute({
        title: `${album.title} — SHINOBIWAN`,
        text: `Listen to ${album.title} on the SHINOBIWAN Launchpad.`,
        route: { type: 'album', id: currentAlbumId }
      });
    }
  });

  return { render, getCurrentAlbumId: () => currentAlbumId };
}
