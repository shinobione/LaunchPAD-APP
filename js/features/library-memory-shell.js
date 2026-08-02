export function prepareLibraryMemoryShell() {
  const nav = document.querySelector('.main-nav');
  if (nav && !nav.querySelector('[data-view="favorites"]')) {
    const button = document.createElement('button');
    button.className = 'nav-item';
    button.dataset.view = 'favorites';
    button.innerHTML = '<span aria-hidden="true">♥</span><span>Favorites</span>';
    button.setAttribute('aria-label', 'Favorites and listening history');

    const library = nav.querySelector('[data-view="library"]');
    library?.insertAdjacentElement('afterend', button);
    if (!library) nav.appendChild(button);
  }

  if (!document.querySelector('#view-favorites')) {
    const view = document.createElement('section');
    view.id = 'view-favorites';
    view.className = 'view memory-view';
    const main = document.querySelector('.main-content');
    const about = document.querySelector('#view-about');
    main?.insertBefore(view, about || null);
  }
}
