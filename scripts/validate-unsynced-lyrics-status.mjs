import fs from 'node:fs';

const source = fs.readFileSync('js/features/lyrics/lyrics-engine.js', 'utf8');
const required = [
  "synchronized ? 'SYNC READY' : 'TEXT READY'",
  "`${lines.length} LINES • NOT TIMESTAMPED`",
  "button.className = `lyric-line${Number.isFinite(line.time) ? '' : ' unsynced'}`"
];

for (const marker of required) {
  if (!source.includes(marker)) {
    throw new Error(`Lyrics reader no longer exposes the unsynchronized state clearly: ${marker}`);
  }
}

console.log('Lyrics without timestamps remain explicitly labelled TEXT READY and NOT TIMESTAMPED.');
