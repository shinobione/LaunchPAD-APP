import { ensureStylesheet } from '../core/assets.js';
import { tracks as catalogTracks } from '../core/catalog-store.js';

export const CATALOG_FILTER_VERSION = '09';

const URL_PREFIX = 'cf_';
const FILTER_CATEGORIES = [
  'era',
  'energy',
  'mood',
  'genre',
  'language',
  'type',
  'canvas',
  'lyrics',
  'synced',
  'content',
  'year'
];

const VALUE_LABELS = new Map([
  ['single', 'Single'],
  ['album-track', 'Album track'],
  ['ep-track', 'EP track'],
  ['with-canvas', 'With Canvas'],
  ['with-lyrics', 'With lyrics'],
  ['synchronized', 'Synchronized lyrics'],
  ['explicit', 'Explicit'],
  ['clean', 'Clean']
]);

const GROUPS = [
  { key: 'era', label: 'Era', categories: ['era'] },
  { key: 'energy', label: 'Energy', categories: ['energy'] },
  { key: 'mood', label: 'Mood', categories: ['mood'] },
  { key: 'genre', label: 'Genre', categories: ['genre'] },
  { key: 'language', label: 'Language', categories: ['language'] },
  { key: 'type', label: 'Release type', categories: ['type'] },
  { key: 'media', label: 'Media', categories: ['canvas', 'lyrics', 'synced'] },
  { key: 'content', label: 'Content', categories: ['content'] },
  { key: 'year', label: 'Year', categories: ['year'] }
];

function cleanValue(value) {
  const normalized = String(value ?? '').trim();
  return normalized || null;
}

function cleanValues(values) {
  const source = Array.isArray(values) ? values : [values];
  return [...new Set(source.map(cleanValue).filter(Boolean))];
}

function titleCase(value) {
  return String(value)
    .replaceAll('-', ' ')
    .replace(/\b\w/g, letter => letter.toUpperCase());
}

export function filterValueLabel(value) {
  return VALUE_LABELS.get(value) || titleCase(value);
}

export function createEmptyCatalogFilterState() {
  return Object.fromEntries(FILTER_CATEGORIES.map(category => [category, new Set()]));
}

export function cloneCatalogFilterState(state) {
  const clone = createEmptyCatalogFilterState();
  FILTER_CATEGORIES.forEach(category => {
    for (const value of state?.[category] || []) clone[category].add(value);
  });
  return clone;
}

export function catalogTrackFacets(track) {
  const metadata = track?.remoteMetadata || {};
  const timestamped = Boolean(track?.lyrics && metadata.timestampsAvailable === true);

  return {
    era: cleanValues(metadata.era),
    energy: cleanValues(metadata.energy),
    mood: cleanValues(metadata.moods),
    genre: cleanValues(metadata.genres?.length ? metadata.genres : track?.genre),
    language: cleanValues(track?.languages),
    type: cleanValues(metadata.type),
    canvas: track?.video ? ['with-canvas'] : [],
    lyrics: track?.lyrics ? ['with-lyrics'] : [],
    synced: timestamped ? ['synchronized'] : [],
    content: track?.explicit === true
      ? ['explicit']
      : track?.explicit === false
        ? ['clean']
        : [],
    year: cleanValues(metadata.year)
  };
}

export function buildEditorialCatalogIndex(tracks = []) {
  return tracks.map((track, index) => {
    const entry = {
      index,
      track,
      facets: catalogTrackFacets(track)
    };
    Object.defineProperty(entry, 'searchText', {
      enumerable: true,
      get: () => String(track?.searchText || '').toLowerCase()
    });
    return entry;
  });
}

export function countActiveCatalogFilters(state) {
  return FILTER_CATEGORIES.reduce((total, category) => total + (state?.[category]?.size || 0), 0);
}

export function trackMatchesEditorialFilters(entry, state) {
  return FILTER_CATEGORIES.every(category => {
    const selected = state?.[category];
    if (!selected?.size) return true;
    const values = entry?.facets?.[category] || [];
    return values.some(value => selected.has(value));
  });
}

export function readCatalogFilterStateFromUrl(input = globalThis.location?.href || 'https://launchpad.invalid/') {
  const url = input instanceof URL ? input : new URL(input, 'https://launchpad.invalid/');
  const state = createEmptyCatalogFilterState();
  FILTER_CATEGORIES.forEach(category => {
    url.searchParams.getAll(`${URL_PREFIX}${category}`)
      .map(cleanValue)
      .filter(Boolean)
      .forEach(value => state[category].add(value));
  });
  return state;
}

export function writeCatalogFilterStateToUrl(state, {
  location = globalThis.location,
  history = globalThis.history
} = {}) {
  if (!location?.href || !history?.replaceState) return;
  const url = new URL(location.href);
  FILTER_CATEGORIES.forEach(category => {
    url.searchParams.delete(`${URL_PREFIX}${category}`);
    [...(state?.[category] || [])]
      .sort((left, right) => left.localeCompare(right, 'en', { sensitivity: 'base' }))
      .forEach(value => url.searchParams.append(`${URL_PREFIX}${category}`, value));
  });
  history.replaceState(history.state, '', url);
}

