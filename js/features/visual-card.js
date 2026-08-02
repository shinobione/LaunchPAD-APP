import { tracks, getTrack } from '../core/catalog-store.js';

const CARD_SIZE = 1080;
const LOGO_PATH = 'assets/logo.png';

function ensureStylesheet() {
  const href = 'css/visual-card.css?v=20260802-1';
  if (document.querySelector(`link[href="${href}"]`)) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = href;
  document.head.appendChild(link);
}

function escapeFilename(value) {
  return String(value)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase() || 'shinobiwan-track';
}

function hexToRgb(value, fallback = [166, 60, 255]) {
  const match = /^#([0-9a-f]{6})$/i.exec(value || '');
  if (!match) return fallback;
  const number = Number.parseInt(match[1], 16);
  return [number >> 16, number >> 8 & 255, number & 255];
}

function rgba(rgb, alpha) {
  return `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${alpha})`;
}

function roundedRect(context, x, y, width, height, radius) {
  const safeRadius = Math.min(radius, width / 2, height / 2);
  context.beginPath();
  context.moveTo(x + safeRadius, y);
  context.arcTo(x + width, y, x + width, y + height, safeRadius);
  context.arcTo(x + width, y + height, x, y + height, safeRadius);
  context.arcTo(x, y + height, x, y, safeRadius);
  context.arcTo(x, y, x + width, y, safeRadius);
  context.closePath();
}

function hashSeed(value) {
  let seed = 2166136261;
  for (const character of String(value)) {
    seed ^= character.charCodeAt(0);
    seed = Math.imul(seed, 16777619);
  }
  return seed >>> 0;
}

