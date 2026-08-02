export function initLyricsStudio() {
  const view = document.querySelector('#view-lyrics');
  const head = document.querySelector('.lyrics-reader-head');
  if (!view || !head || head.querySelector('[data-lyrics-studio]')) return;

  const controls = document.createElement('div');
  controls.className = 'lyrics-studio-controls';
  controls.innerHTML = `
    <button class="chip" type="button" data-lyrics-studio="mode" aria-pressed="false">Studio mode</button>
    <button class="chip" type="button" data-lyrics-studio="fullscreen">Fullscreen</button>
  `;
  head.appendChild(controls);

  const modeButton = controls.querySelector('[data-lyrics-studio="mode"]');
  const fullscreenButton = controls.querySelector('[data-lyrics-studio="fullscreen"]');

  function setStudioMode(active) {
    view.classList.toggle('lyrics-studio-mode', active);
    document.body.classList.toggle('lyrics-studio-open', active);
    modeButton.classList.toggle('active', active);
    modeButton.setAttribute('aria-pressed', String(active));
    modeButton.textContent = active ? 'Exit studio' : 'Studio mode';
  }

  modeButton.addEventListener('click', () => {
    setStudioMode(!view.classList.contains('lyrics-studio-mode'));
  });

  fullscreenButton.addEventListener('click', async () => {
    setStudioMode(true);
    try {
      if (!document.fullscreenElement && view.requestFullscreen) await view.requestFullscreen();
      else if (document.fullscreenElement && document.exitFullscreen) await document.exitFullscreen();
    } catch {
      // Studio mode still provides the immersive fallback.
    }
  });

  document.addEventListener('fullscreenchange', () => {
    const active = document.fullscreenElement === view;
    fullscreenButton.classList.toggle('active', active);
    fullscreenButton.textContent = active ? 'Exit fullscreen' : 'Fullscreen';
  });

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !document.fullscreenElement) setStudioMode(false);
  });
}
