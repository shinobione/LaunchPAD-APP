import { routeToHash } from './router.js';

export function routeUrl(route) {
  const url = new URL(window.location.href);
  url.hash = routeToHash(route);
  return url.toString();
}

function showToast(message) {
  let toast = document.querySelector('#launchpad-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'launchpad-toast';
    toast.className = 'launchpad-toast';
    toast.setAttribute('role', 'status');
    toast.setAttribute('aria-live', 'polite');
    document.body.appendChild(toast);
  }

  toast.textContent = message;
  toast.classList.add('show');
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => toast.classList.remove('show'), 2200);
}

export async function shareRoute({ title, text, route }) {
  const url = routeUrl(route);

  if (navigator.share) {
    try {
      await navigator.share({ title, text, url });
      return true;
    } catch (error) {
      if (error?.name === 'AbortError') return false;
    }
  }

  try {
    await navigator.clipboard.writeText(url);
    showToast('Link copied');
    return true;
  } catch {
    window.prompt('Copy this link:', url);
    return false;
  }
}
