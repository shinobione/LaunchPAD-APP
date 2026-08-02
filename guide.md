# SHINOBIWAN Launchpad — catalogue guide

The catalogue is split into two files so musical content and technical metadata stay easy to maintain.

- `js/catalog.js`: identity, paths, album, genre, tags, mood, lyrics and colours.
- `js/catalog-metadata.js`: release date, language, BPM, musical key, explicit status and measured duration.

Both files use the same permanent track `id`. Never change an existing ID after publishing a shareable link.

## Add or update a track

First add the track to `tracks` in `js/catalog.js`:

```js
{
  id: 'new-track',
  title: 'New Track',
  file: 'audio/singles/new-track.mp3',
  cover: 'assets/covers/singles/new-track.jpeg',
  genre: 'R&B',
  tags: ['R&B', 'Love'],
  mood: 'Nocturnal emotion',
  albumId: 'singles',
  album: 'Singles',
  lyrics: null,
  accent: '#d450ff',
  accent2: '#4f70ff'
}
```

Then add the matching entry to `trackMetadata` in `js/catalog-metadata.js`:

```js
'new-track': {
  releaseDate: '2026-08-02',
  languages: ['English'],
  bpm: 142,
  key: 'F minor',
  keyConfidence: 1,
  explicit: false,
  duration: 213.42
}
```

Every track must have one metadata entry, and every metadata ID must correspond to a real track.

## Metadata fields

### `releaseDate`

Use an ISO date in `YYYY-MM-DD` format:

```js
releaseDate: '2026-08-02'
```

Use `null` while the exact date is unknown. Do not enter an approximate or invented date. Home's **Latest releases** prioritizes dated tracks from newest to oldest; undated tracks fall back to catalogue order.

### `languages`

Use an array containing one or more of these exact values:

```js
languages: ['French']
languages: ['English']
languages: ['Vietnamese']
languages: ['French', 'English']
```

The spelling and capitalization are validated automatically.

### `bpm`

Use a whole number between 30 and 240:

```js
bpm: 142
```

The current values were estimated from the audio files. Confirm the final tempo in the DAW when possible, especially when a track uses half-time, double-time or tempo changes.

### `key`

Use an English note name followed by `major` or `minor`:

```js
key: 'C major'
key: 'F# minor'
key: 'Bb major'
```

`keyConfidence` is a number from `0` to `1` describing confidence in the automatic analysis. Values below `0.5` generate a warning and should be checked in the DAW.

```js
keyConfidence: 0.82
```

### `explicit`

Use one of three values:

```js
explicit: true   // reviewed and explicit
explicit: false  // reviewed and clean
explicit: null   // not reviewed yet
```

`null` is displayed as **UNRATED** and generates a catalogue warning. It is safer than guessing.

### `duration`

Use the measured duration in seconds:

```js
duration: 213.42
```

Album pages use this value immediately. The browser can still read MP3 metadata as a fallback when the field is absent, but validated releases should contain it.

### `accent` and `accent2`

These fields stay in `js/catalog.js`. Use six-digit hexadecimal colours:

```js
accent: '#d450ff',
accent2: '#4f70ff'
```

They control the player, buttons, Track DNA accents and Audio Lab animations.

## Add an album

Add the album to `albums` in `js/catalog.js`:

```js
{
  id: 'new-album',
  title: 'New Album',
  type: 'album',
  year: '2026',
  cover: 'assets/covers/albums/new-album/cover.jpeg',
  description: 'Short editorial description.'
}
```

Each album track must then use the exact same `albumId` and display title.

## Validation

Run this before publishing:

```bash
npm run validate:catalog
```

The validator checks IDs, albums, audio files, covers, lyrics, colours, dates, languages, BPM, keys, confidence, explicit status and duration. GitHub Actions repeats the same validation and opens the Launchpad in Chrome before a branch can be merged.

Warnings do not necessarily block deployment, but they identify metadata that still requires editorial review.
