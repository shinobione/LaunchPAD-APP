import { ensureStylesheet } from '../../core/assets.js';

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

function installGoldenLogo() {
  const card = document.querySelector('#view-about .about-card');
  if (!card) return;

  card.querySelector('.about-golden-logo-wrap')?.remove();

  const wrapper = document.createElement('div');
  wrapper.className = 'about-golden-logo-wrap';

  const wordmark = document.createElement('div');
  wordmark.className = 'about-golden-wordmark';
  wordmark.setAttribute('role', 'img');
  wordmark.setAttribute('aria-label', 'SHINOBIWAN golden logo');

  wrapper.appendChild(wordmark);
  card.appendChild(wrapper);
}

export function initAboutEnhancements() {
  ensureStylesheet('css/about-enhancements.css');
  installAboutSocialCards();
  installGoldenLogo();
}
