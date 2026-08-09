import { tracks } from '../core/catalog-store.js';
import { ensureStylesheet } from '../core/assets.js';

const FILTER_GROUP_ORDER = ['genre', 'language', 'content', 'energy', 'era', 'type', 'media', 'year', 'mood'];
const ERA_PARAMETER = 'cf_era';
const ERA_QUEUE_PREFIX = 'era:';

function canonical(value) {
  return String(value ?? '')
    .normalize('NFKC')
    .replaceAll(/[\u00a0\u2007\u202f]/g, ' ')
    .replaceAll(/[\s_\u2010-\u2015\u2212-]+/g, ' ')
    .trim()
    .toLocaleLowerCase('en');
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function trackSignals(track) {
  const metadata = track?.remoteMetadata || {};
  const moods = [...new Set([
    ...(Array.isArray(track?.moods) ? track.moods : []),
    ...(Array.isArray(metadata.moods) ? metadata.moods : [])
  ].filter(Boolean))].slice(0, 3);
  const themes = [...new Set([
    ...(Array.isArray(track?.themes) ? track.themes : []),
    ...(Array.isArray(metadata.themes) ? metadata.themes : [])
  ].filter(Boolean))].slice(0, 3);
  return { moods, themes };
}

function signalGroup(label, values) {
  if (!values.length) return '';
  return `
    <div class="track-card-signal-group">
      <span>${escapeHtml(label)}</span>
      <div>${values.map(value => `<small>${escapeHtml(value)}</small>`).join('')}</div>
    </div>`;
}

function enrichCard(card) {
  const index = Number(card?.dataset?.index);
  const track = tracks[index];
  if (!track || card.dataset.discographySignals === track.id) return;
  card.querySelector(':scope > .track-card-signals')?.remove();
  const signals = trackSignals(track);
  if (!signals.moods.length && !signals.themes.length) {
    card.dataset.discographySignals = track.id;
    return;
  }

  const container = document.createElement('div');
  container.className = 'track-card-signals';
  container.setAttribute('aria-label', `Moods and themes for ${track.title}`);
  container.innerHTML = `${signalGroup('Moods', signals.moods)}${signalGroup('Themes', signals.themes)}`;
  card.appendChild(container);
  card.dataset.discographySignals = track.id;
}

function enrichCards(root = document) {
  if (root instanceof Element && root.matches('.album-card[data-index]')) enrichCard(root);
  root.querySelectorAll?.('.album-card[data-index]').forEach(enrichCard);
}

function orderFilterGroups() {
  const groupsRoot = document.querySelector('#view-library .catalog-filter-groups');
  if (!groupsRoot) return;
  const children = [...groupsRoot.querySelectorAll(':scope > [data-filter-group]')];
  const groups = new Map(children.map(group => [group.dataset.filterGroup, group]));
  const desired = FILTER_GROUP_ORDER.map(key => groups.get(key)).filter(Boolean);
  const current = children.map(group => group.dataset.filterGroup).join('|');
  const next = desired.map(group => group.dataset.filterGroup).join('|');
  if (current !== next) desired.forEach(group => groupsRoot.appendChild(group));
  groupsRoot.dataset.milestone5Order = FILTER_GROUP_ORDER.join(' ');
}

function erasFromCatalog() {
  const counts = new Map();
  tracks.forEach(track => {
    const era = track?.remoteMetadata?.era || track?.era;
    if (!era) return;
    const key = canonical(era);
    if (!key) return;
    const entry = counts.get(key) || { value: key, label: String(era).trim(), count: 0 };
    entry.count += 1;
    counts.set(key, entry);
  });
  return [...counts.values()].sort((left, right) => {
    if (left.label === 'My Tyffany Era') return -1;
    if (right.label === 'My Tyffany Era') return 1;
    return left.label.localeCompare(right.label, 'en', { sensitivity: 'base' });
  });
}

function currentEraValues() {
  const url = new URL(window.location.href);
  return new Set(url.searchParams.getAll(ERA_PARAMETER).map(canonical).filter(Boolean));
}

function eraQueueId(value) {
  const normalized = canonical(value);
  return normalized ? `${ERA_QUEUE_PREFIX}${encodeURIComponent(normalized)}` : null;
}

function selectedEraPlayback() {
  const selected = [...currentEraValues()];
  if (selected.length !== 1) return null;
  const value = selected[0];
  const contextId = eraQueueId(value);
  const indexes = tracks
    .map((track, index) => ({ track, index }))
    .filter(({ track }) => canonical(track?.remoteMetadata?.era || track?.era) === value)
    .map(({ index }) => index);
  if (!contextId || !indexes.length) return null;
  const era = erasFromCatalog().find(item => item.value === value);
  return { contextId, indexes, label: era?.label || value };
}

function synchronizeEraButtons(timeline) {
  const selected = currentEraValues();
  timeline.querySelectorAll('[data-era-value]').forEach(button => {
    const value = button.dataset.eraValue;
    const active = value === 'all' ? selected.size === 0 : selected.has(value);
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', String(active));
  });
}

function synchronizeEraPlayAction(timeline) {
  const button = timeline.querySelector('[data-era-play]');
  if (!button) return;
  const playback = selectedEraPlayback();
  if (!playback) {
    button.hidden = true;
    delete button.dataset.playIndex;
    delete button.dataset.albumContext;
    delete button.dataset.queueContext;
    return;
  }

  button.hidden = false;
  button.dataset.playIndex = String(playback.indexes[0]);
  button.dataset.albumContext = playback.contextId;
  button.dataset.queueContext = 'era';
  button.textContent = `▶ Play Era · ${playback.indexes.length}`;
  button.setAttribute('aria-label', `Play ${playback.label} as a ${playback.indexes.length}-track queue`);
}

function synchronizeEraPlaybackContext() {
  const selected = [...currentEraValues()];
  const selectedEra = selected.length === 1 ? selected[0] : null;
  const contextId = selectedEra ? eraQueueId(selectedEra) : null;

  document.querySelectorAll('#library-grid .album-card[data-index]').forEach(card => {
    const button = card.querySelector('.play-overlay[data-play-index]');
    if (!button) return;
    const track = tracks[Number(card.dataset.index)];
    const trackEra = canonical(track?.remoteMetadata?.era || track?.era);
    const belongsToEra = Boolean(contextId && selectedEra === trackEra);

    if (belongsToEra) {
      button.dataset.albumContext = contextId;
      button.dataset.queueContext = 'era';
    } else {
      delete button.dataset.albumContext;
      delete button.dataset.queueContext;
    }
  });
}

function clickEraFilter(value) {
  const options = [...document.querySelectorAll('[data-catalog-filter-category="era"]')];
  if (value === 'all') {
    options.filter(option => option.classList.contains('active')).forEach(option => option.click());
    return;
  }
  const target = options.find(option => canonical(option.dataset.catalogFilterValue) === value);
  if (target && !target.classList.contains('active')) target.click();
  options.filter(option => option !== target && option.classList.contains('active')).forEach(option => option.click());
}

function centerEraOnMobile(button) {
  if (!globalThis.matchMedia?.('(max-width: 760px)').matches) return;
  requestAnimationFrame(() => button.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' }));
}

function installEraTimeline() {
  const library = document.querySelector('#view-library');
  const filters = library?.querySelector('.catalog-filter-shell');
  if (!library || !filters) return null;

  const eras = erasFromCatalog();
  let timeline = library.querySelector('.era-timeline');
  if (!timeline) {
    timeline = document.createElement('section');
    timeline.className = 'era-timeline';
    timeline.setAttribute('aria-label', 'Filter discography by musical era');
    filters.insertAdjacentElement('beforebegin', timeline);
  }

  timeline.innerHTML = `
    <div class="era-timeline-heading">
      <div><span class="eyebrow">CATALOG JOURNEY</span><h2>Eras</h2></div>
      <div class="era-timeline-heading-side">
        <p>Choose an era to filter the discography instantly.</p>
        <button type="button" class="era-play-button" data-era-play hidden>▶ Play Era</button>
      </div>
    </div>
    <div class="era-timeline-track" role="list">
      <button type="button" class="era-timeline-item" data-era-value="all" aria-pressed="false" role="listitem">
        <i aria-hidden="true"></i><span>All eras</span><small>${tracks.length}</small>
      </button>
      ${eras.map(era => `
        <button type="button" class="era-timeline-item" data-era-value="${escapeHtml(era.value)}" aria-pressed="false" role="listitem">
          <i aria-hidden="true"></i><span>${escapeHtml(era.label)}</span><small>${era.count}</small>
        </button>`).join('')}
    </div>
    <div class="era-timeline-mobile-hint" aria-hidden="true"><span>Swipe to explore eras</span><b>→</b></div>`;

  timeline.addEventListener('click', event => {
    const button = event.target.closest('[data-era-value]');
    if (!button) return;
    clickEraFilter(button.dataset.eraValue);
    queueMicrotask(() => {
      synchronizeEraButtons(timeline);
      synchronizeEraPlayAction(timeline);
      synchronizeEraPlaybackContext();
      centerEraOnMobile(button);
    });
  });
  synchronizeEraButtons(timeline);
  synchronizeEraPlayAction(timeline);
  synchronizeEraPlaybackContext();
  return timeline;
}

function setOverlayState(button, state, track) {
  if (!button || button.dataset.cardAudioState === state) return;
  button.dataset.cardAudioState = state;
  const index = button.closest('.album-card')?.dataset.index;
  button.disabled = state === 'loading';
  button.classList.toggle('is-loading', state === 'loading');
  button.classList.toggle('is-playing', state === 'playing');
  button.classList.toggle('is-paused', state === 'paused');

  if (state === 'playing') {
    delete button.dataset.playIndex;
    button.dataset.action = 'toggle';
    button.setAttribute('aria-label', `Pause ${track.title}`);
    button.innerHTML = '<span class="mini-equalizer" aria-hidden="true"><i></i><i></i><i></i></span>';
    return;
  }

  delete button.dataset.action;
  if (index !== undefined) button.dataset.playIndex = index;
  button.setAttribute('aria-label', state === 'loading' ? `Loading ${track.title}` : `Listen to ${track.title}`);
  button.innerHTML = state === 'loading'
    ? '<span class="track-card-loader" aria-hidden="true"></span>'
    : '<span aria-hidden="true">▶</span>';
}

function synchronizeNowPlaying(audio, loading = false) {
  const currentId = audio?.dataset?.trackId || '';
  const playing = Boolean(currentId && !audio.paused && !audio.ended);
  document.querySelectorAll('.album-card[data-index]').forEach(card => {
    const track = tracks[Number(card.dataset.index)];
    const current = Boolean(track && track.id === currentId);
    card.classList.toggle('is-current', current);
    card.classList.toggle('is-audio-playing', current && playing);
    card.classList.toggle('is-audio-loading', current && loading);
    const button = card.querySelector('.play-overlay');
    const state = current && loading ? 'loading' : current && playing ? 'playing' : current ? 'paused' : 'idle';
    setOverlayState(button, state, track || { title: 'track' });
  });
}

function installNowPlaying(audio) {
  let loading = false;
  const sync = () => synchronizeNowPlaying(audio, loading);
  ['loadstart', 'waiting', 'stalled'].forEach(type => audio?.addEventListener(type, () => {
    loading = true;
    sync();
  }));
  ['canplay', 'playing', 'pause', 'ended', 'error', 'emptied'].forEach(type => audio?.addEventListener(type, () => {
    loading = false;
    sync();
  }));
  if (audio) new MutationObserver(sync).observe(audio, { attributes: true, attributeFilter: ['data-track-id', 'src'] });
  sync();
  return sync;
}

export function initDiscographyExperience({ audio = document.querySelector('#audio') } = {}) {
  if (window.__shinobiDiscographyExperienceReady) return;
  window.__shinobiDiscographyExperienceReady = true;
  ensureStylesheet('css/discography-experience.css');

  orderFilterGroups();
  const timeline = installEraTimeline();
  enrichCards();
  const syncPlaying = installNowPlaying(audio);

  window.addEventListener('shinobi:catalog-filtered', () => {
    orderFilterGroups();
    if (timeline) {
      synchronizeEraButtons(timeline);
      synchronizeEraPlayAction(timeline);
    }
    synchronizeEraPlaybackContext();
  });
  window.addEventListener('popstate', () => {
    if (timeline) {
      synchronizeEraButtons(timeline);
      synchronizeEraPlayAction(timeline);
    }
    synchronizeEraPlaybackContext();
  });

  const library = document.querySelector('#view-library');
  if (!library) return;

  let observerScheduled = false;
  const relevantSelector = '.album-card[data-index], .catalog-filter-groups, [data-filter-group]';
  const observer = new MutationObserver(records => {
    let relevant = false;
    records.forEach(record => record.addedNodes.forEach(node => {
      if (!(node instanceof Element)) return;
      enrichCards(node);
      if (node.matches?.(relevantSelector) || node.querySelector?.(relevantSelector)) relevant = true;
    }));
    if (!relevant || observerScheduled) return;
    observerScheduled = true;
    requestAnimationFrame(() => {
      observerScheduled = false;
      orderFilterGroups();
      if (timeline) synchronizeEraPlayAction(timeline);
      synchronizeEraPlaybackContext();
      syncPlaying();
    });
  });
  observer.observe(library, { childList: true, subtree: true });
}
