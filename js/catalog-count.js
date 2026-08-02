import { tracks } from './catalog.js';

export function syncCatalogCount() {
  const count = tracks.length;
  const label = `${count} TRACK${count === 1 ? '' : 'S'}`;

  document.querySelectorAll('.catalog-badge strong').forEach(element => {
    element.textContent = label;
  });

  document.querySelectorAll('[data-catalog-count]').forEach(element => {
    element.textContent = String(count);
  });
}
