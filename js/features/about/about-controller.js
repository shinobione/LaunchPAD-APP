import { ensureStylesheet } from '../../core/assets.js';

const ABOUT_MOBILE_QUERY = '(max-width:760px)';

function findAboutCopy(card) {
  return card?.querySelector(':scope > div:not(.about-golden-logo-wrap):not(.about-build-info)') || null;
}

function placeBuildInfo() {
  const card = document.querySelector('#view-about .about-card');
  const copy = findAboutCopy(card);
  const info = card?.querySelector('.about-build-info');
  const logo = card?.querySelector(':scope > .about-golden-logo-wrap');
  if (!card || !copy || !info) return;

  const mobile = globalThis.matchMedia?.(ABOUT_MOBILE_QUERY).matches === true;
  if (mobile && logo) logo.insertAdjacentElement('afterend', info);
  else copy.appendChild(info);
}

function installBuildInfoPlacementWatcher() {
  const card = document.querySelector('#view-about .about-card');
  const media = globalThis.matchMedia?.(ABOUT_MOBILE_QUERY);
  if (!card || !media || card.dataset.buildInfoPlacementWatcher === 'true') return;

  media.addEventListener?.('change', placeBuildInfo);
  card.dataset.buildInfoPlacementWatcher = 'true';
}

function installAboutSocialCards() {
  const actions = document.querySelector(
    '#view-about .about-card .hero-actions, #view-about .about-card .about-social-links'
  );
  const sourceCards = [...document.querySelectorAll('.social-dock .social-platform')];
  if (!actions || sourceCards.length === 0) return;

  actions.className = 'about-social-links';
  actions.setAttribute('aria-label', 'Official streaming profiles');
  actions.replaceChildren(...sourceCards.map(source => {
    const card = source.cloneNode(true);
    card.classList.add('about-social-platform');
    return card;
  }));
}

function installBuildInfo() {
  const card = document.querySelector('#view-about .about-card');
  const copy = findAboutCopy(card);
  if (!card || !copy) return;

  card.querySelector('.about-build-info')?.remove();
  const build = globalThis.SHINOBIWAN_BUILD || {};
  const info = document.createElement('div');
  info.className = 'about-build-info';
  info.setAttribute('aria-label', 'LaunchPAD application version and legal notice');

  const heading = document.createElement('strong');
  heading.textContent = 'LaunchPAD';

  const buildLine = document.createElement('span');
  buildLine.textContent = `Build ${build.display || build.id || 'development'}`;

  const cacheLine = document.createElement('span');
  cacheLine.textContent = `Release ${build.release || build.cache || 'development'}`;

  const legalNotice = document.createElement('small');
  legalNotice.className = 'about-legal-notice';
  legalNotice.textContent = `© ${new Date().getFullYear()} ShinoBiWan. All Rights Reserved. Proprietary code & design. Unauthorized copying, reproduction, or reverse engineering is strictly prohibited.`;

  info.append(heading, buildLine, cacheLine, legalNotice);
  copy.appendChild(info);
  placeBuildInfo();
}

function installSignatureArt() {
  const card = document.querySelector('#view-about .about-card');
  if (!card) return;

  card.querySelector('.about-golden-logo-wrap')?.remove();

  const wrapper = document.createElement('div');
  wrapper.className = 'about-golden-logo-wrap';

  const art = document.createElement('img');
  art.className = 'about-signature-art';
  art.src = 'assets/SHINOBIWAN_LaunchPAD_cinematic_loop.webp';
  art.width = 1254;
  art.height = 1254;
  art.loading = 'lazy';
  art.decoding = 'async';
  art.alt = 'Animated SHINOBIWAN moon emblem';

  wrapper.appendChild(art);
  card.appendChild(wrapper);
}

export function initAboutEnhancements() {
  ensureStylesheet('css/about-enhancements.css');
  installAboutSocialCards();
  installSignatureArt();
  installBuildInfo();
  installBuildInfoPlacementWatcher();
}
