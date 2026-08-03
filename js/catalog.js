const MEDIA_ORIGIN = 'https://launchpad-media.jerryquinet.workers.dev';
const r2Audio = slug => `${MEDIA_ORIGIN}/media/${encodeURIComponent(slug)}/audio/audio.mp3`;
const r2Thumbnail = slug => `${MEDIA_ORIGIN}/media/${encodeURIComponent(slug)}/thumbnail/thumbnail.webp`;
const r2Cover = (slug, extension = 'jpeg') => `${MEDIA_ORIGIN}/media/${encodeURIComponent(slug)}/cover/cover.${extension}`;
const r2Lyrics = slug => `${MEDIA_ORIGIN}/media/${encodeURIComponent(slug)}/lyrics/lyrics.txt`;

export const albums = [
  {
    id: 'neon-heartbreaks',
    title: 'Neon Heartbreaks',
    type: 'album',
    year: '2026',
    cover: 'assets/neon-heartbreaks.jpeg',
    description:
      'Digital intimacy, nocturnal R&B and fragile connections shaped through glitch and emotion.'
  },
  {
    id: 'coal-to-diamond',
    title: 'Coal to Diamond',
    type: 'album',
    year: '2026',
    cover: 'assets/coal-to-diamond.jpeg',
    description:
      'Heavy 808s and drums, cinematic pressure and hip-hop built around impact.'
  },
  {
    id: 'love-letters-from-saigon',
    title: 'Love Letters from Saigon',
    type: 'album',
    year: '2026',
    cover: 'assets/love-letters.jpeg',
    description:
      'Vietnam-inspired stories, distance, travel memories and love songs moving between two countries.'
  },
  {
    id: 'singles',
    title: 'Singles',
    type: 'singles',
    year: '2026',
    cover: 'assets/singles.jpeg',
    description:
      'Standalone drops and experimental cuts capturing raw energy outside the album format.'
  }
];


export const journeyEras = [
  {
    id: 'neon-heartbreaks',
    albumId: 'neon-heartbreaks',
    heading: 'Digital intimacy',
    description: 'Glitched romance, close-mic emotion and nocturnal R&B built around fragile connections.',
    featuredTrackIds: ['before-the-noise', 'low-bitrate-love']
  },
  {
    id: 'coal-to-diamond',
    albumId: 'coal-to-diamond',
    heading: 'Pressure into power',
    description: 'Heavy drums, confidence, resilience and cinematic hip-hop with a sharper, more physical edge.',
    featuredTrackIds: ['thick', 'carved-from-pressure']
  },
  {
    id: 'love-letters-from-saigon',
    albumId: 'love-letters-from-saigon',
    heading: 'Distance becomes a place',
    description: 'Vietnamese influences, travel memories and love songs shaped by two countries and one relationship.',
    featuredTrackIds: ['saigon-bound', 'tinh-bolero-cho-tran']
  },
  {
    id: 'singles',
    albumId: 'singles',
    heading: 'Signals outside the albums',
    description: 'Standalone releases and experiments that expand the SHINOBIWAN universe between larger projects.',
    featuredTrackIds: ['ghost-signal', 'husband']
  }
];

