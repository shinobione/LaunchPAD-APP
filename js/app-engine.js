function installEarlyFavicon() {
  document.querySelectorAll('link[rel~="icon"]').forEach(link => link.remove());
  const icon = document.createElement('link');
  icon.rel = 'icon';
  icon.type = 'image/svg+xml';
  icon.href = 'assets/favicon-v6.svg?v=20260801-6';
  document.head.appendChild(icon);
}

function installStylesheet(href, dataAttribute) {
  if (document.querySelector(`link[href="${href}"]`)) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = href;
  if (dataAttribute) link.dataset[dataAttribute] = 'true';
  document.head.appendChild(link);
}

function installCriticalStyles() {
  installStylesheet('css/audio-lab-fix.css?v=20260801-1');
  installStylesheet('css/launchpad-features.css?v=20260802-1');
}

function installDesktopHeroFix() {
  installStylesheet('css/desktop-hero-wide.css?v=20260801-1', 'desktopHeroWide');
}

function installFinalLayoutFix() {
  installStylesheet('css/mobile-top-cleanup.css?v=20260801-1', 'mobileTopCleanup');
}

async function boot() {
  installEarlyFavicon();
  installCriticalStyles();

  await import('./app-main.js?v=20260802-wave1');

  const [
    { installContentV4 },
    { initAudioFocus },
    { initLyricsWakeLock },
    { initAboutEnhancements }
  ] = await Promise.all([
    import('./features/content/content-controller.js?v=20260802-wave1'),
    import('./audio-focus.js'),
    import('./lyrics-wake-lock.js'),
    import('./about-enhancements.js?v=20260802-2')
  ]);

  installContentV4();
  initAboutEnhancements();
  installDesktopHeroFix();
  installFinalLayoutFix();

  const audio = document.querySelector('#audio');
  initAudioFocus({ audio });
  initLyricsWakeLock({ audio });
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
