import { tracks } from '../core/catalog-store.js';

const MEMORY_STORAGE_KEY = 'shinobi-launchpad-memory-v1';
const SUMMARY_STORAGE_KEY = 'shinobi-launchpad-listening-summary-v1';
const validTrackIds = new Set(tracks.map(track => track.id));

function readJson(key) {
  try {
    return JSON.parse(localStorage.getItem(key) || '{}');
  } catch {
    return {};
  }
}

function writeJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Private browsing and storage policies can disable localStorage.
  }
}

function validUniqueIds(values) {
  return [...new Set(
    (Array.isArray(values) ? values : []).filter(id => validTrackIds.has(id))
  )];
}

function initialState() {
  const memory = readJson(MEMORY_STORAGE_KEY);
  const stored = readJson(SUMMARY_STORAGE_KEY);
  return {
    playedTrackIds: validUniqueIds([
      ...(Array.isArray(stored.playedTrackIds) ? stored.playedTrackIds : []),
      ...(Array.isArray(memory.history) ? memory.history : [])
    ])
  };
}

export function initListeningHistorySummary({ audio = document.querySelector('#audio') } = {}) {
  if (!audio || window.__shinobiListeningHistorySummaryReady) return;
  window.__shinobiListeningHistorySummaryReady = true;

  const state = initialState();
  let updateTimer = null;

  function save() {
    writeJson(SUMMARY_STORAGE_KEY, state);
  }

  function updateSummary() {
    const summary = document.querySelector('#view-favorites .memory-summary');
    const pills = summary?.querySelectorAll('span');
    const historyPill = pills?.[1];
    if (!historyPill) return;

    const count = state.playedTrackIds.length;
    if (historyPill.dataset.playedCount !== String(count)) {
      const strong = document.createElement('strong');
      strong.textContent = String(count);
      historyPill.replaceChildren(
        strong,
        document.createTextNode(` track${count === 1 ? '' : 's'} played`)
      );
      historyPill.dataset.playedCount = String(count);
    }

    const favoriteCount = pills?.[0]?.querySelector('strong')?.textContent || '0';
    summary.setAttribute(
      'aria-label',
      `${favoriteCount} favorites and ${count} tracks played locally`
    );
  }

  function scheduleUpdate() {
    window.clearTimeout(updateTimer);
    updateTimer = window.setTimeout(updateSummary, 0);
  }

  function recordCurrentTrack() {
    const trackId = audio.dataset.trackId;
    if (!validTrackIds.has(trackId) || state.playedTrackIds.includes(trackId)) {
      scheduleUpdate();
      return;
    }

    state.playedTrackIds.push(trackId);
    save();
    scheduleUpdate();
  }

  function clearSummary() {
    state.playedTrackIds = [];
    save();
    scheduleUpdate();
  }

  audio.addEventListener('play', recordCurrentTrack);
  document.addEventListener('click', event => {
    if (event.target.closest?.('[data-memory-action="clear-history"]')) clearSummary();
  }, true);

  const favoritesView = document.querySelector('#view-favorites');
  if (favoritesView) {
    new MutationObserver(scheduleUpdate).observe(favoritesView, { childList: true, subtree: true });
  }

  save();
  scheduleUpdate();

  window.__shinobiListeningHistorySummary = {
    getState: () => ({ playedTrackIds: [...state.playedTrackIds] }),
    clear: clearSummary
  };
}
