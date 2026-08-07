import { tracks } from '../core/catalog-store.js';
import { parentEditorialTag } from '../core/editorial-normalization.js';

const TECHNICAL_TAG = /(?:spotify\s*canva|spotify\s*canvas|canvas|technical|r2|webp|thumbnail)/i;
const STATUS_LABELS = new Set(['CLEAN', 'EXPLICIT', 'LYRICS', 'LYRICS SYNCED', 'VIDEO', 'UPCOMING', 'DRAFT']);

function canonical(value) {
  return String(value ?? '')
    .normalize('NFKC')
    .replace(/[\s_\u2010-\u2015\u2212-]+/g, ' ')
    .trim()
    .toLocaleLowerCase('en');
}

function trackForElement(element) {
  const candidates = [
    element.dataset.index,
    element.dataset.playIndex,
    element.dataset.albumDetailTrack,
    element.dataset.trackIndex
  ];
  for (const value of candidates) {
    const index = Number(value);
    if (Number.isInteger(index) && tracks[index]) return tracks[index];
  }
  const id = element.dataset.trackId || element.dataset.trackSlug || element.dataset.id;
  if (id) return tracks.find(track => track.id === id) || null;
  return null;
}

function statusBadges(track, { admin = false } = {}) {
  const statuses = [];
  const status = String(track.status || '').toLowerCase();
  if (track.explicit === true) statuses.push('EXPLICIT');
  else if (track.explicit === false) statuses.push('CLEAN');

  if (track.lyrics) {
    const synchronized = track.remoteMetadata?.timestampsAvailable === true || track.timestampsAvailable === true;
    statuses.push(synchronized ? 'LYRICS SYNCED' : 'LYRICS');
  }
  if (track.video) statuses.push('VIDEO');
  if (status === 'upcoming') statuses.push('UPCOMING');
  if (admin && status === 'draft') statuses.push('DRAFT');
  return [...new Set(statuses)];
}

function parentGenre(track) {
  const candidates = [track.genre, ...(Array.isArray(track.genres) ? track.genres : [])];
  for (const candidate of candidates) {
    const parent = parentEditorialTag(candidate);
    if (parent) return parent;
  }
  return String(track.genre || '').trim() || 'Electronic';
}

function secondaryTags(track, genre, statuses) {
  const source = [
    ...(Array.isArray(track.themes) ? track.themes : []),
    ...(Array.isArray(track.moods) ? track.moods : []),
    ...(Array.isArray(track.tags) ? track.tags : []),
    ...(Array.isArray(track.languages) ? track.languages : [])
  ];
  const blocked = new Set([canonical(genre), ...statuses.map(canonical), ...STATUS_LABELS].map(canonical));
  const seen = new Set();
  return source.filter(value => {
    const label = String(value || '').trim();
    const key = canonical(label);
    if (!key || seen.has(key) || blocked.has(key) || TECHNICAL_TAG.test(label)) return false;
    const parent = parentEditorialTag(label);
    if (parent && canonical(parent) === canonical(genre)) return false;
    seen.add(key);
    return true;
  });
}

function badge(label, level, modifier = '') {
  const span = document.createElement('span');
  span.className = `catalog-badge level-${level}${modifier ? ` ${modifier}` : ''}`;
  span.textContent = label;
  span.dataset.badgeLevel = String(level);
  return span;
}

function suppressLegacyBadges(element) {
  element.querySelectorAll([
    '.lyrics-card-badge',
    '.content-advisory-badge',
    '.track-detail-canvas-badge',
    '.lyrics-studio-canvas-badge',
    '.canvas-card-badge',
    '[data-technical-badge]'
  ].join(',')).forEach(node => {
    node.hidden = true;
    node.setAttribute('aria-hidden', 'true');
    node.dataset.badgeSuperseded = 'true';
  });
}

function hierarchyTarget(element) {
  if (element.matches('.album-card')) return element.querySelector('.cover-wrap')?.nextElementSibling || element;
  return element.querySelector('.album-detail-track-copy,.project-track-copy,.track-detail-copy') || element;
}

function renderHierarchy(element) {
  const track = trackForElement(element);
  if (!track) return;
  const signature = JSON.stringify([
    track.id, track.status, track.explicit, Boolean(track.lyrics), Boolean(track.video),
    track.remoteMetadata?.timestampsAvailable, track.genre, track.tags, track.moods, track.themes, track.languages
  ]);
  if (element.dataset.badgeHierarchySignature === signature) return;

  element.querySelector(':scope > .catalog-badge-hierarchy, .album-detail-track-copy > .catalog-badge-hierarchy, .project-track-copy > .catalog-badge-hierarchy, .track-detail-copy > .catalog-badge-hierarchy')?.remove();
  suppressLegacyBadges(element);

  const statuses = statusBadges(track);
  const genre = parentGenre(track);
  const secondary = secondaryTags(track, genre, statuses);
  const hierarchy = document.createElement('div');
  hierarchy.className = 'catalog-badge-hierarchy';
  hierarchy.setAttribute('aria-label', `Status, genre and tags for ${track.title}`);

  if (statuses.length) {
    const group = document.createElement('div');
    group.className = 'catalog-badge-level status-level';
    statuses.forEach(label => group.appendChild(badge(label, 1, `status-${canonical(label).replaceAll(' ', '-')}`)));
    hierarchy.appendChild(group);
  }

  const genreGroup = document.createElement('div');
  genreGroup.className = 'catalog-badge-level genre-level';
  genreGroup.appendChild(badge(genre, 2, 'genre-parent'));
  hierarchy.appendChild(genreGroup);

  if (secondary.length) {
    const tagGroup = document.createElement('div');
    tagGroup.className = 'catalog-badge-level tag-level';
    secondary.slice(0, 3).forEach(label => tagGroup.appendChild(badge(label, 3, 'secondary-tag')));
    if (secondary.length > 3) tagGroup.appendChild(badge(`+${secondary.length - 3}`, 3, 'secondary-overflow'));
    hierarchy.appendChild(tagGroup);
  }

  hierarchyTarget(element).insertAdjacentElement('afterend', hierarchy);
  element.dataset.badgeHierarchySignature = signature;
}

function hydrate(root = document) {
  const selector = '.album-card[data-index], .album-detail-track, .project-track, #view-track[data-local-track-theme] .track-detail-hero';
  if (root instanceof Element && root.matches(selector)) renderHierarchy(root);
  root.querySelectorAll?.(selector).forEach(renderHierarchy);
}

export function initBadgeHierarchy() {
  if (window.__shinobiBadgeHierarchyReady) return;
  window.__shinobiBadgeHierarchyReady = true;
  document.documentElement.dataset.badgeSystem = 'hierarchy-v1';
  hydrate(document);

  const pendingRoots = new Set();
  let scheduled = false;
  const scheduleHydration = root => {
    if (root instanceof Element) pendingRoots.add(root);
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      [...pendingRoots].forEach(hydrate);
      pendingRoots.clear();
    });
  };

  new MutationObserver(records => {
    records.forEach(record => record.addedNodes.forEach(node => {
      if (node instanceof Element) scheduleHydration(node);
    }));
  }).observe(document.body, { childList: true, subtree: true });

  window.addEventListener('shinobi:route-change', () => {
    hydrate(document.querySelector('.view.active') || document);
  });
}
