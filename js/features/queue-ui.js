import { ensureStylesheet } from '../core/assets.js';

function repeatLabel(mode) {
  if (mode === 'one') return 'Repeat one';
  if (mode === 'all') return 'Repeat all';
  return 'Repeat off';
}

export function createQueueUI({ tracks, queue, onSelect, onShareCurrent }) {
  ensureStylesheet('css/launchpad-features.css');

  const player = document.querySelector('.player-bar');
  const volume = player?.querySelector('.volume');
  const currentTrack = player?.querySelector('.current-track');

  const controls = document.createElement('div');
  controls.className = 'player-mode-controls';
  controls.innerHTML = `
    <button type="button" data-queue-action="shuffle" aria-label="Toggle shuffle" title="Shuffle">⤨</button>
    <button type="button" data-queue-action="repeat" aria-label="Change repeat mode" title="Repeat">↻</button>
    <button type="button" data-queue-action="share" aria-label="Share current track" title="Share">↗</button>
    <button type="button" data-queue-action="panel" aria-label="Open queue" title="Queue">≡</button>
  `;
  volume?.prepend(controls);

  const mobileTrigger = document.createElement('button');
  mobileTrigger.type = 'button';
  mobileTrigger.className = 'mobile-queue-trigger';
  mobileTrigger.dataset.queueAction = 'panel';
  mobileTrigger.setAttribute('aria-label', 'Open queue');
  mobileTrigger.textContent = '≡';
  currentTrack?.appendChild(mobileTrigger);

  const panel = document.createElement('aside');
  panel.id = 'queue-panel';
  panel.className = 'queue-panel';
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-modal', 'true');
  panel.setAttribute('aria-label', 'Playback queue');
  panel.setAttribute('aria-hidden', 'true');
  panel.innerHTML = `
    <div class="queue-panel-head">
      <div>
        <span class="eyebrow">NEXT UP</span>
        <h2>Queue</h2>
      </div>
      <button type="button" data-queue-action="close" aria-label="Close queue">×</button>
    </div>
    <div class="queue-panel-modes">
      <button type="button" data-queue-action="shuffle">⤨ <span>Shuffle</span></button>
      <button type="button" data-queue-action="repeat">↻ <span>Repeat off</span></button>
      <button type="button" data-queue-action="share">↗ <span>Share track</span></button>
    </div>
    <div class="queue-context" id="queue-context"></div>
    <div class="queue-list" id="queue-list"></div>
  `;
  document.body.appendChild(panel);

  let lastFocused = null;

  function setOpen(open) {
    if (open) lastFocused = document.activeElement;
    panel.classList.toggle('open', open);
    panel.setAttribute('aria-hidden', String(!open));
    document.body.classList.toggle('queue-open', open);
    if (open) panel.querySelector('[data-queue-action="close"]')?.focus();
    else lastFocused?.focus?.();
  }

  function render(state) {
    const shuffleButtons = document.querySelectorAll('[data-queue-action="shuffle"]');
    shuffleButtons.forEach(button => {
      button.classList.toggle('active', state.shuffle);
      button.setAttribute('aria-pressed', String(state.shuffle));
    });

    const repeatButtons = document.querySelectorAll('[data-queue-action="repeat"]');
    repeatButtons.forEach(button => {
      button.classList.toggle('active', state.repeat !== 'off');
      button.dataset.repeat = state.repeat;
      button.setAttribute('aria-label', repeatLabel(state.repeat));
      const label = button.querySelector('span');
      if (label) label.textContent = repeatLabel(state.repeat);
    });

    const context = panel.querySelector('#queue-context');
    context.textContent = state.context.type === 'album'
      ? `Album queue • ${state.queue.length} tracks`
      : state.context.type === 'favorites'
        ? `Favorites queue • ${state.baseQueue.length} tracks`
        : `Catalog queue • ${state.queue.length} tracks`;

    const list = panel.querySelector('#queue-list');
    list.innerHTML = state.queue.map((trackIndex, queueIndex) => {
      const track = tracks[trackIndex];
      if (!track) return '';
      const active = queueIndex === state.position;
      return `
        <button type="button" class="queue-track${active ? ' active' : ''}" data-queue-index="${trackIndex}">
          <img src="${track.cover}" alt="" loading="lazy">
          <span><strong>${track.title}</strong><small>${track.album}</small></span>
          <b>${active ? 'PLAYING' : '▶'}</b>
        </button>
      `;
    }).join('');
  }

  function handleAction(action) {
    if (action === 'shuffle') queue.toggleShuffle();
    if (action === 'repeat') queue.cycleRepeat();
    if (action === 'share') onShareCurrent();
    if (action === 'panel') setOpen(!panel.classList.contains('open'));
    if (action === 'close') setOpen(false);
  }

  document.addEventListener('click', event => {
    const actionButton = event.target.closest('[data-queue-action]');
    if (actionButton) {
      event.preventDefault();
      event.stopPropagation();
      handleAction(actionButton.dataset.queueAction);
      return;
    }

    const trackButton = event.target.closest('[data-queue-index]');
    if (trackButton) {
      onSelect(Number(trackButton.dataset.queueIndex));
      setOpen(false);
    }
  });

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') setOpen(false);
  });

  queue.subscribe(render);
  return { close: () => setOpen(false), render };
}

