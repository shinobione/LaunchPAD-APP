const FAVICON_PATH = 'assets/favicon-v3.svg?v=20260801d';
const FAVICON_HREF = new URL(FAVICON_PATH, document.baseURI).href;
let applying = false;

function applyFavicon() {
  if (applying) return;
  applying = true;

  try {
    const head = document.head;
    let icon = head.querySelector('link[data-shinobi-favicon="v3"]');

    if (!icon) {
      icon = document.createElement('link');
      icon.dataset.shinobiFavicon = 'v3';
      head.appendChild(icon);
    }

    icon.rel = 'icon';
    icon.type = 'image/svg+xml';
    icon.sizes = 'any';
    if (icon.href !== FAVICON_HREF) icon.href = FAVICON_HREF;

    head.querySelectorAll('link[rel~="icon"]').forEach(candidate => {
      if (candidate !== icon) candidate.remove();
    });
  } finally {
    applying = false;
  }
}

applyFavicon();

const faviconObserver = new MutationObserver(() => {
  window.queueMicrotask(applyFavicon);
});

faviconObserver.observe(document.head, {
  childList: true,
  subtree: true,
  attributes: true,
  attributeFilter: ['href', 'rel', 'type']
});

window.setInterval(applyFavicon, 1000);
