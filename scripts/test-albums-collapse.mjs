import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createQueueController } from '../js/core/player-queue.js';

const controller = fs.readFileSync('js/features/content/content-controller.js', 'utf8');
const css = fs.readFileSync('css/content-v4.css', 'utf8');
const appMain = fs.readFileSync('js/app-main.js', 'utf8');
const discography = fs.readFileSync('js/features/discography-experience.js', 'utf8');
const catalogStore = fs.readFileSync('js/core/catalog-store.js', 'utf8');
const queueUi = fs.readFileSync('js/features/queue-ui.js', 'utf8');

assert.ok(
  controller.includes('data-toggle-album-tracks'),
  'Albums view must expose a dedicated tracklist toggle.',
);
assert.ok(
  controller.includes('aria-expanded="false"') && controller.includes('aria-controls="${trackListId}"'),
  'Album tracklist toggles must expose aria-expanded and aria-controls.',
);
assert.ok(
  controller.includes('<div class="project-track-list" id="${trackListId}" hidden>'),
  'Album tracklists must render collapsed by default.',
);
assert.ok(
  controller.includes('toggles.forEach(other => setAlbumTrackListExpanded(view, other, false));'),
  'Expanding one Album must collapse the other Album tracklists.',
);
assert.ok(
  controller.includes("toggle.addEventListener('click'"),
  'Album toggles must use native button click behavior so Enter/Space remain keyboard accessible.',
);
assert.ok(
  controller.includes("toggle.textContent = expanded ? 'Hide tracks' : showLabel;"),
  'Album toggle copy must switch between Show N tracks and Hide tracks.',
);
assert.ok(
  controller.includes("collection.classList.toggle('has-album-focus'")
    && controller.includes("card.classList.toggle('is-tracklist-expanded'"),
  'Expanded Album state must drive a dedicated focused collection/card layout.',
);
assert.ok(
  controller.includes('document.startViewTransition(callback)')
    && controller.includes('prefers-reduced-motion: reduce')
    && controller.includes('card.style.viewTransitionName'),
  'Album focus motion must use progressive View Transitions and respect reduced-motion preference.',
);
assert.ok(
  controller.includes("matchMedia?.('(max-width: 1180px)')")
    && controller.includes('transition?.finished || Promise.resolve()')
    && controller.includes("document.querySelector('.topbar')")
    && controller.includes('card.getBoundingClientRect().top')
    && controller.includes('window.scrollTo({'),
  'Narrow-screen Album focus must follow the reordered Album after the layout transition and account for the topbar.',
);
assert.ok(
  controller.includes('.then(() => focusExpandedAlbumOnNarrowScreen(toggle))'),
  'Mobile focus scrolling must run only after the Album layout transition has completed.',
);

assert.ok(
  css.includes('.project-track-list[hidden]') && css.includes('display:none!important;'),
  'The hidden Album tracklist state must be enforced by CSS.',
);
assert.ok(
  css.includes('.project-album-toggle:focus-visible'),
  'The Album toggle must preserve a visible keyboard focus state.',
);
assert.ok(
  css.includes('flex:1 1 100%') && css.includes('@media(max-width:760px)'),
  'The Album toggle must have an explicit mobile layout rule.',
);
assert.ok(
  css.includes('.album-collection.has-album-focus')
    && css.includes('.project-album.is-tracklist-expanded')
    && css.includes('grid-template-columns:minmax(0,1.8fr) minmax(250px,.58fr)'),
  'Desktop Album focus must reserve the majority layout for the expanded project and a compact dock for siblings.',
);
assert.ok(
  css.includes('@media(prefers-reduced-motion:no-preference)')
    && css.includes('::view-transition-group(*)'),
  'Album layout animation must remain a progressive enhancement.',
);

assert.ok(
  appMain.includes("event.target.closest('[data-play-album]')"),
  'Play album routing must remain present.',
);
assert.ok(
  appMain.includes("event.target.closest('[data-open-album]')"),
  'Open project routing must remain present.',
);

assert.ok(
  discography.includes("const ERA_QUEUE_PREFIX = 'era:'")
    && discography.includes('button.dataset.albumContext = contextId')
    && discography.includes("button.dataset.queueContext = 'era'"),
  'Selecting one Era must attach a virtual Era playback context to matching Discography play controls.',
);
assert.ok(
  discography.includes('delete button.dataset.albumContext')
    && discography.includes('synchronizeEraPlaybackContext();'),
  'Era playback context must be removable and resynchronized with filter/navigation changes.',
);
assert.ok(
  catalogStore.includes('export function getEraTrackIndexes(eraValue)')
    && catalogStore.includes('decodeEraQueueId(albumId)')
    && catalogStore.includes('return virtualEra ? getEraTrackIndexes(virtualEra)'),
  'The catalog queue resolver must support virtual Era collections without creating canonical Albums.',
);
assert.ok(
  queueUi.includes("state.context.type === 'era'") && queueUi.includes('Era queue •'),
  'The playback queue UI must identify the virtual Era context explicitly.',
);

const eraQueue = createQueueController({ allIndexes: [0, 1, 2, 3] });
eraQueue.setContext([1, 2, 3], 1, { type: 'album', id: 'era:kinetic%20flow%20era' });
assert.equal(eraQueue.snapshot().context.type, 'era', 'Virtual Era IDs must normalize to an Era queue context.');
assert.equal(eraQueue.snapshot().currentIndex, 1, 'Era queue must start on the selected Era track.');
assert.equal(eraQueue.next(), 2, 'Next must advance inside the selected Era queue.');
assert.equal(eraQueue.next(), 3, 'Era queue ordering must remain deterministic.');
assert.equal(eraQueue.next(), null, 'Era queue must stop at its end when repeat is off.');

console.log('Albums/Era UX guard passed: collapsed default, focused Album layout, post-transition mobile focus scroll, ARIA/keyboard, Play/Open, virtual Era queue and sequential playback preserved.');
