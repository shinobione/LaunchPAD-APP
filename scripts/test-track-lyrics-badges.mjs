import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

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

assert.deepEqual(
  badge({ assets: { lyrics: null }, quality: { items: [{ code: 'lyrics-absent' }] } }),
  { className: 'lyrics-missing', label: 'lyrics absentes' },
);
assert.deepEqual(
  badge({ assets: { lyrics: { present: true } }, quality: { items: [{ code: 'lyrics-readable' }, { code: 'lyrics-unsynced' }] } }),
  { className: 'lyrics-unsynced', label: 'lyrics non timestampées' },
);
assert.deepEqual(
  badge({ assets: { lyrics: { present: true } }, quality: { items: [{ code: 'timestamps-present' }] } }),
  { className: 'lyrics-synced', label: 'lyrics timestampées' },
);
assert.deepEqual(
  badge({ assets: { lyrics: { present: true } }, quality: { items: [{ code: 'lyrics-empty' }] } }),
  { className: 'lyrics-missing', label: 'lyrics invalides' },
);
assert.deepEqual(
  badge({ assets: { lyrics: { present: true } }, lyricsAvailable: true, timestampsAvailable: true }),
  { className: 'lyrics-synced', label: 'lyrics timestampées' },
);

assert.equal(appendedStyles.length, 1);
assert.match(appendedStyles[0].textContent, /lyrics-missing/);
assert.match(appendedStyles[0].textContent, /lyrics-unsynced/);
assert.match(appendedStyles[0].textContent, /lyrics-synced/);
assert.match(source, /TRACK_MANAGER_LYRICS_BADGES_VERSION='4\.8'/);
assert.match(source, /data-lyrics-status/);

console.log('Track Manager lyrics badges distinguish absent, unsynced and timestamped lyrics.');