export const tracks = [
  {
    id: 'before-the-noise',
    title: 'Before the Noise',
    file: r2Audio('before-the-noise'),
    cover: r2Thumbnail('before-the-noise'),
    fullCover: r2Cover('before-the-noise'),
    genre: 'R&B',
    tags: ['R&B'],
    mood: 'Digital melancholy',
    albumId: 'neon-heartbreaks',
    album: 'Neon Heartbreaks',
    lyrics: r2Lyrics('before-the-noise'),
    accent: '#b746ff',
    accent2: '#4c7dff'
  },
  {
    id: 'low-bitrate-love',
    title: 'Low Bitrate Love',
    file: r2Audio('low-bitrate-love'),
    cover: r2Thumbnail('low-bitrate-love'),
    fullCover: r2Cover('low-bitrate-love'),
    genre: 'Love',
    tags: ['Love', 'R&B'],
    mood: 'Romantic glitch',
    albumId: 'neon-heartbreaks',
    album: 'Neon Heartbreaks',
    lyrics: r2Lyrics('low-bitrate-love'),
    accent: '#ff4fd8',
    accent2: '#7c4dff'
  },
  {
    id: 'thick',
    title: 'THICK',
    file: r2Audio('thick'),
    cover: r2Thumbnail('thick'),
    fullCover: r2Cover('thick'),
    genre: 'Hip-hop',
    tags: ['Hip-hop'],
    mood: 'Heavy confidence',
    albumId: 'coal-to-diamond',
    album: 'Coal to Diamond',
    lyrics: r2Lyrics('thick'),
    accent: '#ff3f5f',
    accent2: '#7d34ff'
  },
  {
    id: 'real-love-doesnt-rush',
    title: 'Real Love Doesn’t Rush',
    file: r2Audio('real-love-doesnt-rush'),
    cover: r2Thumbnail('real-love-doesnt-rush'),
    fullCover: r2Cover('real-love-doesnt-rush'),
    genre: 'Love',
    tags: ['Love', 'R&B'],
    mood: 'Slow soul',
    albumId: 'neon-heartbreaks',
    album: 'Neon Heartbreaks',
    lyrics: r2Lyrics('real-love-doesnt-rush'),
    accent: '#ff5a9d',
    accent2: '#8e5bff'
  },
  {
    id: 'jusquau-dernier-souffle',
    title: 'Jusqu’au dernier souffle',
    file: r2Audio('jusquau-dernier-souffle'),
    cover: r2Thumbnail('jusquau-dernier-souffle'),
    fullCover: r2Cover('jusquau-dernier-souffle'),
    genre: 'R&B',
    tags: ['R&B', 'Love', 'French'],
    mood: 'French Tango',
    albumId: 'love-letters-from-saigon',
    album: 'Love Letters from Saigon',
    lyrics: r2Lyrics('jusquau-dernier-souffle'),
    accent: '#d13cff',
    accent2: '#ff4b74'
  },
  {
    id: 'tinh-bolero-cho-tran',
    title: 'Tình Bolero Cho Trân',
    file: r2Audio('tinh-bolero-cho-tran'),
    cover: r2Thumbnail('tinh-bolero-cho-tran'),
    fullCover: r2Cover('tinh-bolero-cho-tran', 'png'),
    genre: 'Vietnam',
    tags: ['Vietnam', 'Love'],
    mood: 'Vietnamese love',
    albumId: 'love-letters-from-saigon',
    album: 'Love Letters from Saigon',
    lyrics: r2Lyrics('tinh-bolero-cho-tran'),
    accent: '#f2b84b',
    accent2: '#e45585'
  },
  {
    id: 'saigon-bound',
    title: 'Saigon Bound',
    file: r2Audio('saigon-bound'),
    cover: r2Thumbnail('saigon-bound'),
    fullCover: r2Cover('saigon-bound', 'png'),
    genre: 'Vietnam',
    tags: ['Vietnam', 'Hip-hop'],
    mood: 'Travel story',
    albumId: 'love-letters-from-saigon',
    album: 'Love Letters from Saigon',
    lyrics: r2Lyrics('saigon-bound'),
    accent: '#ff8a3d',
    accent2: '#d93cff'
  },
  {
    id: 'the-throne-resonates',
    title: 'The Throne Resonates',
    file: r2Audio('the-throne-resonates'),
    cover: r2Thumbnail('the-throne-resonates'),
    fullCover: r2Cover('the-throne-resonates'),
    genre: 'Hip-hop',
    tags: ['Hip-hop'],
    mood: 'Epic energy',
    albumId: 'coal-to-diamond',
    album: 'Coal to Diamond',
    lyrics: r2Lyrics('the-throne-resonates'),
    accent: '#f0b34a',
    accent2: '#7c47ff'
  },
  {
    id: 'carved-from-pressure',
    title: 'Carved from Pressure',
    file: r2Audio('carved-from-pressure'),
    cover: r2Thumbnail('carved-from-pressure'),
    fullCover: r2Cover('carved-from-pressure'),
    genre: 'Hip-hop',
    tags: ['Hip-hop'],
    mood: 'Resilience',
    albumId: 'coal-to-diamond',
    album: 'Coal to Diamond',
    lyrics: r2Lyrics('carved-from-pressure'),
    accent: '#ff4f52',
    accent2: '#9b3dff'
  },
  {
    id: 'ligne-3',
    title: 'Ligne 3',
    file: r2Audio('ligne-3'),
    cover: r2Thumbnail('ligne-3'),
    fullCover: r2Cover('ligne-3'),
    genre: 'Hip-hop',
    tags: ['Hip-hop', 'French'],
    mood: 'Urban satire',
    albumId: 'singles',
    album: 'Singles',
    lyrics: r2Lyrics('ligne-3'),
    accent: '#f1c75b',
    accent2: '#e14f4f'
  },
  {
    id: 'obey',
    title: 'OBEY!',
    file: r2Audio('obey'),
    cover: r2Thumbnail('obey'),
    fullCover: r2Cover('obey'),
    genre: 'Hip-hop',
    tags: ['Hip-hop'],
    mood: 'Puppet Master',
    albumId: 'coal-to-diamond',
    album: 'Coal to Diamond',
    lyrics: null,
    accent: '#d4a63a',
    accent2: '#b41f3c'
  },
  {
    id: 'close-to-you',
    title: 'Close to You',
    file: r2Audio('close-to-you'),
    cover: r2Thumbnail('close-to-you'),
    fullCover: r2Cover('close-to-you'),
    genre: 'Dancehall',
    tags: ['Dancehall', 'Love'],
    mood: 'Tropical House, Reggae Fusion',
    albumId: 'singles',
    album: 'Singles',
    lyrics: null,
    accent: '#ff9c45',
    accent2: '#ff4f8b'
  },
  {
    id: 'ghost-signal',
    title: 'Ghost Signal',
    file: r2Audio('ghost-signal'),
    cover: r2Thumbnail('ghost-signal'),
    fullCover: r2Cover('ghost-signal'),
    genre: 'R&B',
    tags: ['R&B', 'Love'],
    mood: 'Future R&B, Synthwave, Electronic Pop',
    albumId: 'singles',
    album: 'Singles',
    lyrics: null,
    accent: '#41d6ff',
    accent2: '#8a52ff'
  },
  {
    id: 'husband',
    title: 'HUSBAND',
    file: r2Audio('husband'),
    cover: r2Thumbnail('husband'),
    fullCover: r2Cover('husband'),
    genre: 'Hip-hop',
    tags: ['Hip-hop', 'Love'],
    mood: 'Female Trap, Superman Husband',
    albumId: 'singles',
    album: 'Singles',
    lyrics: null,
    accent: '#ff4d8d',
    accent2: '#4b6fff'
  }
];

tracks.forEach(track => {
  const tags = Array.isArray(track.tags)
    ? track.tags
    : [track.genre];

  track.tags = [
    ...new Set([...tags, track.genre].filter(Boolean))
  ];

  track.searchText = [
    track.title,
    track.genre,
    track.tags.join(' '),
    track.mood,
    track.album
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
});