function createRandom(seedValue) {
  let seed = seedValue || 1;
  return () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

function loadImage(source) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.decoding = 'async';
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Unable to load ${source}`));
    image.src = source;
  });
}

function drawImageCover(context, image, x, y, size) {
  const scale = Math.max(size / image.naturalWidth, size / image.naturalHeight);
  const width = image.naturalWidth * scale;
  const height = image.naturalHeight * scale;
  const sourceX = (width - size) / 2 / scale;
  const sourceY = (height - size) / 2 / scale;
  const sourceWidth = size / scale;
  const sourceHeight = size / scale;

  context.save();
  roundedRect(context, x, y, size, size, 42);
  context.clip();
  context.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, x, y, size, size);
  context.restore();
}

function drawCoverFallback(context, x, y, size, accent, accent2) {
  const gradient = context.createLinearGradient(x, y, x + size, y + size);
  gradient.addColorStop(0, accent);
  gradient.addColorStop(1, accent2);
  context.fillStyle = gradient;
  roundedRect(context, x, y, size, size, 42);
  context.fill();
  context.fillStyle = 'rgba(5,3,11,.65)';
  context.font = '900 220px Outfit, Inter, sans-serif';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText('S', x + size / 2, y + size / 2 + 5);
}

function drawNebula(context, random, accentRgb, accent2Rgb) {
  context.save();
  context.globalCompositeOperation = 'screen';

  for (let cloud = 0; cloud < 9; cloud += 1) {
    const x = random() * CARD_SIZE;
    const y = random() * CARD_SIZE;
    const radius = 150 + random() * 330;
    const color = cloud % 2 ? accentRgb : accent2Rgb;
    const gradient = context.createRadialGradient(x, y, 0, x, y, radius);
    gradient.addColorStop(0, rgba(color, .11 + random() * .09));
    gradient.addColorStop(.42, rgba(color, .045));
    gradient.addColorStop(1, 'rgba(0,0,0,0)');
    context.fillStyle = gradient;
    context.fillRect(x - radius, y - radius, radius * 2, radius * 2);
  }

  for (let particle = 0; particle < 150; particle += 1) {
    const x = random() * CARD_SIZE;
    const y = random() * CARD_SIZE;
    const radius = .7 + random() * 3.1;
    const color = particle % 3 ? accentRgb : accent2Rgb;
    context.fillStyle = rgba(color, .18 + random() * .52);
    context.shadowColor = rgba(color, .9);
    context.shadowBlur = 4 + random() * 13;
    context.beginPath();
    context.arc(x, y, radius, 0, Math.PI * 2);
    context.fill();
  }

  context.restore();
  context.shadowBlur = 0;
}

function drawSignalRings(context, accentRgb, accent2Rgb) {
  context.save();
  context.translate(805, 386);
  context.rotate(-.12);
  [205, 255, 310].forEach((radius, index) => {
    context.strokeStyle = rgba(index % 2 ? accent2Rgb : accentRgb, .13 - index * .022);
    context.lineWidth = index === 0 ? 3 : 2;
    context.beginPath();
    context.ellipse(0, 0, radius, radius * .62, 0, 0, Math.PI * 2);
    context.stroke();
  });
  context.restore();
}

function fitText(context, text, maximumWidth, startSize, minimumSize, weight = 800) {
  let size = startSize;
  do {
    context.font = `${weight} ${size}px Outfit, Inter, sans-serif`;
    if (context.measureText(text).width <= maximumWidth) return size;
    size -= 2;
  } while (size > minimumSize);
  return minimumSize;
}

function wrapText(context, text, maximumWidth, maximumLines = 2) {
  const words = String(text).split(/\s+/).filter(Boolean);
  const lines = [];
  let current = '';

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (context.measureText(candidate).width <= maximumWidth || !current) {
      current = candidate;
      continue;
    }
    lines.push(current);
    current = word;
    if (lines.length === maximumLines - 1) break;
  }

  if (current && lines.length < maximumLines) lines.push(current);
  const consumed = lines.join(' ').split(/\s+/).length;
  if (consumed < words.length && lines.length) {
    let finalLine = lines.at(-1);
    while (context.measureText(`${finalLine}…`).width > maximumWidth && finalLine.includes(' ')) {
      finalLine = finalLine.slice(0, finalLine.lastIndexOf(' '));
    }
    lines[lines.length - 1] = `${finalLine}…`;
  }
  return lines;
}

function drawGoldenLogo(context, image) {
  const targetWidth = 360;
  const ratio = image.naturalHeight / Math.max(1, image.naturalWidth);
  const targetHeight = Math.min(112, targetWidth * ratio);
  const buffer = document.createElement('canvas');
  buffer.width = targetWidth * 2;
  buffer.height = targetHeight * 2;
  const bufferContext = buffer.getContext('2d');

  bufferContext.drawImage(image, 0, 0, buffer.width, buffer.height);
  bufferContext.globalCompositeOperation = 'source-in';
  const gold = bufferContext.createLinearGradient(0, 0, 0, buffer.height);
  gold.addColorStop(0, '#fff0ad');
  gold.addColorStop(.34, '#e7bd58');
  gold.addColorStop(.7, '#a56b1d');
  gold.addColorStop(1, '#f1cc6d');
  bufferContext.fillStyle = gold;
  bufferContext.fillRect(0, 0, buffer.width, buffer.height);

  context.save();
  context.shadowColor = 'rgba(226,177,70,.28)';
  context.shadowBlur = 24;
  context.drawImage(buffer, 72, 58, targetWidth, targetHeight);
  context.restore();
}

function drawLogoFallback(context) {
  const gradient = context.createLinearGradient(72, 58, 420, 140);
  gradient.addColorStop(0, '#fff0ad');
  gradient.addColorStop(.45, '#d7a63e');
  gradient.addColorStop(1, '#f1cc6d');
  context.fillStyle = gradient;
  context.font = '900 54px Outfit, Inter, sans-serif';
  context.fillText('SHINOBIWAN', 72, 112);
}

function trackRoute(track) {
  return `${window.location.origin}${window.location.pathname}#track=${encodeURIComponent(track.id)}`;
}

