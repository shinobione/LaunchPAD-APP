function installEarlyFavicon() {
  document.querySelectorAll('link[rel~="icon"]').forEach(link => link.remove());
  const icon = document.createElement('link');
  icon.rel = 'icon';
  icon.type = 'image/svg+xml';
  icon.href = 'assets/favicon-v6.svg?v=20260801-6';
  document.head.appendChild(icon);
}

async function boot() {
  installEarlyFavicon();
  await import('./app-main.js');

  const [{ installContentV4 }, { initAudioFocus }] = await Promise.all([
    import('./content-v4.js'),
    import('./audio-focus.js')
  ]);

  installContentV4();
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
