function installEarlyFavicon() {
  document.querySelectorAll('link[rel~="icon"]').forEach(link => link.remove());
  const icon = document.createElement('link');
  icon.rel = 'icon';
  icon.type = 'image/svg+xml';
  icon.href = 'assets/favicon-v6.svg?v=20260801-6';
  document.head.appendChild(icon);
}

function installCriticalStyles() {
  const href = 'css/audio-lab-fix.css?v=20260801-1';
  if (document.querySelector(`link[href="${href}"]`)) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = href;
  document.head.appendChild(link);
}

function installDesktopHeroFix() {
  if (document.querySelector('link[data-desktop-hero-wide]')) return;
  const stylesheet = document.createElement('link');
  stylesheet.rel = 'stylesheet';
  stylesheet.href = 'css/desktop-hero-wide.css?v=20260801-1';
  stylesheet.dataset.desktopHeroWide = 'true';
  document.head.appendChild(stylesheet);
}

function installFinalLayoutFix() {
  if (document.querySelector('link[data-mobile-top-cleanup]')) return;
  const stylesheet = document.createElement('link');
  stylesheet.rel = 'stylesheet';
  stylesheet.href = 'css/mobile-top-cleanup.css?v=20260801-1';
  stylesheet.dataset.mobileTopCleanup = 'true';
  document.head.appendChild(stylesheet);
}

async function boot() {
  installEarlyFavicon();
  installCriticalStyles();
  await import('./app-main.js');

  const [{ installContentV4 }, { initAudioFocus }] = await Promise.all([
    import('./content-v4.js'),
    import('./audio-focus.js')
  ]);

  installContentV4();
  installDesktopHeroFix();
  installFinalLayoutFix();
  initAudioFocus({ audio: document.querySelector('#audio') });
}

boot().catch(error => {
  console.error('Unable to start the SHINOBIWAN App', error);
  const main = document.querySelector('.main-content');
  if (main) {
    main.insertAdjacentHTML(
      'afterbegin',
      '<p style="padding:20px;color:#ff9cae">An error is preventing the application from loading. Please refresh the page.</p>'
    );
  }
});
