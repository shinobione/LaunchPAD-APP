import fs from 'node:fs';

const manager = fs.readFileSync('js/features/smart-canvas.js', 'utf8');
const engine = fs.readFileSync('js/app-engine.js', 'utf8');
const worker = fs.readFileSync('sw.js', 'utf8');
const test = fs.readFileSync('tests/smart-canvas-smoke.html', 'utf8');

const fail = message => {
  throw new Error(message);
};

for (const marker of [
  "const CANVAS_SELECTOR = 'video.track-video-player';",
  "document.addEventListener('visibilitychange'",
  'new IntersectionObserver',
  "queryMedia('(prefers-reduced-motion: reduce)')",
  "queryMedia('(prefers-reduced-data: reduce)')",
  'connection?.saveData',
  "window.addEventListener('pagehide'",
  "window.addEventListener('pageshow'",
  "window.addEventListener('hashchange'",
  "window.addEventListener(ROUTE_CHANGE_EVENT",
  "reason: 'another-canvas-started'",
  'video.removeAttribute(\'src\')',
  "video.setAttribute('muted', '')",
  "video.setAttribute('loop', '')",
  "video.setAttribute('playsinline', '')"
]) {
  if (!manager.includes(marker)) fail(`Smart Canvas manager is missing ${marker}.`);
}

if (manager.includes('video.lyrics-studio-canvas-video')) {
  fail('Build 83 Smart Canvas must not register or own Lyrics Studio Canvas.');
}
if (!engine.includes("import(versioned('./features/smart-canvas.js'))")) {
  fail('The app engine does not load the Smart Canvas manager.');
}
if (!engine.includes('initSmartCanvasManager();')) {
  fail('The app engine does not initialize the Smart Canvas manager.');
}
if (!worker.includes("'./js/features/smart-canvas.js'")) {
  fail('The Smart Canvas manager is missing from the offline shell.');
}
if (/\baudio\s*\.\s*pause\s*\(/.test(manager)) {
  fail('Smart Canvas management must never pause the audio player.');
}
for (const marker of [
  'SMART CANVAS READY VISIBILITY VIEWPORT SINGLE ACTIVE RELEASE NO AUDIO PAUSE',
  "visibilityState = 'hidden'",
  'observer.set(videoB, 0.05)',
  'reducedMotion.set(true)',
  'connection.saveData = true',
  "location.hash = '#home'",
  'audioPauseCalls === 0'
]) {
  if (!test.includes(marker)) fail(`Smart Canvas browser coverage is missing ${marker}.`);
}

console.log('Smart Canvas lifecycle stays Track-Video-only; Lyrics Studio Canvas ownership is isolated.');
