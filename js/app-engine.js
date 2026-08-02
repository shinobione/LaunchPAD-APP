const BUILD = '20260802-wave7';

const CRITICAL_STYLES = [
  'css/audio-lab-fix.css',
  'css/launchpad-features.css',
  'css/player-experience.css'
];

const LAYOUT_STYLES = [
  ['css/desktop-hero-wide.css', 'desktopHeroWide'],
  ['css/mobile-top-cleanup.css', 'mobileTopCleanup']
];

function versioned(path) {
  return `${path}?v=${BUILD}`;
}

function installStylesheet(path, dataAttribute) {
  if (document.querySelector(`link[href^="${path}"]`)) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = versioned(path);
  if (dataAttribute) link.dataset[dataAttribute] = 'true';
  document.head.appendChild(link);
}

function installStylesheets(entries) {
  entries.forEach(entry => {
    if (Array.isArray(entry)) installStylesheet(entry[0], entry[1]);
    else installStylesheet(entry);
  });
}

async function boot() {
  document.documentElement.dataset.build = BUILD;
  installStylesheets(CRITICAL_STYLES);

  const [
    { prepareLibraryMemoryShell },
    pwa
  ] = await Promise.all([
    import(versioned('./features/library-memory-shell.js')),
    import(versioned('./features/pwa.js'))
  ]);

  prepareLibraryMemoryShell();
  pwa.preparePWAHead();

  await import(versioned('./app-main.js'));

  const [
    { installContentV4 },
    { initAudioFocus },
    { initLyricsWakeLock },
    { initAboutEnhancements },
    { initLibraryMemory },
    { initVisualCard },
    { createPlayerExperience }
  ] = await Promise.all([
    import(versioned('./features/content/content-controller.js')),
    import(versioned('./features/audio/audio-focus.js')),
    import(versioned('./features/lyrics/wake-lock.js')),
    import(versioned('./features/about/about-controller.js')),
    import(versioned('./features/library-memory.js')),
    import(versioned('./features/visual-card.js')),
    import(versioned('./features/player-experience.js'))
  ]);

  installContentV4();
  initAboutEnhancements();
  installStylesheets(LAYOUT_STYLES);

  const audio = document.querySelector('#audio');
  createPlayerExperience({ audio });
  initLibraryMemory({ audio });
  initVisualCard({ audio });
  pwa.initPWA();
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
