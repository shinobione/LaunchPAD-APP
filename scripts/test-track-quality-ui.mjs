import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const read = path => fs.readFileSync(path, 'utf8');
const split = value => String(value || '').split(',').map(item => item.trim()).filter(Boolean);

const uiSource = read('cloudflare/admin-worker.parts/08-ui-e.part');
const parserStart = uiSource.indexOf('var TXT_METADATA_FIELD_MAP=');
const parserEnd = uiSource.indexOf('function applyLyricsTxtMetadata', parserStart);
assert.ok(parserStart >= 0 && parserEnd > parserStart, 'TXT parser source must be extractable');
const parserFactory = new Function('split', `${uiSource.slice(parserStart, parserEnd)}; return { parseLyricsTxtMetadata, normalizeTxtMetadataKey, slugifyImportedTitle };`);
const parserBase = parserFactory(split);
const albumInjection = read('cloudflare/admin-worker.parts/11-album-metadata.inject.part');
const parseLyricsTxtMetadata = new Function(
  'parseLyricsTxtMetadata',
  'normalizeTxtMetadataKey',
  'slugifyImportedTitle',
  `${albumInjection}; return parseLyricsTxtMetadata;`,
)(parserBase.parseLyricsTxtMetadata, parserBase.normalizeTxtMetadataKey, parserBase.slugifyImportedTitle);

const albumTrack = parseLyricsTxtMetadata(`TITLE: Work in Progress\nALBUM: Coal to Diamond\nYEAR: 2026\nBPM: 142\nLYRICS:\n[00:04.28] Yeah`);
assert.equal(albumTrack.metadata.albumTitle, 'Coal to Diamond');
assert.equal(albumTrack.metadata.albumId, 'coal-to-diamond');
assert.equal(albumTrack.metadata.type, 'album-track');
assert.equal(albumTrack.albumDetected, true);

const explicitDemo = parseLyricsTxtMetadata(`TITLE: Demo Cut\nTYPE: demo\nALBUM: Coal to Diamond\nLYRICS:\nDemo`);
assert.equal(explicitDemo.metadata.type, 'demo', 'an explicit non-single type must be preserved');
assert.equal(explicitDemo.metadata.albumId, 'coal-to-diamond');

const qualitySource = read('cloudflare/admin-worker.parts/12-quality-lifecycle.inject.part');
for (const required of [
  'qualityFullScheduled',
  'qualityFileSignature',
  'state.qualityRunPromise',
  'state.qualityRerunRequested',
  'refreshQualityFromCachedEvidence',
  'client-lyrics-pending',
  'Audio sélectionné : contrôle complet en attente.',
  "clearTimeout(qualityTimer)",
  "qualityFileSignature()!==requestedSignature",
  "Le contrôle a échoué"
]) {
  assert.ok(qualitySource.includes(required), `quality lifecycle fix is missing ${required}`);
}

const files = {
  audio: { name: 'work-in-progress.mp3', size: 4_000_000, lastModified: 1 },
  lyrics: { name: 'work-in-progress.txt', size: 3_000, lastModified: 2 },
  cover: null,
  video: null,
};
const timers = [];
const rendered = [];
const qualityState = { className: '', textContent: '' };
const qualitySubtitle = { textContent: '' };
const testState = { qualityChecking: false, qualityReport: null };
const reportFromItems = (items, source = 'browser') => {
  const counts = { error: 0, warning: 0, info: 0, pass: 0 };
  for (const item of items) counts[item.level] += 1;
  return {
    items,
    counts,
    source,
    publishable: counts.error === 0,
    state: counts.error ? 'blocked' : counts.warning ? 'review' : 'ready',
  };
};
const qualityItemClient = (level, code, label, message) => ({ level, code, label, message });
const context = vm.createContext({
  console,
  Object,
  Array,
  String,
  Number,
  Boolean,
  Promise,
  Date,
  qualityTimer: 0,
  state: testState,
  selectedFile: kind => files[kind] || null,
  currentAssetPresent: () => false,
  qualityItemClient,
  reportFromItems,
  buildClientQuality(meta, evidence) {
    const items = [];
    if (files.audio) {
      items.push(evidence.audio?.readable
        ? qualityItemClient('pass', 'client-audio-readable', 'Audio', 'Audio lisible.')
        : qualityItemClient('info', 'client-audio-pending', 'Audio', 'Audio présent, mesure non disponible.'));
    }
    if (files.lyrics) {
      items.push(evidence.lyrics?.readable
        ? qualityItemClient('pass', 'client-lyrics-readable', 'Lyrics', 'Paroles présentes et lisibles.')
        : qualityItemClient('info', 'client-lyrics-absent', 'Lyrics', 'Aucune lyrics, fichier facultatif.'));
    }
    return reportFromItems(items, 'browser');
  },
  formMetadataForQuality: () => ({ slug: 'work-in-progress' }),
  collectQualityEvidence: async () => ({
    audio: { readable: true, duration: 237 },
    cover: {},
    thumbnail: {},
    video: {},
    lyrics: { readable: true, timestampCount: 76, lastTimestamp: 231.32 },
  }),
  renderQuality(report) { testState.qualityReport = report; rendered.push(report); },
  showNotice() {},
  clearTimeout() {},
  setTimeout(callback) { timers.push(callback); return timers.length; },
  $: selector => selector === '#qualityState' ? qualityState : qualitySubtitle,
});
vm.runInContext(`${qualitySource}\nglobalThis.__qualityUi={refreshQualityFromCachedEvidence,runQualityCheck,scheduleQualityCheck};`, context);

const pending = context.__qualityUi.refreshQualityFromCachedEvidence();
assert.equal(pending.state, 'review', 'pending local media must not claim the track is ready');
assert.equal(pending.publishable, false, 'pending media measurements must not be publishable');
assert.ok(pending.items.some(item => item.code === 'client-lyrics-pending'));
assert.ok(pending.items.some(item => item.code === 'client-audio-pending' && /sélectionné/.test(item.message)));

const firstRun = context.__qualityUi.runQualityCheck();
const secondRun = context.__qualityUi.runQualityCheck();
assert.equal(firstRun, secondRun, 'manual control and publication must share the active analysis');
const measured = await firstRun;
assert.equal(measured.state, 'ready');
assert.equal(testState.qualityChecking, false);
assert.equal(testState.qualityRunPromise, null);
assert.ok(measured.items.some(item => item.code === 'client-lyrics-readable'));

context.__qualityUi.scheduleQualityCheck({ target: { type: 'file' } });
assert.equal(timers.length, 1, 'file changes must schedule one debounced full control');
timers.shift()();
await testState.qualityRunPromise;
assert.equal(testState.qualityReport.state, 'ready');

console.log('Track Manager album inference and non-stalling quality lifecycle are valid.');
