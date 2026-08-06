
const BUILD = globalThis.SHINOBIWAN_BUILD?.id || 'dev';

const CRITICAL_STYLES = [
  'css/launchpad-features.css',
  'css/catalog-filters.css',
  'css/feature-10.css',
  'css/feature-11.css',
  'css/feature-12.css',
  'css/theme-scope.css',
  'css/discography-experience.css',
  'css/home-editorial.css'
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
  document.documentElement.dataset.appState = 'booting';
  if (new URLSearchParams(location.search).has('visual-test')) document.documentElement.dataset.visualTest = 'true';
  installStylesheets(CRITICAL_STYLES);

  const [
    { prepareLibraryMemoryShell },
    pwa,
    remoteCatalog,
    { normalizeCatalogEditorialTags },
    { initAudioReadiness },
    { initAudioLabSignalBridge },
    feature11
  ] = await Promise.all([
    import(versioned('./features/library-memory-shell.js')),
    import(versioned('./features/pwa.js')),
    import(versioned('./core/remote-catalog.js')),
    import(versioned('./core/editorial-normalization.js')),
    import(versioned('./features/audio-readiness.js')),
    import(versioned('./features/audio-lab-signal.js')),
    import(versioned('./features/feature-11.js'))
  ]);

  feature11.normalizeLaunchRoute();
  prepareLibraryMemoryShell();
  pwa.preparePWAHead();

  const audio = document.querySelector('#audio');
  initAudioLabSignalBridge({ audio });
  initAudioReadiness({ audio });

  try {
    const state = await remoteCatalog.hydrateRemoteCatalog();
    normalizeCatalogEditorialTags();
    feature11.prepareFeature11Catalog();
    document.documentElement.dataset.remoteCatalog = state.added || state.updated
      ? 'connected'
      : 'empty';
    document.documentElement.dataset.remoteTrackCount = String(state.remoteCount);
  } catch (error) {
    const data = document.documentElement.dataset;
    data.remoteCatalog = 'fallback';
    data.remoteTrackCount = '0';
    data.catalogFallback = 'local';
    normalizeCatalogEditorialTags();
    feature11.prepareFeature11Catalog();
    console.warn('Cloudflare R2 catalog unavailable; continuing with the local catalog.', error);
  }

  await import(versioned('./app-main.js'));

  const [
    { installContentV4 },
    { initCatalogFilters },
    { initContentAdvisoryBadges },
    { initAudioFocus },
    { initLyricsWakeLock },
    { initAboutEnhancements },
    { initLibraryMemory },
    { initListeningHistorySummary },
    { initVisualCard },
    { createPlayerExperience },
    { initResilienceAccessibility },
    { initTrackDetail },
    { initTrackVideos },
    { initSmartCanvasManager },
    { initCanvasIdentity },
    { initMobileNavigation },
    { initAdminAccess },
    { initPhase12 },
    { initPhase13 },
    { initThemeScoping },
    { initDiscographyExperience },
    { initHomeEditorial },
    { initAudioLabSanctuary }
  ] = await Promise.all([
    import(versioned('./features/content/content-controller.js')),
    import(versioned('./features/catalog-filters.js')),
    import(versioned('./features/content-advisory-badges.js')),
    import(versioned('./features/audio/audio-focus.js')),
    import(versioned('./features/lyrics/wake-lock.js')),
    import(versioned('./features/about/about-controller.js')),
    import(versioned('./features/library-memory.js')),
    import(versioned('./features/listening-history-summary.js')),
    import(versioned('./features/visual-card.js')),
    import(versioned('./features/player-experience.js')),
    import(versioned('./features/resilience-accessibility.js')),
    import(versioned('./features/track-detail.js')),
    import(versioned('./features/track-videos.js')),
    import(versioned('./features/smart-canvas.js')),
    import(versioned('./features/canvas-identity.js')),
    import(versioned('./features/mobile-navigation.js')),
    import(versioned('./features/admin-access.js')),
    import(versioned('./features/feature-12.js')),
    import(versioned('./features/feature-13.js')),
    import(versioned('./features/theme-scope.js')),
    import(versioned('./features/discography-experience.js')),
    import(versioned('./features/home-editorial.js')),
    import(versioned('./features/visual/audio-lab-sanctuary-v2.js'))
  ]);

  installContentV4();
  initCatalogFilters();
  initContentAdvisoryBadges();
  initAboutEnhancements();
  installStylesheets(LAYOUT_STYLES);

  createPlayerExperience({ audio });
  initResilienceAccessibility({ audio });
  initLibraryMemory({ audio });
  initListeningHistorySummary({ audio });
  initTrackDetail({ audio });
  initTrackVideos({ audio });
  initSmartCanvasManager();
  initCanvasIdentity();
  initMobileNavigation();
  initAdminAccess();
  initVisualCard({ audio });
  feature11.initFeature11({ audio });
  initPhase12();
  initPhase13({ audio });
  initThemeScoping({ audio });
  initDiscographyExperience({ audio });
  initHomeEditorial();
  initAudioLabSanctuary({ audio });
  pwa.initPWA();
  initAudioFocus({ audio });
  initLyricsWakeLock({ audio });

  const data = document.documentElement.dataset;
  data.appState = 'ready';
  data.appReady = 'true';
  if (window.frameElement && data.visualTest === 'true') {
    window.frameElement.dataset.appReady = 'true';
  }
  window.dispatchEvent(new CustomEvent('shinobi:ready'));
}

boot().catch(error => {
  document.documentElement.dataset.appState = 'error';
  console.error('Unable to start the SHINOBIWAN App', error);
  const main = document.querySelector('.main-content');
  if (main) {
    main.insertAdjacentHTML(
      'afterbegin',
      '<p style="padding:20px;color:#ff9cae">An error is preventing the application from loading. Please refresh the page.</p>'
    );
  }
});
