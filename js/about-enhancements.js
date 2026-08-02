function ensureStylesheet() {
  const href = 'css/about-enhancements.css?v=20260802-1';
  if (document.querySelector(`link[href="${href}"]`)) return;

  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = href;
  document.head.appendChild(link);
}

function installAboutSocialCards() {
  const actions = document.querySelector('#view-about .about-card .hero-actions, #view-about .about-card .about-social-links');
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

function processGoldenLogo(canvas) {
  const image = new Image();
  image.decoding = 'async';

  image.addEventListener('load', () => {
    /* Crop the useful artwork before processing so the logo fills its column. */
    const sourceX = 145;
    const sourceY = 105;
    const sourceWidth = 1090;
    const sourceHeight = 535;
    const outputWidth = 900;
    const outputHeight = Math.round(outputWidth * sourceHeight / sourceWidth);

    canvas.width = outputWidth;
    canvas.height = outputHeight;

    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) return;

    context.clearRect(0, 0, outputWidth, outputHeight);
    context.drawImage(
      image,
      sourceX,
      sourceY,
      sourceWidth,
      sourceHeight,
      0,
      0,
      outputWidth,
      outputHeight
    );

    const pixels = context.getImageData(0, 0, outputWidth, outputHeight);
    const data = pixels.data;

    for (let index = 0; index < data.length; index += 4) {
      const red = data[index] / 255;
      const green = data[index + 1] / 255;
      const blue = data[index + 2] / 255;
      const chroma = Math.max(red, green, blue) - Math.min(red, green, blue);

      /* Neutral white/grey checkerboard pixels have almost no chroma.
         Gold, copper and red pixels keep their original colour and opacity. */
      const alpha = Math.max(0, Math.min(1, (chroma - 0.025) * 10));
      data[index + 3] = Math.round(alpha * 255);
    }

    context.putImageData(pixels, 0, 0);
    canvas.classList.add('is-ready');
  }, { once: true });

  image.addEventListener('error', () => {
    canvas.closest('.about-golden-logo-wrap')?.remove();
  }, { once: true });

  image.src = 'assets/ShinoBiWan-Golden-LOGO.png?v=20260802-2';
}

function installGoldenLogo() {
  const card = document.querySelector('#view-about .about-card');
  if (!card) return;

  card.querySelector('.about-golden-logo-wrap')?.remove();

  const wrapper = document.createElement('div');
  wrapper.className = 'about-golden-logo-wrap';
  wrapper.setAttribute('aria-label', 'SHINOBIWAN golden logo');

  const canvas = document.createElement('canvas');
  canvas.className = 'about-golden-logo about-golden-canvas';
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', 'SHINOBIWAN golden logo');

  wrapper.appendChild(canvas);
  card.appendChild(wrapper);
  processGoldenLogo(canvas);
}

export function initAboutEnhancements() {
  ensureStylesheet();
  installAboutSocialCards();
  installGoldenLogo();
}
