export function getBuildId() {
  return globalThis.SHINOBIWAN_BUILD?.id || 'dev';
}

export function versionedAsset(path) {
  const separator = path.includes('?') ? '&' : '?';
  return `${path}${separator}v=${encodeURIComponent(getBuildId())}`;
}

export function ensureStylesheet(path, dataAttribute = null) {
  const existing = [...document.querySelectorAll('link[rel="stylesheet"]')]
    .find(link => new URL(link.href, location.href).pathname.endsWith(`/${path}`));
  if (existing) return existing;

  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = versionedAsset(path);
  if (dataAttribute) link.dataset[dataAttribute] = 'true';
  document.head.appendChild(link);
  return link;
}
