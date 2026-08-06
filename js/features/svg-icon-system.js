const SVG_NS = 'http://www.w3.org/2000/svg';

const ICONS = Object.freeze({
  home: ['M3 11.5 12 4l9 7.5','M5.5 10.5V20h13v-9.5','M9.5 20v-6h5v6'],
  grid: ['M4 4h6v6H4z','M14 4h6v6h-6z','M4 14h6v6H4z','M14 14h6v6h-6z'],
  heart: ['M20.8 5.7a5.5 5.5 0 0 0-7.8 0L12 6.8l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 22l8.8-8.5a5.5 5.5 0 0 0 0-7.8Z'],
  lyrics: ['M5 5h14','M5 9h10','M5 13h14','M5 17h8','M17 15v5','M17 20a2 2 0 1 1-2-2'],
  albums: ['M5 4h14v16H5z','M8 8h8','M8 12h8','M8 16h5'],
  waveform: ['M3 12h3l2-7 3 14 3-10 2 6h5'],
  streaming: ['M5 8a10 10 0 0 1 14 0','M8 11a6 6 0 0 1 8 0','M12 15h.01'],
  info: ['M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z','M12 10v7','M12 7h.01'],
  menu: ['M4 7h16','M4 12h16','M4 17h16'],
  previous: ['M6 5v14','m18 6-8 6 8 6z'],
  play: ['m8 5 11 7-11 7z'],
  pause: ['M8 5h3v14H8z','M14 5h3v14h-3z'],
  next: ['M18 5v14','m6 6 8 6-8 6z'],
  search: ['M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16Z','m21 21-4.35-4.35'],
  filter: ['M4 6h16','M7 12h10','M10 18h4'],
  share: ['M18 8a3 3 0 1 0 0-6 3 3 0 0 0 0 0 6Z','M6 15a3 3 0 1 0 0-6 3 3 0 0 0 0 0 6Z','M18 22a3 3 0 1 0 0-6 3 3 0 0 0 0 0 6Z','m8.6 13.5 6.8-4','m-6.8 6 6.8 4'],
  back: ['m15 18-6-6 6-6','M9 12h11'],
  close: ['M6 6l12 12','M18 6 6 18'],
  video: ['M3 5h13v14H3z','m16 5 4 3v8l-4 3z'],
  player: ['M4 5h16v14H4z','m10 9 4 3-4 3z'],
  plus: ['M12 5v14','M5 12h14'],
  edit: ['M4 20h4l11-11-4-4L4 16v4Z','m13-13 4 4'],
  trash: ['M4 7h16','M9 7V4h6v3','m7 0-1 13H8L7 7','M10 11v5','M14 11v5'],
  upload: ['M12 16V4','m7 9 5-5 5 5','M5 20h14'],
  refresh: ['M20 11a8 8 0 0 0-14.9-4','M5 3v5h5','M4 13a8 8 0 0 0 14.9 4','M19 21v-5h-5'],
  palette: ['M12 3a9 9 0 1 0 0 18h1.5a2.5 2.5 0 0 0 0-5H12a2 2 0 0 1 0-4Z','M7.5 9h.01','M10 6.5h.01','M14 6.5h.01','M16.5 9h.01'],
  chevronLeft: ['m15 18-6-6 6-6'],
  chevronRight: ['m9 18 6-6-6-6']
});

const VIEW_ICONS = Object.freeze({
  home: 'home',
  library: 'grid',
  favorites: 'heart',
  lyrics: 'lyrics',
  analytics: 'albums',
  albums: 'albums',
  lab: 'waveform',
  streaming: 'streaming',
  about: 'info'
});

const ACTION_ICONS = Object.freeze({
  prev: 'previous',
  previous: 'previous',
  toggle: 'play',
  next: 'next',
  share: 'share',
  close: 'close',
  back: 'back'
});

function createIcon(name, className = 'ui-icon') {
  const paths = ICONS[name];
  if (!paths) return null;
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.classList.add(className);
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '1.8');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  paths.forEach(data => {
    const path = document.createElementNS(SVG_NS, 'path');
    path.setAttribute('d', data);
    svg.appendChild(path);
  });
  svg.dataset.icon = name;
  return svg;
}

