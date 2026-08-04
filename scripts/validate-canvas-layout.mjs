import fs from 'node:fs';

const read = path => fs.readFileSync(path, 'utf8');
const fail = message => { throw new Error(message); };

const trackVideos = read('js/features/track-videos.js');
for (const required of [
  "const MOBILE_CANVAS_QUERY = '(max-width: 760px)'",
  "panel.className = 'track-detail-canvas-panel'",
  'hero.appendChild(createCanvasPanel(track))',
  'function syncResponsiveCanvas',
  'if (!mobileCanvasLayout())',
  'button.hidden = true',
  'panel.hidden = false',
  "hero.classList.add('has-track-canvas')",
  "hero.classList.toggle('has-track-canvas', opening)",
  "button.textContent = 'Open Canvas'",
  "mediaQuery.addEventListener?.('change'"
]) {
  if (!trackVideos.includes(required)) fail(`Track detail Canvas integration is missing ${required}.`);
}
for (const forbidden of [
  "insertAdjacentElement('afterend'",
  'track-video-section'
]) {
  if (trackVideos.includes(forbidden)) fail(`Oversized standalone Canvas layout survived: ${forbidden}.`);
}

const styles = read('css/track-videos.css');
for (const required of [
  '.track-detail-hero.has-track-canvas',
  'grid-template-columns:minmax(240px,340px) minmax(0,1fr) minmax(150px,210px)',
  'width:min(48vw,205px)',
  'max-height:52dvh',
  '#view-lyrics.lyrics-studio-mode.lyrics-studio-canvas-active .lyrics-track-panel',
  'width:min(50vw,185px)',
  '@media(max-width:760px)'
]) {
  if (!styles.includes(required)) fail(`Responsive Canvas CSS is missing ${required}.`);
}
for (const forbidden of [
  '.track-video-section',
  'position:fixed'
]) {
  if (styles.includes(forbidden)) fail(`Canvas CSS still uses the rejected detached/fullscreen layout: ${forbidden}.`);
}

const lyricsStudio = read('js/features/lyrics-studio.js');
for (const required of [
  "const trackPanel = stage?.querySelector('.lyrics-track-panel')",
  'trackPanel.prepend(canvasShell)',
  'canvasButton.hidden = !hasCanvas || !studioOpen'
]) {
  if (!lyricsStudio.includes(required)) fail(`Studio Canvas integration is missing ${required}.`);
}
if (lyricsStudio.includes('stage.prepend(canvasShell)')) {
  fail('Studio Canvas must live inside the existing track panel, not as a third stage column.');
}

const fixture = read('js/catalog-fixture.js');
for (const required of [
  "video: media('thick', 'video', 'video.mp4')",
  "videoContentType: 'video/mp4'",
  "videoFilename: 'video.mp4'"
]) {
  if (!fixture.includes(required)) fail(`CI cannot exercise THICK Canvas without ${required}.`);
}

console.log('Desktop Canvas is always visible, while mobile keeps its compact toggle and bounded layout.');