async function renderCard(canvas, track) {
  await document.fonts?.ready?.catch(() => {});
  const context = canvas.getContext('2d');
  canvas.width = CARD_SIZE;
  canvas.height = CARD_SIZE;

  const styles = getComputedStyle(document.documentElement);
  const accent = track.accent || styles.getPropertyValue('--accent').trim() || '#a63cff';
  const accent2 = track.accent2 || styles.getPropertyValue('--accent2').trim() || '#5c6cff';
  const accentRgb = hexToRgb(accent);
  const accent2Rgb = hexToRgb(accent2, [92, 108, 255]);
  const random = createRandom(hashSeed(track.id));

  const background = context.createLinearGradient(0, 0, CARD_SIZE, CARD_SIZE);
  background.addColorStop(0, '#08040f');
  background.addColorStop(.48, '#10081c');
  background.addColorStop(1, '#030207');
  context.fillStyle = background;
  context.fillRect(0, 0, CARD_SIZE, CARD_SIZE);

  drawNebula(context, random, accentRgb, accent2Rgb);
  drawSignalRings(context, accentRgb, accent2Rgb);

  const edge = context.createLinearGradient(0, 0, CARD_SIZE, CARD_SIZE);
  edge.addColorStop(0, rgba(accentRgb, .65));
  edge.addColorStop(.48, 'rgba(255,255,255,.08)');
  edge.addColorStop(1, rgba(accent2Rgb, .56));
  context.strokeStyle = edge;
  context.lineWidth = 3;
  roundedRect(context, 22, 22, CARD_SIZE - 44, CARD_SIZE - 44, 42);
  context.stroke();

  let coverImage = null;
  let logoImage = null;
  await Promise.all([
    loadImage(track.cover).then(image => { coverImage = image; }).catch(() => {}),
    loadImage(LOGO_PATH).then(image => { logoImage = image; }).catch(() => {})
  ]);

  if (logoImage) drawGoldenLogo(context, logoImage);
  else drawLogoFallback(context);

  context.fillStyle = rgba(accentRgb, .16);
  roundedRect(context, 72, 168, 436, 436, 48);
  context.fill();
  context.shadowColor = rgba(accentRgb, .3);
  context.shadowBlur = 46;
  if (coverImage) drawImageCover(context, coverImage, 80, 176, 420);
  else drawCoverFallback(context, 80, 176, 420, accent, accent2);
  context.shadowBlur = 0;

  context.textAlign = 'left';
  context.textBaseline = 'alphabetic';
  context.fillStyle = rgba(accentRgb, .95);
  context.font = '800 19px Inter, sans-serif';
  context.letterSpacing = '4px';
  context.fillText(`${track.genre.toUpperCase()} • NOW PLAYING`, 555, 230);
  context.letterSpacing = '0px';

  context.fillStyle = '#fff';
  const titleSize = fitText(context, track.title, 445, 76, 48, 850);
  context.font = `850 ${titleSize}px Outfit, Inter, sans-serif`;
  const titleLines = wrapText(context, track.title, 445, 3);
  titleLines.forEach((line, index) => context.fillText(line, 555, 305 + index * (titleSize * 1.02)));

  const titleBottom = 305 + titleLines.length * titleSize * 1.02;
  context.fillStyle = '#c7bdcf';
  context.font = '600 27px Inter, sans-serif';
  const albumLines = wrapText(context, track.album, 440, 2);
  albumLines.forEach((line, index) => context.fillText(line, 555, titleBottom + 34 + index * 34));

  context.fillStyle = '#8f849c';
  context.font = '500 21px Inter, sans-serif';
  const moodLines = wrapText(context, track.mood, 440, 2);
  moodLines.forEach((line, index) => context.fillText(line, 555, titleBottom + 118 + index * 29));

  const signalGradient = context.createLinearGradient(80, 660, 1000, 660);
  signalGradient.addColorStop(0, accent);
  signalGradient.addColorStop(.52, accent2);
  signalGradient.addColorStop(1, 'rgba(255,255,255,.08)');
  context.fillStyle = signalGradient;
  roundedRect(context, 80, 666, 920, 5, 3);
  context.fill();

  context.fillStyle = '#fff';
  context.font = '800 33px Outfit, Inter, sans-serif';
  context.fillText('A SHINOBIWAN SIGNAL', 80, 746);

  context.fillStyle = '#9a8fa7';
  context.font = '500 22px Inter, sans-serif';
  const statement = 'Bass, emotion & precision — no genre left untouched.';
  context.fillText(statement, 80, 791);

  context.fillStyle = 'rgba(255,255,255,.055)';
  roundedRect(context, 80, 844, 920, 112, 24);
  context.fill();
  context.strokeStyle = 'rgba(255,255,255,.09)';
  context.lineWidth = 2;
  roundedRect(context, 80, 844, 920, 112, 24);
  context.stroke();

  context.fillStyle = '#f8f4fb';
  context.font = '700 22px Inter, sans-serif';
  context.fillText('LISTEN ON THE LAUNCHPAD', 112, 891);
  context.fillStyle = '#92879f';
  context.font = '500 18px Inter, sans-serif';
  const route = trackRoute(track).replace(/^https?:\/\//, '');
  const routeSize = fitText(context, route, 850, 18, 13, 500);
  context.font = `500 ${routeSize}px Inter, sans-serif`;
  context.fillText(route, 112, 927);

  context.fillStyle = rgba(accent2Rgb, .9);
  context.beginPath();
  context.arc(946, 900, 28, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = '#fff';
  context.font = '800 25px Inter, sans-serif';
  context.textAlign = 'center';
  context.fillText('↗', 946, 909);
  context.textAlign = 'left';

  canvas.dataset.trackId = track.id;
  return canvas;
}

function canvasBlob(canvas) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(blob => {
      if (blob) resolve(blob);
      else reject(new Error('Unable to encode the visual card.'));
    }, 'image/png', 1);
  });
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1500);
}