function collectOptions(index) {
  const options = Object.fromEntries(FILTER_CATEGORIES.map(category => [category, new Map()]));
  index.forEach(entry => {
    FILTER_CATEGORIES.forEach(category => {
      entry.facets[category].forEach(value => {
        options[category].set(value, (options[category].get(value) || 0) + 1);
      });
    });
  });
  return options;
}

function sortedOptions(category, values) {
  const entries = [...values.entries()];
  if (category === 'year') return entries.sort((a, b) => Number(b[0]) - Number(a[0]));
  const preferred = ['with-canvas', 'with-lyrics', 'synchronized', 'clean', 'explicit'];
  return entries.sort((a, b) => {
    const aIndex = preferred.indexOf(a[0]);
    const bIndex = preferred.indexOf(b[0]);
    if (aIndex >= 0 || bIndex >= 0) {
      if (aIndex < 0) return 1;
      if (bIndex < 0) return -1;
      return aIndex - bIndex;
    }
    return filterValueLabel(a[0]).localeCompare(filterValueLabel(b[0]), 'en', { sensitivity: 'base' });
  });
}

function sanitizeState(state, options) {
  FILTER_CATEGORIES.forEach(category => {
    for (const value of state[category]) {
      if (!options[category].has(value)) state[category].delete(value);
    }
  });
  return state;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function optionMarkup(category, value, count, state) {
  const active = state[category].has(value);
  return `
    <button type="button" class="catalog-filter-option${active ? ' active' : ''}"
      data-catalog-filter-category="${escapeHtml(category)}"
      data-catalog-filter-value="${escapeHtml(value)}"
      aria-pressed="${active}">
      <span>${escapeHtml(filterValueLabel(value))}</span><small>${count}</small>
    </button>
  `;
}

function groupMarkup(group, options, state) {
  const available = group.categories.flatMap(category =>
    sortedOptions(category, options[category]).map(([value, count]) => ({ category, value, count }))
  );
  if (!available.length) return '';
  return `
    <fieldset class="catalog-filter-group" data-filter-group="${escapeHtml(group.key)}">
      <legend>${escapeHtml(group.label)}</legend>
      <div class="catalog-filter-options">
        ${available.map(option => optionMarkup(option.category, option.value, option.count, state)).join('')}
      </div>
    </fieldset>
  `;
}

function createFilterShell(options, state, total) {
  const shell = document.createElement('section');
  shell.className = 'catalog-filter-shell';
  shell.dataset.feature = '09';
  shell.innerHTML = `
    <div class="catalog-filter-toolbar">
      <button type="button" class="catalog-filter-toggle" aria-expanded="false" aria-controls="catalog-filter-panel">
        <span aria-hidden="true">☷</span> Filters <b data-filter-count hidden>0</b>
      </button>
      <div class="catalog-filter-result" aria-live="polite">
        <strong data-result-count>${total} tracks</strong><small>R2 catalog</small>
      </div>
      <button type="button" class="catalog-filter-reset" hidden>Reset filters</button>
    </div>
    <div class="catalog-active-filters" aria-label="Active catalog filters" hidden></div>
    <div class="catalog-filter-backdrop" hidden></div>
    <div class="catalog-filter-panel" id="catalog-filter-panel" hidden>
      <div class="catalog-filter-panel-head">
        <div><span class="eyebrow">FEATURE ${CATALOG_FILTER_VERSION}</span><h2>Editorial filters</h2></div>
        <button type="button" class="catalog-filter-close" aria-label="Close filters">×</button>
      </div>
      <p class="catalog-filter-help">Choose several values. Options inside one category are combined with OR; categories are combined with AND.</p>
      <div class="catalog-filter-groups">
        ${GROUPS.map(group => groupMarkup(group, options, state)).join('')}
      </div>
    </div>
  `;
  return shell;
}

export function initCatalogFilters({ tracks = catalogTracks } = {}) {
  ensureStylesheet('css/catalog-filters.css');

  const libraryView = document.querySelector('#view-library');
  const legacyRow = libraryView?.querySelector('.filter-row');
  const grid = document.querySelector('#library-grid');
  const search = document.querySelector('#search');
  const empty = document.querySelector('#library-empty');
  const searchStatus = document.querySelector('#search-status');
  if (!libraryView || !legacyRow || !grid) return null;

  const index = buildEditorialCatalogIndex(tracks);
  const entryByIndex = new Map(index.map(entry => [entry.index, entry]));
  const options = collectOptions(index);
  let state = sanitizeState(readCatalogFilterStateFromUrl(), options);
  const shell = createFilterShell(options, state, index.length);
  legacyRow.replaceWith(shell);

  const panel = shell.querySelector('.catalog-filter-panel');
  const backdrop = shell.querySelector('.catalog-filter-backdrop');
  const toggle = shell.querySelector('.catalog-filter-toggle');
  const close = shell.querySelector('.catalog-filter-close');
  const reset = shell.querySelector('.catalog-filter-reset');
  const activeContainer = shell.querySelector('.catalog-active-filters');
  const resultCount = shell.querySelector('[data-result-count]');
  const filterCount = shell.querySelector('[data-filter-count]');

  function setPanelOpen(open) {
    panel.hidden = !open;
    backdrop.hidden = !open;
    toggle.setAttribute('aria-expanded', String(open));
    document.documentElement.classList.toggle('catalog-filters-open', open);
    if (open && globalThis.matchMedia?.('(max-width: 760px)').matches) {
      close.focus({ preventScroll: true });
    }
  }

  function renderSelection() {
    const active = [];
    FILTER_CATEGORIES.forEach(category => {
      [...state[category]].forEach(value => active.push({ category, value }));
    });

    shell.querySelectorAll('[data-catalog-filter-category]').forEach(button => {
      const category = button.dataset.catalogFilterCategory;
      const value = button.dataset.catalogFilterValue;
      const selected = state[category]?.has(value) || false;
      button.classList.toggle('active', selected);
      button.setAttribute('aria-pressed', String(selected));
    });

    activeContainer.innerHTML = active.map(({ category, value }) => `
      <button type="button" class="catalog-active-chip"
        data-remove-filter-category="${escapeHtml(category)}"
        data-remove-filter-value="${escapeHtml(value)}">
        <span>${escapeHtml(filterValueLabel(value))}</span><b aria-hidden="true">×</b>
      </button>
    `).join('');
    activeContainer.hidden = active.length === 0;
    reset.hidden = active.length === 0;
    filterCount.hidden = active.length === 0;
    filterCount.textContent = String(active.length);
  }

  let observer;
  let scheduled = false;
  function scheduleApply() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      applyFilters();
    });
  }

  function applyFilters({ persist = true } = {}) {
    observer?.disconnect();
    const query = String(search?.value || '').trim().toLowerCase();
    let visible = 0;

    grid.querySelectorAll('.album-card[data-index]').forEach(card => {
      const entry = entryByIndex.get(Number(card.dataset.index));
      const editorialMatch = entry ? trackMatchesEditorialFilters(entry, state) : false;
      const queryMatch = !query || entry?.searchText.includes(query);
      const shouldShow = Boolean(editorialMatch && queryMatch);
      if (card.hidden === shouldShow) card.hidden = !shouldShow;
      if (shouldShow) visible += 1;
    });

    const activeCount = countActiveCatalogFilters(state);
    resultCount.textContent = activeCount || query
      ? `${visible} of ${index.length} track${index.length === 1 ? '' : 's'}`
      : `${index.length} track${index.length === 1 ? '' : 's'}`;

    if (empty) {
      empty.hidden = visible !== 0;
      empty.textContent = activeCount
        ? 'No tracks match this filter combination. Remove one or more editorial filters and try again.'
        : 'No tracks match this search.';
    }

    if (searchStatus) {
      searchStatus.textContent = query
        ? `${visible} result${visible === 1 ? '' : 's'} with current filters`
        : '';
    }

    renderSelection();
    if (persist) writeCatalogFilterStateToUrl(state);
    window.dispatchEvent(new CustomEvent('shinobi:catalog-filtered', {
      detail: { visible, total: index.length, activeFilters: activeCount }
    }));

    observer?.observe(grid, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ['hidden']
    });
  }

  observer = new MutationObserver(scheduleApply);
  observer.observe(grid, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: ['hidden']
  });

  shell.addEventListener('click', event => {
    const option = event.target.closest('[data-catalog-filter-category]');
    if (option) {
      const category = option.dataset.catalogFilterCategory;
      const value = option.dataset.catalogFilterValue;
      if (state[category].has(value)) state[category].delete(value);
      else state[category].add(value);
      applyFilters();
      return;
    }

    const remove = event.target.closest('[data-remove-filter-category]');
    if (remove) {
      state[remove.dataset.removeFilterCategory]?.delete(remove.dataset.removeFilterValue);
      applyFilters();
      return;
    }

    if (event.target.closest('.catalog-filter-toggle')) setPanelOpen(panel.hidden);
    if (event.target.closest('.catalog-filter-close') || event.target.closest('.catalog-filter-backdrop')) setPanelOpen(false);
    if (event.target.closest('.catalog-filter-reset')) {
      state = createEmptyCatalogFilterState();
      applyFilters();
    }
  });

  search?.addEventListener('input', scheduleApply);
  window.addEventListener('popstate', () => {
    state = sanitizeState(readCatalogFilterStateFromUrl(), options);
    applyFilters({ persist: false });
  });
  window.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !panel.hidden) setPanelOpen(false);
  });

  applyFilters({ persist: false });

  return {
    apply: applyFilters,
    reset() {
      state = createEmptyCatalogFilterState();
      applyFilters();
    },
    getState: () => cloneCatalogFilterState(state),
    destroy() {
      observer.disconnect();
      shell.remove();
    }
  };
}
