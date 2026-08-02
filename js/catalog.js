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
    file: 'audio/before-the-noise.mp3',
    cover: 'assets/before-the-noise.jpeg',
    genre: 'R&B',
    tags: ['R&B'],
    mood: 'Digital melancholy',
    albumId: 'neon-heartbreaks',
    album: 'Neon Heartbreaks',
    lyrics: 'assets/lyrics/before-the-noise.txt',
    accent: '#b746ff',
    accent2: '#4c7dff'
  },
  {
    id: 'low-bitrate-love',
    title: 'Low Bitrate Love',
    file: 'audio/low-bitrate-love.mp3',
    cover: 'assets/low-bitrate-love.jpeg',
    genre: 'Love',
    tags: ['Love', 'R&B'],
    mood: 'Romantic glitch',
    albumId: 'neon-heartbreaks',
    album: 'Neon Heartbreaks',
    lyrics: 'assets/lyrics/low-bitrate-love.txt',
    accent: '#ff4fd8',
    accent2: '#7c4dff'
  },
  {
    id: 'thick',
    title: 'THICK',
    file: 'audio/thick.mp3',
    cover: 'assets/thick.jpeg',
    genre: 'Hip-hop',
    tags: ['Hip-hop'],
    mood: 'Heavy confidence',
    albumId: 'coal-to-diamond',
    album: 'Coal to Diamond',
    lyrics: 'assets/lyrics/thick.txt',
    accent: '#ff3f5f',
    accent2: '#7d34ff'
  },
  {
    id: 'real-love-doesnt-rush',
    title: 'Real Love Doesn’t Rush',
    file: 'audio/real-love-doesnt-rush.mp3',
    cover: 'assets/real-love-doesnt-rush.jpeg',
    genre: 'Love',
    tags: ['Love', 'R&B'],
    mood: 'Slow soul',
    albumId: 'neon-heartbreaks',
    album: 'Neon Heartbreaks',
    lyrics: 'assets/lyrics/real-love-doesnt-rush.txt',
    accent: '#ff5a9d',
    accent2: '#8e5bff'
  },
  {
    id: 'jusquau-dernier-souffle',
    title: 'Jusqu’au dernier souffle',
    file: 'audio/jusquau-dernier-souffle.mp3',
    cover: 'assets/jusquau-dernier-souffle.jpeg',
    genre: 'R&B',
    tags: ['R&B', 'Love', 'French'],
    mood: 'French Tango',
    albumId: 'love-letters-from-saigon',
    album: 'Love Letters from Saigon',
    lyrics: 'assets/lyrics/jusquau-dernier-souffle.txt',
    accent: '#d13cff',
    accent2: '#ff4b74'
  },
  {
    id: 'tinh-bolero-cho-tran',
    title: 'Tình Bolero Cho Trân',
    file: 'audio/tinh-bolero-cho-tran.mp3',
    cover: 'assets/tinh-bolero-cho-tran.png',
    genre: 'Vietnam',
    tags: ['Vietnam', 'Love'],
    mood: 'Vietnamese love',
    albumId: 'love-letters-from-saigon',
    album: 'Love Letters from Saigon',
    lyrics: 'assets/lyrics/tinh-bolero-cho-tran.txt',
    accent: '#f2b84b',
    accent2: '#e45585'
  },
  {
    id: 'saigon-bound',
    title: 'Saigon Bound',
    file: 'audio/saigon-bound.mp3',
    cover: 'assets/saigon-bound.png',
    genre: 'Vietnam',
    tags: ['Vietnam', 'Hip-hop'],
    mood: 'Travel story',
    albumId: 'love-letters-from-saigon',
    album: 'Love Letters from Saigon',
    lyrics: 'assets/lyrics/saigon-bound.txt',
    accent: '#ff8a3d',
    accent2: '#d93cff'
  },
  {
    id: 'the-throne-resonates',
    title: 'The Throne Resonates',
    file: 'audio/the-throne-resonates.mp3',
    cover: 'assets/the-throne-resonates.jpeg',
    genre: 'Hip-hop',
    tags: ['Hip-hop'],
    mood: 'Epic energy',
    albumId: 'coal-to-diamond',
    album: 'Coal to Diamond',
    lyrics: 'assets/lyrics/the-throne-resonates.txt',
    accent: '#f0b34a',
    accent2: '#7c47ff'
  },
  {
    id: 'carved-from-pressure',
    title: 'Carved from Pressure',
    file: 'audio/carved-from-pressure.mp3',
    cover: 'assets/carved-from-pressure.jpeg',
    genre: 'Hip-hop',
    tags: ['Hip-hop'],
    mood: 'Resilience',
    albumId: 'coal-to-diamond',
    album: 'Coal to Diamond',
    lyrics: 'assets/lyrics/carved-from-pressure.txt',
    accent: '#ff4f52',
    accent2: '#9b3dff'
  },
  {
    id: 'ligne-3',
    title: 'Ligne 3',
    file: 'audio/ligne-3.mp3',
    cover: 'assets/ligne3.jpeg',
    genre: 'Hip-hop',
    tags: ['Hip-hop', 'French'],
    mood: 'Urban satire',
    albumId: 'singles',
    album: 'Singles',
    lyrics: 'assets/lyrics/ligne3.txt',
    accent: '#f1c75b',
    accent2: '#e14f4f'
  },
  {
    id: 'obey',
    title: 'OBEY!',
    file: 'audio/albums/coal-to-diamond/obey.mp3',
    cover: 'assets/covers/albums/coal-to-diamond/obey.jpeg',
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
    file: 'audio/singles/close-to-you.mp3',
    cover: 'assets/covers/singles/close-to-you.jpeg',
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
    file: 'audio/singles/ghost-signal.mp3',
    cover: 'assets/covers/singles/ghost-signal.jpeg',
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
    file: 'audio/singles/husband.mp3',
    cover: 'assets/covers/singles/husband.jpeg',
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