function createModal() {
  const existing = document.querySelector('#visual-card-modal');
  if (existing) return existing;

  const modal = document.createElement('div');
  modal.id = 'visual-card-modal';
  modal.className = 'visual-card-modal';
  modal.hidden = true;
  modal.setAttribute('aria-hidden', 'true');
  modal.innerHTML = `
    <div class="visual-card-backdrop" data-visual-card-action="close"></div>
    <section class="visual-card-dialog" role="dialog" aria-modal="true" aria-labelledby="visual-card-heading">
      <header class="visual-card-head">
        <div>
          <span class="eyebrow">SHARE THE SIGNAL</span>
          <h2 id="visual-card-heading">Visual Card</h2>
        </div>
        <button type="button" class="visual-card-close" data-visual-card-action="close" aria-label="Close visual card">×</button>
      </header>
      <div class="visual-card-preview-shell">
        <canvas class="visual-card-canvas" width="1080" height="1080" aria-label="Generated SHINOBIWAN visual card"></canvas>
        <div class="visual-card-loading" aria-live="polite">Generating signal…</div>
      </div>
      <p class="visual-card-caption">Square 1080 × 1080 PNG, ready for Instagram, Discord, X or direct sharing.</p>
      <div class="visual-card-actions">
        <button type="button" class="primary" data-visual-card-action="share">Share image ↗</button>
        <button type="button" class="secondary" data-visual-card-action="download">Download PNG</button>
        <button type="button" class="text-button" data-visual-card-action="copy">Copy track link</button>
      </div>
      <p class="visual-card-status" aria-live="polite"></p>
    </section>
  `;
  document.body.appendChild(modal);
  return modal;
}