function installIcon(target, name, { replace = true } = {}) {
  if (!target || !ICONS[name]) return false;
  const current = target.querySelector(':scope > svg.ui-icon');
  if (current?.dataset.icon === name) return false;
  const icon = createIcon(name);
  if (!icon) return false;
  if (replace) target.replaceChildren(icon);
  else target.prepend(icon);
  target.dataset.svgIcon = name;
  return true;
}

function labelFor(button) {
  if (button.getAttribute('aria-label')) return;
  const view = button.dataset.view || button.dataset.viewTarget;
  const action = button.dataset.action;
  const labels = {
    home: 'Home', library: 'Discography', favorites: 'Favorites', lyrics: 'Lyrics',
    analytics: 'Albums', albums: 'Albums', lab: 'Audio Lab', streaming: 'Streaming', about: 'About',
    prev: 'Previous track', previous: 'Previous track', toggle: 'Play or pause', next: 'Next track',
    share: 'Share', close: 'Close', back: 'Go back'
  };
  const label = labels[view] || labels[action];
  if (label) button.setAttribute('aria-label', label);
}

function iconizeNavigation(root = document) {
  root.querySelectorAll?.('.main-nav [data-view], .mobile-nav [data-view]').forEach(button => {
    const iconName = VIEW_ICONS[button.dataset.view];
    const slot = button.querySelector(':scope > span:first-child');
    if (iconName && slot) installIcon(slot, iconName);
    labelFor(button);
  });
}

function iconizeControls(root = document) {
  root.querySelectorAll?.('[data-action]').forEach(button => {
    if (button.querySelector('.mini-equalizer,.track-card-loader')) return;
    const action = button.dataset.action;
    const iconName = ACTION_ICONS[action];
    if (!iconName) return;
    const iconOnly = button.classList.contains('mini-play') || button.closest('.mini-controls') || button.matches('.icon-button,[data-icon-only]');
    installIcon(button, iconName, { replace: iconOnly });
    labelFor(button);
  });

  const direct = [
    ['#menu-button', 'menu', 'Open navigation'],
    ['[data-track-detail-back]', 'back', 'Back'],
    ['[data-album-detail-back]', 'back', 'Back to albums'],
    ['[data-share-track]', 'share', 'Share track'],
    ['[data-share-current]', 'share', 'Share current track'],
    ['[data-close]', 'close', 'Close'],
    ['.home-visual-arrow.previous', 'chevronLeft', 'Previous visualizer'],
    ['.home-visual-arrow.next', 'chevronRight', 'Next visualizer']
  ];
  direct.forEach(([selector, iconName, label]) => root.querySelectorAll?.(selector).forEach(button => {
    installIcon(button, iconName);
    if (!button.getAttribute('aria-label')) button.setAttribute('aria-label', label);
  }));

  root.querySelectorAll?.('.play-overlay').forEach(button => {
    if (button.querySelector('.mini-equalizer,.track-card-loader')) return;
    const paused = button.classList.contains('is-playing') || button.dataset.action === 'toggle';
    installIcon(button, paused ? 'pause' : 'play');
  });
}

function iconizeTextSymbols(root = document) {
  root.querySelectorAll?.('button, a').forEach(control => {
    if (control.dataset.svgIcon || control.querySelector(':scope > svg.ui-icon')) return;
    const text = control.textContent.trim();
    const map = new Map([
      ['▶', 'play'], ['⏸', 'pause'], ['⏮', 'previous'], ['⏭', 'next'],
      ['×', 'close'], ['✕', 'close'], ['←', 'back'], ['↗', 'share'], ['＋', 'plus']
    ]);
    const iconName = map.get(text);
    if (!iconName) return;
    installIcon(control, iconName);
  });
}

function hydrate(root = document) {
  iconizeNavigation(root);
  iconizeControls(root);
  iconizeTextSymbols(root);
}

export function initSvgIconSystem() {
  if (window.__shinobiSvgIconSystemReady) return;
  window.__shinobiSvgIconSystemReady = true;
  document.documentElement.dataset.iconSystem = 'svg-v1';
  hydrate(document);

  let scheduled = false;
  new MutationObserver(records => {
    if (!records.some(record => record.addedNodes.length || record.type === 'attributes')) return;
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      hydrate(document);
    });
  }).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'data-action', 'aria-expanded'] });

  window.addEventListener('shinobi:route-change', () => hydrate(document));
  window.addEventListener('shinobi:visual-mode', () => hydrate(document));
}
