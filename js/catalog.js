export const albums = [
  {
    id: 'neon-heartbreaks',
    title: 'Neon Heartbreaks',
    type: 'album',
    year: '2026',
    cover: 'assets/neon-heartbreaks.jpeg',
    description: 'Digital intimacy, nocturnal R&B and fragile connections shaped through glitch and emotion.'
  },
  {
    id: 'coal-to-diamond',
    title: 'Coal to Diamond',
    type: 'album',
    year: '2026',
    cover: 'assets/coal-to-diamond.jpeg',
    description: 'Heavy drums, cinematic pressure and hip-hop built around confidence, resilience and impact.'
  },
  {
    id: 'love-letters-from-saigon',
    title: 'Love Letters from Saigon',
    type: 'album',
    year: '2026',
    cover: 'assets/love-letters.jpeg',
    description: 'Vietnam-inspired stories, distance, travel memories and love songs moving between two countries.'
  }
];

export const tracks = [
  { id:'before-the-noise', title:'Before the Noise', file:'audio/before-the-noise.mp3', cover:'assets/before-the-noise.jpeg', genre:'R&B', tags:['R&B'], mood:'Digital melancholy', albumId:'neon-heartbreaks', album:'Neon Heartbreaks', lyrics:'assets/lyrics/before-the-noise.txt' },
  { id:'low-bitrate-love', title:'Low Bitrate Love', file:'audio/low-bitrate-love.mp3', cover:'assets/low-bitrate-love.jpeg', genre:'Love', tags:['Love','R&B'], mood:'Romantic glitch', albumId:'neon-heartbreaks', album:'Neon Heartbreaks', lyrics:'assets/lyrics/low-bitrate-love.txt' },
  { id:'thick', title:'THICK', file:'audio/thick.mp3', cover:'assets/thick.jpeg', genre:'Hip-hop', tags:['Hip-hop'], mood:'Heavy confidence', albumId:'coal-to-diamond', album:'Coal to Diamond', lyrics:'assets/lyrics/thick.txt' },
  { id:'real-love-doesnt-rush', title:'Real Love Doesn’t Rush', file:'audio/real-love-doesnt-rush.mp3', cover:'assets/real-love-doesnt-rush.jpeg', genre:'Love', tags:['Love','R&B'], mood:'Slow soul', albumId:'neon-heartbreaks', album:'Neon Heartbreaks', lyrics:'assets/lyrics/real-love-doesnt-rush.txt' },
  { id:'jusquau-dernier-souffle', title:'Jusqu’au dernier souffle', file:'audio/jusquau-dernier-souffle.mp3', cover:'assets/jusquau-dernier-souffle.jpeg', genre:'R&B', tags:['R&B','Love'], mood:'French cinematic', albumId:'love-letters-from-saigon', album:'Love Letters from Saigon', lyrics:'assets/lyrics/jusquau-dernier-souffle.txt' },
  { id:'tinh-bolero-cho-tran', title:'Tình Bolero Cho Trân', file:'audio/tinh-bolero-cho-tran.mp3', cover:'assets/tinh-bolero-cho-tran.png', genre:'Vietnam', tags:['Vietnam','Love'], mood:'Vietnamese love', albumId:'love-letters-from-saigon', album:'Love Letters from Saigon', lyrics:'assets/lyrics/tinh-bolero-cho-tran.txt' },
  { id:'saigon-bound', title:'Saigon Bound', file:'audio/saigon-bound.mp3', cover:'assets/saigon-bound.png', genre:'Vietnam', tags:['Vietnam','Hip-hop'], mood:'Travel story', albumId:'love-letters-from-saigon', album:'Love Letters from Saigon', lyrics:'assets/lyrics/saigon-bound.txt' },
  { id:'the-throne-resonates', title:'The Throne Resonates', file:'audio/the-throne-resonates.mp3', cover:'assets/the-throne-resonates.jpeg', genre:'Hip-hop', tags:['Hip-hop'], mood:'Epic energy', albumId:'coal-to-diamond', album:'Coal to Diamond', lyrics:'assets/lyrics/the-throne-resonates.txt' },
  { id:'carved-from-pressure', title:'Carved from Pressure', file:'audio/carved-from-pressure.mp3', cover:'assets/carved-from-pressure.jpeg', genre:'Hip-hop', tags:['Hip-hop'], mood:'Resilience', albumId:'coal-to-diamond', album:'Coal to Diamond', lyrics:'assets/lyrics/carved-from-pressure.txt' },
  { id:'ligne-3', title:'Ligne 3', file:'audio/ligne-3.mp3', cover:'assets/ligne3.jpeg', genre:'Hip-hop', tags:['Hip-hop'], mood:'Urban satire', albumId:'coal-to-diamond', album:'Coal to Diamond', lyrics:'assets/lyrics/ligne3.txt' }
];

tracks.forEach(track => {
  const tags = Array.isArray(track.tags) ? track.tags : [track.genre];
  track.tags = [...new Set([...tags, track.genre].filter(Boolean))];
  track.searchText = `${track.title} ${track.genre} ${track.tags.join(' ')} ${track.mood} ${track.album}`.toLowerCase();
});