import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const summarySource = fs.readFileSync('cloudflare/admin-worker.parts/03b-lyrics-summary.part', 'utf8');
const helperSource = summarySource.slice(0, summarySource.indexOf('\nenrichTrackSummariesQuality ='));
const summaryContext = vm.createContext({ Boolean, Set });
vm.runInContext(`${helperSource}\nglobalThis.__lyricsStatus=lyricsStatusFromQuality;`, summaryContext);
const lyricsStatus = summaryContext.__lyricsStatus;

assert.equal(lyricsStatus({ assets: { lyrics: null } }, { items: [{ code: 'lyrics-absent' }], timestampsAvailable: false }), 'missing');
assert.equal(lyricsStatus({ assets: { lyrics: { present: true } } }, { items: [{ code: 'lyrics-empty' }], timestampsAvailable: false }), 'invalid');
assert.equal(lyricsStatus({ assets: { lyrics: { present: true } } }, { items: [{ code: 'lyrics-readable' }, { code: 'lyrics-unsynced' }], timestampsAvailable: false }), 'unsynced');
assert.equal(lyricsStatus({ assets: { lyrics: { present: true } } }, { items: [{ code: 'timestamps-present' }], timestampsAvailable: true }), 'synced');

const source = fs.readFileSync('cloudflare/admin-worker.parts/15-lyrics-status-badges.inject.part', 'utf8');
const appendedStyles = [];
const context = vm.createContext({
  Array,
  Boolean,
  document: {
    head: { appendChild: node => appendedStyles.push(node) },
    createElement: tag => ({ tagName: tag.toUpperCase(), textContent: '', className: '', dataset: {} }),
    querySelectorAll: () => [],
  },
  renderTracks() {},
  state: { tracks: [] },
  $: () => ({ value: '' }),
});

vm.runInContext(`${source}\nglobalThis.__lyricsBadge=trackLyricsBadge;`, context);
const badge = context.__lyricsBadge;
const plain = value => JSON.parse(JSON.stringify(value));

assert.deepEqual(
  plain(badge({ assets: { lyrics: null }, quality: { lyricsStatus: 'missing', timestampsAvailable: false } })),
  { className: 'lyrics-missing', label: 'lyrics absentes' },
);
assert.deepEqual(
  plain(badge({ assets: { lyrics: { present: true } }, quality: { lyricsStatus: 'invalid', timestampsAvailable: false } })),
  { className: 'lyrics-missing', label: 'lyrics invalides' },
);
assert.deepEqual(
  plain(badge({ assets: { lyrics: { present: true } }, quality: { lyricsStatus: 'unsynced', timestampsAvailable: false } })),
  { className: 'lyrics-unsynced', label: 'lyrics non timestampées' },
);
assert.deepEqual(
  plain(badge({ assets: { lyrics: { present: true } }, quality: { lyricsStatus: 'synced', timestampsAvailable: true } })),
  { className: 'lyrics-synced', label: 'lyrics timestampées' },
);
assert.deepEqual(
  plain(badge({ assets: { lyrics: { present: true } }, quality: { timestampsAvailable: true } })),
  { className: 'lyrics-synced', label: 'lyrics timestampées' },
);
assert.deepEqual(
  plain(badge({ assets: { lyrics: null }, quality: {} })),
  { className: 'lyrics-missing', label: 'lyrics absentes' },
);

assert.equal(appendedStyles.length, 1);
assert.match(appendedStyles[0].textContent, /lyrics-missing/);
assert.match(appendedStyles[0].textContent, /lyrics-unsynced/);
assert.match(appendedStyles[0].textContent, /lyrics-synced/);
assert.match(summarySource, /lyricsStatusFromQuality/);
assert.match(summarySource, /lyricsStatus,/);
assert.match(source, /TRACK_MANAGER_LYRICS_BADGES_VERSION='5\.0'/);
assert.match(source, /track\.quality\.timestampsAvailable===true/);
assert.match(source, /data-lyrics-status/);

console.log('Track Manager lyrics badges use authoritative missing, invalid, unsynced and synced states.');