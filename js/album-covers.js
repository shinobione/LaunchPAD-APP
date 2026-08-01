import { albums } from './catalog.js';

export function applyAlbumCovers() {
  const coversByTitle = new Map(
    albums.map(album => [album.title.trim(), album.cover])
  );

  document.querySelectorAll('.project-album').forEach(card => {
    const title = card.querySelector('.project-album-copy h2')?.textContent.trim();
    const image = card.querySelector('.project-album-cover');
    const cover = title ? coversByTitle.get(title) : null;

    if (image && cover) {
      image.src = cover;
      image.alt = `${title} album cover`;
    }
  });
}
