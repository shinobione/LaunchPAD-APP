import fs from 'node:fs';
import assert from 'node:assert/strict';

const sourcePath = 'cloudflare/admin-worker.parts/08-ui-e.part';
const source = fs.readFileSync(sourcePath, 'utf8');
const start = source.indexOf('var TXT_METADATA_FIELD_MAP=');
const end = source.indexOf('function slugifyImportedTitle', start);

if (start < 0 || end < 0) {
  throw new Error('Unable to locate the embedded TXT metadata parser.');
}

const split = value => String(value || '')
  .split(',')
  .map(item => item.trim())
  .filter(Boolean);

const buildParser = new Function(
  'split',
  `${source.slice(start, end)}; return parseLyricsTxtMetadata;`
);
const parseLyricsTxtMetadata = buildParser(split);

const weaponIsFed = `TITLE: Weapon is FED
TYPE: Single
YEAR: 2026
GENRE: British Rap, UK Street Rap, Gritty Narrative Rap, Drill Hybrid
MOOD: Dark, Desperate, Tragic, Haunted, Tense, Aggressive
THEMES: Survival, Street narrative, Addiction, Power, Reflection, Redemption
ERA: Kinetic Flow Era
ENERGY: High
LANGUAGE: English

LYRICS:
[00:03.85] Pah Pah Pah Pah Pah Pah!
[00:21.33] I don't enter the function, I rewrite the axes`;

const parsed = parseLyricsTxtMetadata(weaponIsFed);
assert.equal(parsed.lyricsFound, true);
assert.equal(parsed.timestampCount, 2);
assert.deepEqual(parsed.metadata, {
  title: 'Weapon is FED',
  type: 'single',
  year: '2026',
  genres: 'British Rap, UK Street Rap, Gritty Narrative Rap, Drill Hybrid',
  moods: 'Dark, Desperate, Tragic, Haunted, Tense, Aggressive',
  themes: 'Survival, Street narrative, Addiction, Power, Reflection, Redemption',
  era: 'Kinetic Flow Era',
  energy: 'High',
  languages: 'English'
});

const aliases = parseLyricsTxtMetadata(`TITRE: Test français
ANNÉE: 2027
ÉNERGIE: Medium
LANGUES: French, Vietnamese
STATUT: published
DURÉE: 03:57
EXPLICIT: clean
LYRICS:
[00:01.00] Test`);
assert.deepEqual(aliases.metadata, {
  title: 'Test français',
  year: '2027',
  energy: 'Medium',
  languages: 'French, Vietnamese',
  status: 'published',
  duration: '03:57',
  explicit: 'false'
});

console.log('Lyrics TXT metadata parser validated with English and French headers.');
