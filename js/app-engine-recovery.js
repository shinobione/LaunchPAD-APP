
const BUILD = globalThis.SHINOBIWAN_BUILD?.id || 'dev';

const CRITICAL_STYLES = [
  'css/launchpad-features.css',
  'css/catalog-filters.css',
  'css/feature-10.css',
  'css/feature-11.css',
  'css/feature-12.css',
  'css/theme-scope.css',
  'css/discography-experience.css',
  'css/home-editorial.css',
  'css/ui-polish-v62.css',
  'css/ui-polish-v62-1.css'
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

function installBootMenuBridge() {
  const button = document.querySelector('#menu-button');
  const sidebar = document.querySelector('.sidebar');
  if (!button || !sidebar) return () => {};

  const toggle = () => sidebar.classList.toggle('open');
  button.addEventListener('click', toggle);
  document.documentElement.dataset.bootMenuReady = 'true';

  return () => {
    button.removeEventListener('click', toggle);
    delete document.documentElement.dataset.bootMenuReady;
  };
}

function scheduleIdleEnhancements(callback) {
  const run = () => Promise.resolve(callback()).catch(error => {
    console.warn('Deferred LaunchPAD enhancement failed.', error);
  });

  if (typeof requestIdleCallback === 'function') {
    requestIdleCallback(run, { timeout: 3500 });
    return;
  }
  window.setTimeout(run, 900);
}

async function boot() {
  document.documentElement.dataset.build = BUILD;
  document.documentElement.dataset.appState = 'booting';
  if (new URLSearchParams(location.search).has('visual-test')) document.documentElement.dataset.visualTest = 'true';
  installStylesheets(CRITICAL_STYLES);

  // Build 98: bind the one interaction users need while catalog hydration is in
  // flight. app-main will take ownership after import; this bridge is removed
  // immediately afterwards so there is never a double-toggle listener.
  const removeBootMenuBridge = installBootMenuBridge();

  await import(versioned('./ui-polish-v62.js'));
  await import(versioned('./ui-polish-v62-1.js'));

  const [
    { prepareLibraryMemoryShell },
    pwa,
    remoteCatalog,
    { normalizeCatalogEditorialTags },
    { initAudioReadiness },
    { initAudioLabSignalBridge },
    feature11,
    { initResponsivenessV98 }
  ] = await Promise.all([
    import(versioned('./features/library-memory-shell.js')),
    import(versioned('./features/pwa.js')),
    import(versioned('./core/remote-catalog.js')),
    import(versioned('./core/editorial-normalization.js')),
    import(versioned('./features/audio-readiness.js')),
    import(versioned('./features/audio-lab-signal.js')),
    import(versioned('./features/feature-11.js')),
    import(versioned('./features/responsiveness-v98.js'))
  ]);

  feature11.normalizeLaunchRoute();
  prepareLibraryMemoryShell();
  pwa.preparePWAHead();

  const audio = document.querySelector('#audio');
  initAudioLabSignalBridge({ audio });
  initAudioReadiness({ audio });
  initResponsivenessV98({ audio });

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

  try {
    await import(versioned('./app-main.js'));
  } finally {
    removeBootMenuBridge();
  }

  // Build 98 critical interactive layer. Keep navigation/player/catalog surfaces
  // ahead of optional visual/history/About enhancements on slower phones.
  const [
    { installContentV4 },
    { initCatalogFilters },
    { initContentAdvisoryBadges },
    { initAudioFocus },
    { initLyricsWakeLock },
    { initLibraryMemory },
    { createPlayerExperience },
    { initResilienceAccessibility },
    { initTrackDetail },
    { initTrackCardNavigation },
    { initTrackVideos },
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
    import(versioned('./features/library-memory.js')),
    import(versioned('./features/player-experience.js')),
    import(versioned('./features/resilience-accessibility.js')),
    import(versioned('./features/track-detail.js')),
    import(versioned('./features/track-card-navigation.js')),
    import(versioned('./features/track-videos.js')),
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
  installStylesheets(LAYOUT_STYLES);

  createPlayerExperience({ audio });
  initResilienceAccessibility({ audio });
  initLibraryMemory({ audio });
  initTrackDetail({ audio });
  initTrackCardNavigation();
  initTrackVideos({ audio });
  initMobileNavigation();
  initAdminAccess();
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

  scheduleIdleEnhancements(async () => {
    const [
      { initAboutEnhancements },
      { initListeningHistorySummary },
      { initVisualCard },
      { initSmartCanvasManager },
      { initCanvasIdentity }
    ] = await Promise.all([
      import(versioned('./features/about/about-controller.js')),
      import(versioned('./features/listening-history-summary.js')),
      import(versioned('./features/visual-card.js')),
      import(versioned('./features/smart-canvas.js')),
      import(versioned('./features/canvas-identity.js'))
    ]);

    initAboutEnhancements();
    initListeningHistorySummary({ audio });
    initVisualCard({ audio });
    initSmartCanvasManager();
    initCanvasIdentity();
    document.documentElement.dataset.idleEnhancements = 'ready';
  });
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