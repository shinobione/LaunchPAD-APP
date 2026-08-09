import assert from 'node:assert/strict';
import fs from 'node:fs';

const controller = fs.readFileSync('js/features/content/content-controller.js', 'utf8');
const css = fs.readFileSync('css/content-v4.css', 'utf8');
const appMain = fs.readFileSync('js/app-main.js', 'utf8');

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
  appMain.includes("event.target.closest('[data-play-album]')"),
  'Play album routing must remain present.',
);
assert.ok(
  appMain.includes("event.target.closest('[data-open-album]')"),
  'Open project routing must remain present.',
);

console.log('Albums scalability guard passed: collapsed default, one-open toggle, ARIA/keyboard, mobile, Play/Open preserved.');
