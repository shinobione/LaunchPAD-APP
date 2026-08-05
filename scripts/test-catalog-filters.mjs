import assert from 'node:assert/strict';
import {
  buildEditorialCatalogIndex,
  catalogTrackFacets,
  countActiveCatalogFilters,
  createEmptyCatalogFilterState,
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
assert.deepEqual(catalogTrackFacets(tracks[0]).synced, ['synchronized']);
assert.deepEqual(catalogTrackFacets(tracks[2]).era, []);
assert.deepEqual(catalogTrackFacets(tracks[2]).content, []);

const state = createEmptyCatalogFilterState();
assert.equal(countActiveCatalogFilters(state), 0);
assert.ok(index.every(entry => trackMatchesEditorialFilters(entry, state)));

state.era.add('My Tyffany Era');
state.energy.add('High');
state.genre.add('R&B');
state.language.add('English');
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
moodOrState.mood.add('Romantic');
moodOrState.mood.add('Aggressive');
assert.equal(trackMatchesEditorialFilters(index[0], moodOrState), true);
assert.equal(trackMatchesEditorialFilters(index[1], moodOrState), true);
assert.equal(trackMatchesEditorialFilters(index[2], moodOrState), false);

const parsed = readCatalogFilterStateFromUrl(
  'https://launchpad.test/?cf_era=My%20Tyffany%20Era&cf_genre=R%26B&cf_genre=Pop&cf_synced=synchronized#library'
);
assert.deepEqual([...parsed.era], ['My Tyffany Era']);
assert.deepEqual([...parsed.genre], ['R&B', 'Pop']);
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

console.log('Feature 09 editorial filters combine R2 metadata safely and quickly.');
