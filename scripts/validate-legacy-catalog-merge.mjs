import fs from 'node:fs';
import { getTrack, mergeRemoteTracks } from '../js/core/catalog-store.js';

const fail = message => { throw new Error(message); };

mergeRemoteTracks([{
  id: 'before-the-noise',
  title: 'Before the Noise',
  genre: 'Hip-hop',
  tags: ['Hip-hop', 'Boom Bap', 'Lo-fi'],
  mood: 'Digital melancholy',
  albumId: 'neon-heartbreaks',
  album: 'Neon Heartbreaks',
  file: 'https://media.example/audio.mp3',
  cover: 'https://media.example/cover.webp',
  lyrics: 'https://media.example/lyrics.txt',
  accent: '#ef9542',
  accent2: '#7f8c83',
  duration: 237,
  remote: true
}]);

const track = getTrack('before-the-noise');
if (track.genre !== 'Hip-hop') fail('Remote genre must replace bundled legacy metadata.');
if (!track.tags.includes('Boom Bap') || !track.tags.includes('Lo-fi')) {
  fail('Remote secondary genres must survive the legacy merge.');
}
if (track.accent !== '#ef9542' || track.accent2 !== '#7f8c83') {
  fail('Remote theme colours must replace bundled legacy colours.');
}
if (track.duration !== 237) fail('Remote canonical duration must replace bundled metadata.');
if (Object.hasOwn(track, 'fallbackFile')) fail('Legacy fallbackFile metadata must not survive the merge.');
if (track.file !== 'https://media.example/audio.mp3') fail('Remote R2 audio must replace bundled audio.');

const adminSource = fs.readdirSync('cloudflare/admin-worker.parts')
  .filter(filename => filename.endsWith('.part'))
  .sort((left, right) => left.localeCompare(right, 'en', { numeric: true }))
  .map(filename => fs.readFileSync(`cloudflare/admin-worker.parts/${filename}`, 'utf8'))
  .join('');

for (const required of [
  'Durée (mm:ss)',
  'formatDurationInput',
  'parseDurationInput',
  'duration:duration'
]) {
  if (!adminSource.includes(required)) fail(`Track Manager duration flow is missing ${required}.`);
}

console.log('Remote catalog overrides and canonical mm:ss durations are covered without legacy audio fallback.');

