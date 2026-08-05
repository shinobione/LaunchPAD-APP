import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  buildEditorialCatalogIndex,
  catalogTrackFacets,
  countActiveCatalogFilters,
  createEmptyCatalogFilterState,
  filterValueLabel,
  readCatalogFilterStateFromUrl,
  trackMatchesEditorialFilters
} from '../js/features/catalog-filters.js';

const tracks = [
  {
    id: 'romantic-canvas',
    searchText: 'romantic canvas english r&b my tyffany era',
    genre: 'R&B',
    languages: ['English'],
    video: 'video.mp4',
    lyrics: 'lyrics.txt',
    explicit: false,
    remoteMetadata: {
      era: 'My Tyffany Era',
      energy: 'High',
      moods: ['Romantic', 'Triumphant'],
      genres: ['R&B', 'Pop'],
      type: 'single',
      year: 2026,
      timestampsAvailable: true
    }
  },
  {
    id: 'kinetic-explicit',
    searchText: 'kinetic flow hip-hop french aggressive',
    genre: 'Hip-hop',
    languages: ['French'],
    video: null,
    lyrics: 'lyrics.txt',
    explicit: true,
    remoteMetadata: {
      era: 'Kinetic Flow Era',
      energy: 'High',
      moods: ['Aggressive'],
      genres: ['Hip-hop', 'Drill'],
      type: 'album-track',
      year: 2025,
      timestampsAvailable: false
    }
  },
  {
    id: 'metadata-light',
    searchText: 'metadata light instrumental',
    genre: 'Other',
    languages: ['English'],
    video: null,
    lyrics: null,
    explicit: null,
    remoteMetadata: {}
  }
];

const index = buildEditorialCatalogIndex(tracks);
assert.equal(index.length, 3);
assert.deepEqual(catalogTrackFacets(tracks[0]).era, ['my tyffany era']);
assert.deepEqual(catalogTrackFacets(tracks[0]).synced, ['synchronized']);
assert.deepEqual(catalogTrackFacets(tracks[1]).type, ['album-track']);
assert.deepEqual(catalogTrackFacets(tracks[2]).era, []);
assert.deepEqual(catalogTrackFacets(tracks[2]).content, []);
assert.equal(filterValueLabel('kinetic flow era'), 'Kinetic Flow Era');
assert.equal(filterValueLabel('r&b'), 'R&B');

const aliasIndex = buildEditorialCatalogIndex([
  { remoteMetadata: { era: 'Kinetic Flow Era' } },
  { remoteMetadata: { era: ' kinetic-flow-era ' } },
  { remoteMetadata: { era: 'KINETIC_FLOW_ERA' } },
  { remoteMetadata: { era: 'Kinetic\u00a0Flow\u00a0Era' } }
]);
assert.deepEqual(
  [...new Set(aliasIndex.flatMap(entry => entry.facets.era))],
  ['kinetic flow era'],
  'Editorial aliases must collapse into one filter option.'
);

assert.equal(index[0].searchText.includes('ocean heartbeat'), false);
tracks[0].searchText += ' ocean heartbeat';
assert.equal(index[0].searchText.includes('ocean heartbeat'), true, 'Lyrics hydrated after boot must remain searchable.');

const state = createEmptyCatalogFilterState();
assert.equal(countActiveCatalogFilters(state), 0);
assert.ok(index.every(entry => trackMatchesEditorialFilters(entry, state)));

state.era.add('my tyffany era');
state.energy.add('high');
state.genre.add('r&b');
state.language.add('english');
state.canvas.add('with-canvas');
state.lyrics.add('with-lyrics');
state.synced.add('synchronized');
state.content.add('clean');
state.year.add('2026');

assert.equal(countActiveCatalogFilters(state), 9);
assert.equal(trackMatchesEditorialFilters(index[0], state), true);
assert.equal(trackMatchesEditorialFilters(index[1], state), false);
assert.equal(trackMatchesEditorialFilters(index[2], state), false);

const moodOrState = createEmptyCatalogFilterState();
moodOrState.mood.add('romantic');
moodOrState.mood.add('aggressive');
assert.equal(trackMatchesEditorialFilters(index[0], moodOrState), true);
assert.equal(trackMatchesEditorialFilters(index[1], moodOrState), true);
assert.equal(trackMatchesEditorialFilters(index[2], moodOrState), false);

const parsed = readCatalogFilterStateFromUrl(
  'https://launchpad.test/?cf_era=Kinetic-Flow-Era&cf_genre=R%26B&cf_genre=Pop&cf_synced=synchronized#library'
);
assert.deepEqual([...parsed.era], ['kinetic flow era']);
assert.deepEqual([...parsed.genre], ['r&b', 'pop']);
assert.deepEqual([...parsed.synced], ['synchronized']);

const largeCatalog = buildEditorialCatalogIndex(Array.from({ length: 5000 }, (_, indexValue) => ({
  ...tracks[indexValue % tracks.length],
  id: `track-${indexValue}`
})));
const started = performance.now();
const visible = largeCatalog.filter(entry => trackMatchesEditorialFilters(entry, moodOrState));
const elapsed = performance.now() - started;
assert.equal(visible.length, 3334);
assert.ok(elapsed < 500, `Filtering 5000 tracks took ${elapsed.toFixed(1)} ms.`);

const engine = fs.readFileSync('js/app-engine.js', 'utf8');
assert.match(engine, /css\/catalog-filters\.css/);
assert.match(engine, /features\/catalog-filters\.js/);
assert.match(engine, /initCatalogFilters\(\)/);

const remoteCatalog = fs.readFileSync('js/core/remote-catalog.js', 'utf8');
assert.match(remoteCatalog, /remoteMetadata:\s*\{[\s\S]*genres,[\s\S]*moods/);
assert.match(remoteCatalog, /timestampsAvailable: timestampState/);

const styles = fs.readFileSync('css/catalog-filters.css', 'utf8');
assert.match(styles, /catalog-filter-panel/);
assert.match(styles, /@media\(max-width:760px\)/);
assert.match(styles, /catalog-filter-backdrop/);

console.log('Feature 09 editorial filters normalize aliases, preserve live Lyrics search and remain fast.');
