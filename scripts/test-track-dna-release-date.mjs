import assert from 'node:assert/strict';
import fs from 'node:fs';

const source = fs.readFileSync('js/features/player-experience.js', 'utf8');
const body = source.match(/function formatReleaseDate\(value\) \{([\s\S]*?)\n\}/)?.[1];
assert.ok(body, 'Track DNA release-date formatter must remain extractable.');

assert.ok(
  source.includes('const date = new Date(value);'),
  'Track DNA must parse the normalized catalog release date directly.',
);
assert.ok(
  !source.includes('new Date(`${value}T00:00:00`)'),
  'Track DNA must not append a second time component to normalized ISO dates.',
);

const formatReleaseDate = new Function('value', body);
const expected = '09 Aug 2026';

assert.equal(formatReleaseDate('2026-08-09'), expected, 'Date-only catalog values must render.');
assert.equal(
  formatReleaseDate('2026-08-09T00:00:00.000Z'),
  expected,
  'Normalized ISO catalog values must render instead of falling back to Date TBD.',
);
assert.equal(formatReleaseDate(''), 'Date TBD');
assert.equal(formatReleaseDate(null), 'Date TBD');
assert.equal(formatReleaseDate('not-a-date'), 'Date TBD');

console.log('Track DNA release-date guard passed: date-only and normalized ISO values render consistently.');
