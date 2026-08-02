const genrePalettes = {
  'R&B': ['#a63cff', '#5c6cff'],
  Love: ['#e64d9b', '#8a55ff'],
  'Hip-hop': ['#ff4d68', '#8d3cff'],
  Vietnam: ['#ff9955', '#d83cff'],
  Dancehall: ['#ff9a3c', '#ff4d8d']
};

export function getTrackPalette(track) {
  const fallback = genrePalettes[track?.genre] || genrePalettes['R&B'];
  return [track?.accent || fallback[0], track?.accent2 || fallback[1]];
}

export function applyTrackTheme(track, root = document.documentElement) {
  const [accent, accent2] = getTrackPalette(track);
  root.style.setProperty('--accent', accent);
  root.style.setProperty('--accent2', accent2);
  root.dataset.trackTheme = track?.id || '';
  return [accent, accent2];
}