export function initVisualCard({ audio = document.querySelector('#audio') } = {}) {
  if (!audio || window.__shinobiVisualCardReady) return;
  window.__shinobiVisualCardReady = true;
  ensureStylesheet();

  const modal = createModal();
  const canvas = modal.querySelector('canvas');
  const loading = modal.querySelector('.visual-card-loading');
  const status = modal.querySelector('.visual-card-status');
  let activeTrack = null;
  let renderToken = 0;
  let lastFocused = null;

  function insertTriggers() {
    const controls = document.querySelector('.player-mode-controls');
    if (controls && !controls.querySelector('[data-visual-card-action="open"]')) {
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.visualCardAction = 'open';
      button.setAttribute('aria-label', 'Create visual card');
      button.title = 'Visual Card';
      button.textContent = '▧';
      const share = controls.querySelector('[data-queue-action="share"]');
      share?.insertAdjacentElement('afterend', button);
      if (!share) controls.appendChild(button);
    }

    const queuePanel = document.querySelector('#queue-panel');
    if (queuePanel && !queuePanel.querySelector('.queue-visual-card-button')) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'queue-visual-card-button';
      button.dataset.visualCardAction = 'open';
      button.innerHTML = '<span aria-hidden="true">▧</span><span><strong>Visual Card</strong><small>Create a shareable 1080 × 1080 image</small></span>';
      queuePanel.querySelector('.queue-panel-modes')?.insertAdjacentElement('afterend', button);
    }
  }

  function currentTrack() {
    return getTrack(audio.dataset.trackId) || tracks[0] || null;
  }

  function setOpen(open) {
    modal.hidden = !open;
    modal.setAttribute('aria-hidden', String(!open));
    document.body.classList.toggle('visual-card-open', open);
    if (open) modal.querySelector('.visual-card-close')?.focus();
    else lastFocused?.focus?.();
  }

  async function open(trackId) {
    activeTrack = getTrack(trackId) || currentTrack();
    if (!activeTrack) return;
    lastFocused = document.activeElement;
    status.textContent = '';
    loading.hidden = false;
    canvas.classList.remove('ready');
    setOpen(true);

    const token = ++renderToken;
    try {
      await renderCard(canvas, activeTrack);
      if (token !== renderToken) return;
      loading.hidden = true;
      canvas.classList.add('ready');
    } catch (error) {
      console.error('Visual Card generation failed', error);
      loading.textContent = 'Unable to generate this visual card.';
      status.textContent = error.message;
    }
  }

  function close() {
    renderToken += 1;
    setOpen(false);
  }

  async function getFile() {
    if (!activeTrack || canvas.dataset.trackId !== activeTrack.id) await open(activeTrack?.id);
    const blob = await canvasBlob(canvas);
    const filename = `shinobiwan-${escapeFilename(activeTrack.title)}-visual-card.png`;
    return { blob, filename, file: new File([blob], filename, { type: 'image/png' }) };
  }

  async function share() {
    if (!activeTrack) return;
    status.textContent = 'Preparing image…';
    try {
      const { blob, filename, file } = await getFile();
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          title: `${activeTrack.title} — SHINOBIWAN`,
          text: `Listen to ${activeTrack.title} on the SHINOBIWAN Launchpad.`,
          url: trackRoute(activeTrack),
          files: [file]
        });
        status.textContent = 'Visual Card shared.';
      } else {
        downloadBlob(blob, filename);
        status.textContent = 'Sharing files is unavailable here, so the PNG was downloaded.';
      }
    } catch (error) {
      if (error?.name === 'AbortError') {
        status.textContent = 'Share cancelled.';
        return;
      }
      console.error('Unable to share Visual Card', error);
      status.textContent = 'Unable to share this image.';
    }
  }

  async function download() {
    if (!activeTrack) return;
    status.textContent = 'Preparing download…';
    try {
      const { blob, filename } = await getFile();
      downloadBlob(blob, filename);
      status.textContent = 'PNG downloaded.';
    } catch (error) {
      console.error('Unable to download Visual Card', error);
      status.textContent = 'Unable to download this image.';
    }
  }

  async function copyLink() {
    if (!activeTrack) return;
    const url = trackRoute(activeTrack);
    try {
      await navigator.clipboard.writeText(url);
      status.textContent = 'Track link copied.';
    } catch {
      const input = document.createElement('textarea');
      input.value = url;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      input.remove();
      status.textContent = 'Track link copied.';
    }
  }

  document.addEventListener('click', event => {
    const trigger = event.target.closest('[data-visual-card-action]');
    if (!trigger) return;
    const action = trigger.dataset.visualCardAction;
    if (action === 'open') {
      event.preventDefault();
      event.stopPropagation();
      open(trigger.dataset.trackId);
    }
    if (action === 'close') close();
    if (action === 'share') share();
    if (action === 'download') download();
    if (action === 'copy') copyLink();
  });

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !modal.hidden) close();
  });

  insertTriggers();
  const observer = new MutationObserver(insertTriggers);
  observer.observe(document.body, { childList: true, subtree: true });

  window.__shinobiVisualCard = {
    open,
    close,
    render: trackId => renderCard(canvas, getTrack(trackId) || currentTrack()),
    getCanvas: () => canvas,
    getActiveTrack: () => activeTrack
  };
}
