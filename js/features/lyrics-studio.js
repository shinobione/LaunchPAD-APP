import { getTrack } from '../core/catalog-store.js';
import { ensureStylesheet } from '../core/assets.js';

function currentTrack(audio) {
  return getTrack(audio?.dataset.trackId || '') || null;
}

function createStudioCanvas() {
  const shell = document.createElement('div');
  shell.className = 'lyrics-studio-canvas';
  shell.hidden = true;
  shell.setAttribute('aria-hidden', 'true');

  const video = document.createElement('video');
  video.className = 'lyrics-studio-canvas-video';
  video.controls = false;
  video.muted = true;
  video.defaultMuted = true;
  video.loop = true;
  video.playsInline = true;
  video.preload = 'none';
  video.disablePictureInPicture = true;
  video.setAttribute('muted', '');
  video.setAttribute('loop', '');
  video.setAttribute('playsinline', '');
  video.setAttribute('controlslist', 'nodownload noplaybackrate noremoteplayback');

  const badge = document.createElement('span');
  badge.className = 'lyrics-studio-canvas-badge';
  badge.textContent = 'SPOTIFY CANVAS';
  shell.append(video, badge);
  return shell;
}

export function initLyricsStudio({ audio = document.querySelector('#audio') } = {}) {
  const view = document.querySelector('#view-lyrics');
  const head = document.querySelector('.lyrics-reader-head');
  const stage = document.querySelector('#view-lyrics .lyrics-stage');
  const trackPanel = stage?.querySelector('.lyrics-track-panel');
  if (!view || !head || !stage || !trackPanel) return;

  ensureStylesheet('css/track-videos.css');
  head.querySelector('.lyrics-studio-controls')?.remove();
  view.querySelector('.lyrics-studio-canvas')?.remove();

  const controls = document.createElement('div');
  controls.className = 'lyrics-studio-controls';
  controls.innerHTML = `
    <button class="chip" type="button" data-lyrics-studio="canvas" aria-pressed="true" hidden>Canvas on</button>
    <button class="chip" type="button" data-lyrics-studio="mode" aria-pressed="false">Studio mode</button>
  `;
  head.appendChild(controls);

  const modeButton = controls.querySelector('[data-lyrics-studio="mode"]');
  const canvasButton = controls.querySelector('[data-lyrics-studio="canvas"]');
  const canvasShell = createStudioCanvas();
  const canvasVideo = canvasShell.querySelector('video');
  trackPanel.prepend(canvasShell);

  let savedScrollY = 0;
  let canvasEnabled = !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  function setCanvasButtonState() {
    canvasButton.setAttribute('aria-pressed', String(canvasEnabled));
    canvasButton.textContent = canvasEnabled ? 'Canvas on' : 'Canvas off';
  }

  function pauseCanvas() {
    canvasVideo.pause();
    canvasShell.hidden = true;
    view.classList.remove('lyrics-studio-canvas-active');
  }

  function loadCanvas(track) {
    if (!track?.video) {
      canvasShell.dataset.trackId = '';
      canvasVideo.dataset.src = '';
      canvasVideo.removeAttribute('src');
      canvasVideo.load();
      pauseCanvas();
      return false;
    }

    if (canvasShell.dataset.trackId !== track.id) {
      canvasVideo.pause();
      canvasVideo.removeAttribute('src');
      canvasVideo.load();
      canvasShell.dataset.trackId = track.id;
      canvasVideo.dataset.src = track.video;
    }
    return true;
  }

  function playCanvas() {
    const track = currentTrack(audio);
    if (!loadCanvas(track) || !canvasEnabled || !view.classList.contains('lyrics-studio-mode')) {
      pauseCanvas();
      return;
    }

    canvasShell.hidden = false;
    view.classList.add('lyrics-studio-canvas-active');
    if (!canvasVideo.src) {
      canvasVideo.src = canvasVideo.dataset.src;
      canvasVideo.load();
    }
    canvasVideo.muted = true;
    canvasVideo.play().catch(error => {
      console.info('Studio Canvas playback awaits another user gesture.', error);
    });
  }

  function syncCanvasTrack() {
    const hasCanvas = loadCanvas(currentTrack(audio));
    const studioOpen = view.classList.contains('lyrics-studio-mode');
    canvasButton.hidden = !hasCanvas || !studioOpen;
    setCanvasButtonState();
    if (hasCanvas && studioOpen && canvasEnabled) playCanvas();
    else pauseCanvas();
  }

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
      syncCanvasTrack();
      view.scrollTop = 0;
      window.scrollTo({ top: 0, behavior: 'auto' });
      window.setTimeout(() => {
        view.scrollTop = 0;
        document.querySelector('#lyrics-reader .lyric-line.active')
          ?.scrollIntoView({ behavior: 'auto', block: 'center' });
      }, 0);
      return;
    }

    pauseCanvas();
    canvasButton.hidden = true;
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

  canvasButton.addEventListener('click', () => {
    canvasEnabled = !canvasEnabled;
    setCanvasButtonState();
    if (canvasEnabled) playCanvas();
    else pauseCanvas();
  });

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') setStudioMode(false);
  });

  const activeViewObserver = new MutationObserver(() => {
    if (!view.classList.contains('active')) setStudioMode(false, { restoreScroll: false });
  });
  activeViewObserver.observe(view, { attributes: true, attributeFilter: ['class'] });

  if (audio) {
    new MutationObserver(syncCanvasTrack).observe(audio, {
      attributes: true,
      attributeFilter: ['data-track-id']
    });
  }
  document.querySelector('#lyrics-track-select')?.addEventListener('change', () => {
    window.setTimeout(syncCanvasTrack, 0);
  });

  window.addEventListener('pagehide', () => {
    pauseCanvas();
    canvasButton.hidden = true;
    view.classList.remove('lyrics-studio-mode');
    document.body.classList.remove('lyrics-studio-open');
  });

  setCanvasButtonState();
  syncCanvasTrack();
}
