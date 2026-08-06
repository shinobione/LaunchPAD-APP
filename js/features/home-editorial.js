import { tracks } from '../core/catalog-store.js';
import { latestActiveTrackEntries } from '../core/catalog-ordering.js';
import { ensureStylesheet } from '../core/assets.js';
import { getTrackPalette } from '../core/theme.js';

const DEFAULT_VISUAL_MODE = 'neon-shatter';

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function formatReleaseDate(track) {
  const value = track.releaseDate || track.releasedAt || track.date;
  const timestamp = value ? Date.parse(value) : NaN;
  if (!Number.isFinite(timestamp)) return 'Release date unavailable';
  return new Intl.DateTimeFormat('en', {
    day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC'
  }).format(new Date(timestamp));
}

function quickLink(label, href, className = 'secondary') {
  return `<a class="${className}" href="${escapeHtml(href)}">${escapeHtml(label)}</a>`;
}

function renderOfficialRelease() {
  const home = document.querySelector('#view-home');
  const hero = home?.querySelector('.launchpad-hero');
  const entry = latestActiveTrackEntries(tracks, 1)[0];
  if (!home || !hero || !entry?.track) return null;

  const { track, index } = entry;
  const [accent, accent2] = getTrackPalette(track);
  let feature = home.querySelector('.home-official-release');
  if (!feature) {
    feature = document.createElement('section');
    feature.className = 'home-official-release';
    hero.insertAdjacentElement('afterend', feature);
  }
  feature.dataset.trackId = track.id;
  feature.style.setProperty('--release-accent', accent);
  feature.style.setProperty('--release-accent2', accent2);
  feature.style.setProperty('--release-cover', `url("${String(track.cover).replaceAll('"', '%22')}")`);
  feature.innerHTML = `
    <div class="home-release-aura" aria-hidden="true"></div>
    <a class="home-release-cover" href="#track=${encodeURIComponent(track.id)}" aria-label="Open ${escapeHtml(track.title)} details">
      <img src="${escapeHtml(track.cover)}" alt="Cover art for ${escapeHtml(track.title)}" loading="eager">
      <span>Latest official release</span>
    </a>
    <div class="home-release-copy">
      <span class="eyebrow">LATEST OFFICIAL RELEASE • ${escapeHtml(formatReleaseDate(track))}</span>
      <h2>${escapeHtml(track.title)}</h2>
      <p>${escapeHtml(track.genre)}${track.mood ? ` • ${escapeHtml(track.mood)}` : ''}</p>
      <div class="home-release-actions">
        <button type="button" class="primary home-release-play" data-play-index="${index}" aria-label="Play ${escapeHtml(track.title)}">
          <span aria-hidden="true">▶</span> Play release
        </button>
        ${quickLink('Track Detail', `#track=${encodeURIComponent(track.id)}`)}
        ${track.lyrics ? quickLink('Lyrics', `#lyrics=${encodeURIComponent(track.id)}`) : ''}
        ${track.video ? quickLink('Studio', `#studio=${encodeURIComponent(track.id)}`) : ''}
      </div>
    </div>`;
  return feature;
}

function visualButtons() {
  return [...document.querySelectorAll('.lab-controls [data-visual]')]
    .filter(button => !button.hidden && button.offsetParent !== null || button.isConnected);
}

function installVisualSwitcher() {
  const panel = document.querySelector('#view-home .now-panel');
  const canvas = panel?.querySelector('#home-visualizer');
  const heading = panel?.querySelector('.panel-head h3');
  if (!panel || !canvas || panel.querySelector('.home-visual-switcher')) return;

  panel.classList.add('has-visual-switcher');
  const switcher = document.createElement('div');
  switcher.className = 'home-visual-switcher';
  switcher.setAttribute('aria-label', 'Home visualizer controls');
  switcher.innerHTML = `
    <button type="button" class="home-visual-arrow previous" data-visual-direction="-1" aria-label="Previous visualizer">
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 18-6-6 6-6"/></svg>
    </button>
    <button type="button" class="home-visual-arrow next" data-visual-direction="1" aria-label="Next visualizer">
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>
    </button>`;
  canvas.insertAdjacentElement('afterend', switcher);

  const select = direction => {
    const buttons = visualButtons();
    if (!buttons.length) return;
    const activeIndex = Math.max(0, buttons.findIndex(button => button.classList.contains('active')));
    const nextIndex = (activeIndex + direction + buttons.length) % buttons.length;
    buttons[nextIndex].click();
  };

  switcher.addEventListener('click', event => {
    const button = event.target.closest('[data-visual-direction]');
    if (button) select(Number(button.dataset.visualDirection));
  });

  let touchStartX = null;
  canvas.addEventListener('touchstart', event => {
    touchStartX = event.changedTouches[0]?.clientX ?? null;
  }, { passive: true });
  canvas.addEventListener('touchend', event => {
    if (touchStartX === null) return;
    const endX = event.changedTouches[0]?.clientX ?? touchStartX;
    const delta = endX - touchStartX;
    touchStartX = null;
    if (Math.abs(delta) >= 38) select(delta < 0 ? 1 : -1);
  }, { passive: true });

  const update = ({ detail } = {}) => {
    const active = document.querySelector('.lab-controls [data-visual].active');
    const mode = detail?.mode || active?.dataset.visual || DEFAULT_VISUAL_MODE;
    const label = detail?.label || active?.textContent?.trim() || 'Neon Shatter';
    canvas.dataset.visualMode = mode;
    canvas.setAttribute('aria-label', `Live audio-reactive ${label} visualization`);
    if (heading) heading.textContent = label;
    panel.dataset.homeVisualMode = mode;
  };
  window.addEventListener('shinobi:visual-mode', update);

  const defaultButton = document.querySelector(`.lab-controls [data-visual="${DEFAULT_VISUAL_MODE}"]`);
  if (defaultButton && !defaultButton.classList.contains('active')) defaultButton.click();
  update();
}

function installMobileHeroOrder() {
  const hero = document.querySelector('#view-home .launchpad-hero');
  if (hero) hero.dataset.mobileHeaderOrder = 'wordmark-first';
}

export function initHomeEditorial() {
  if (window.__shinobiHomeEditorialReady) return;
  window.__shinobiHomeEditorialReady = true;
  ensureStylesheet('css/home-editorial.css');
  renderOfficialRelease();
  installVisualSwitcher();
  installMobileHeroOrder();

  window.addEventListener('shinobi:catalog-filtered', renderOfficialRelease);
  window.addEventListener('shinobi:ready', () => {
    renderOfficialRelease();
    installVisualSwitcher();
  });
}
