export function initLyricsStudio() {
  const view = document.querySelector('#view-lyrics');
  const head = document.querySelector('.lyrics-reader-head');
  if (!view || !head) return;

  head.querySelector('.lyrics-studio-controls')?.remove();

  const controls = document.createElement('div');
  controls.className = 'lyrics-studio-controls';
  controls.innerHTML = `
    <button class="chip" type="button" data-lyrics-studio="mode" aria-pressed="false">Studio mode</button>
  `;
  head.appendChild(controls);

  const modeButton = controls.querySelector('[data-lyrics-studio="mode"]');
  let savedScrollY = 0;

  function setStudioMode(active, { restoreScroll = true } = {}) {
    const wasActive = view.classList.contains('lyrics-studio-mode');
    if (active === wasActive) return;

    if (active) {
      savedScrollY = window.scrollY;
      view.classList.add('lyrics-studio-mode');
      document.body.classList.add('lyrics-studio-open');
      modeButton.classList.add('active');
      modeButton.setAttribute('aria-pressed', 'true');
      modeButton.textContent = 'Exit studio';
      view.scrollTop = 0;
      window.scrollTo({ top: 0, behavior: 'auto' });
      window.setTimeout(() => {
        view.scrollTop = 0;
        document.querySelector('#lyrics-reader .lyric-line.active')
          ?.scrollIntoView({ behavior: 'auto', block: 'center' });
      }, 0);
      return;
    }

    view.classList.remove('lyrics-studio-mode');
    document.body.classList.remove('lyrics-studio-open');
    modeButton.classList.remove('active');
    modeButton.setAttribute('aria-pressed', 'false');
    modeButton.textContent = 'Studio mode';
    if (restoreScroll) window.scrollTo({ top: savedScrollY, behavior: 'auto' });
  }

  modeButton.addEventListener('click', () => {
    setStudioMode(!view.classList.contains('lyrics-studio-mode'));
  });

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') setStudioMode(false);
  });

  const activeViewObserver = new MutationObserver(() => {
    if (!view.classList.contains('active')) setStudioMode(false, { restoreScroll: false });
  });
  activeViewObserver.observe(view, { attributes: true, attributeFilter: ['class'] });

  window.addEventListener('pagehide', () => {
    view.classList.remove('lyrics-studio-mode');
    document.body.classList.remove('lyrics-studio-open');
  });
}
