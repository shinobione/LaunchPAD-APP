# SHINOBIWAN catalog workflow

The Albums page is generated automatically from `js/catalog.js`.
Tracks sharing the same `album` value are grouped into the same project.

## Recommended folders

```text
assets/
  covers/
    my-album/
      album-cover.jpg
      track-cover.jpg
  lyrics/
    my-track.txt
audio/
  my-album/
    my-track.mp3
```

Existing files can remain where they are. This structure is recommended for future releases.

## Add one track

1. Upload its audio file, cover and optional lyrics file.
2. Open `js/catalog.js`.
3. Duplicate an existing track object and edit its values.

Example:

```js
{
  id: 'unique-track-id',
  title: 'My New Track',
  album: 'My New Album',
  genre: 'Hip-hop',
  mood: 'Cinematic pressure',
  cover: 'assets/covers/my-new-album/my-new-track.jpg',
  file: 'audio/my-new-album/my-new-track.mp3',
  lyrics: 'assets/lyrics/my-new-track.txt'
}
```

Use `lyrics: null` when no lyrics file is available.

## Add an album

Use exactly the same `album` value for every track belonging to that album.
The Albums page will automatically create one project card, count its tracks and combine its tags.

## Add a single

Use:

```js
album: 'Singles'
```

or use a dedicated project name if the single needs its own card.

## Lyrics format

Timestamped lyrics are recommended:

```text
00:12.40
First lyric line
00:16.80
Second lyric line
```

Plain text lyrics are also supported, but they will not follow playback line by line.

## Tags

The current interface derives tags automatically from:

- `genre`
- the presence of a `lyrics` file

Suggested genre values include:

- `R&B`
- `Hip-hop`
- `Love`
- `Vietnam`

New genre values are allowed. They will automatically appear in the Albums page and Catalog DNA chart.

## Before committing

- Use lowercase file names without spaces when possible.
- Prefer `.jpg` or `.webp` covers.
- Compress MP3 files before uploading.
- Verify every path and its exact capitalization; GitHub Pages is case-sensitive.
