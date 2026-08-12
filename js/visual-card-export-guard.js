(() => {
  if (globalThis.__shinobiVisualCardExportGuard) return;

  const NativeImage = globalThis.Image;
  if (typeof NativeImage !== 'function') return;

  function CorsSafeImage(width, height) {
    const image = new NativeImage(width, height);
    // Visual Cards draw Cloudflare/R2 artwork onto a canvas. Without an
    // anonymous CORS request the canvas becomes tainted and toBlob() throws,
    // which breaks both Share image and Download PNG.
    image.crossOrigin = 'anonymous';
    return image;
  }

  CorsSafeImage.prototype = NativeImage.prototype;
  Object.setPrototypeOf(CorsSafeImage, NativeImage);
  globalThis.Image = CorsSafeImage;
  globalThis.__shinobiVisualCardExportGuard = true;

  const feedback = {
    prepared: null,
    preparing: null,
    syncFrame: 0,
    resetTimers: new WeakMap()
  };

  const originalLabel = button => {
    if (!button.dataset.visualCardOriginalLabel) {
      button.dataset.visualCardOriginalLabel = button.textContent.trim();
    }
    return button.dataset.visualCardOriginalLabel;
  };

  function activeModal() {
    const modal = document.querySelector('#visual-card-modal');
    return modal && !modal.hidden ? modal : null;
  }

  function currentApi() {
    return globalThis.__shinobiVisualCard || null;
  }

  function routeFor(track) {
    return `${location.origin}${location.pathname}#track=${encodeURIComponent(track.id)}`;
  }

  function escapeFilename(value) {
    return String(value)
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/gi, '-')
      .replace(/^-+|-+$/g, '')
      .toLowerCase() || 'shinobiwan-track';
  }

  function blobFromCanvas(canvas) {
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
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  }

  function setStatus(message, kind = 'info') {
    const modal = activeModal();
    const status = modal?.querySelector('.visual-card-status');
    if (!status) return;
    status.textContent = message;
    status.dataset.kind = kind;
    status.classList.remove('visual-card-status-pulse');
    void status.offsetWidth;
    status.classList.add('visual-card-status-pulse');
  }

  function restoreButton(button) {
    if (!button) return;
    const timer = feedback.resetTimers.get(button);
    if (timer) clearTimeout(timer);
    button.textContent = originalLabel(button);
    button.disabled = false;
    button.removeAttribute('aria-busy');
    button.classList.remove('visual-card-action-busy', 'visual-card-action-done');
  }

  function buttonState(button, label, { busy = false, done = false, resetAfter = 0 } = {}) {
    if (!button) return;
    originalLabel(button);
    const previous = feedback.resetTimers.get(button);
    if (previous) clearTimeout(previous);
    button.textContent = label;
    button.disabled = busy;
    button.toggleAttribute('aria-busy', busy);
    button.classList.toggle('visual-card-action-busy', busy);
    button.classList.toggle('visual-card-action-done', done);
    if (resetAfter > 0) {
      feedback.resetTimers.set(button, setTimeout(() => restoreButton(button), resetAfter));
    }
  }

  async function prepareAsset() {
    const api = currentApi();
    const canvas = api?.getCanvas?.();
    const track = api?.getActiveTrack?.();
    if (!canvas || !track || !canvas.classList.contains('ready') || canvas.dataset.trackId !== track.id) return null;

    if (feedback.prepared?.trackId === track.id) return feedback.prepared;
    if (feedback.preparing?.trackId === track.id) return feedback.preparing.promise;

    const promise = blobFromCanvas(canvas).then(blob => {
      const filename = `shinobiwan-${escapeFilename(track.title)}-visual-card.png`;
      const prepared = {
        trackId: track.id,
        track,
        blob,
        filename,
        file: new File([blob], filename, { type: 'image/png' })
      };
      feedback.prepared = prepared;
      feedback.preparing = null;
      return prepared;
    }).catch(error => {
      feedback.preparing = null;
      throw error;
    });

    feedback.preparing = { trackId: track.id, promise };
    return promise;
  }

  function scheduleSync() {
    if (feedback.syncFrame) return;
    feedback.syncFrame = requestAnimationFrame(() => {
      feedback.syncFrame = 0;
      syncModal();
    });
  }

  function syncModal() {
    const modal = activeModal();
    if (!modal) return;
    const canvas = modal.querySelector('.visual-card-canvas');
    const share = modal.querySelector('[data-visual-card-action="share"]');
    const download = modal.querySelector('[data-visual-card-action="download"]');
    if (!canvas || !share || !download) return;

    originalLabel(share);
    originalLabel(download);

    const ready = canvas.classList.contains('ready');
    if (!ready) {
      feedback.prepared = null;
      feedback.preparing = null;
      share.disabled = true;
      download.disabled = true;
      share.setAttribute('aria-busy', 'true');
      download.setAttribute('aria-busy', 'true');
      return;
    }

    prepareAsset().then(asset => {
      if (!asset || !activeModal()) return;
      if (!share.classList.contains('visual-card-action-busy')) {
        share.disabled = false;
        share.removeAttribute('aria-busy');
      }
      if (!download.classList.contains('visual-card-action-busy')) {
        download.disabled = false;
        download.removeAttribute('aria-busy');
      }
    }).catch(error => {
      console.error('Visual Card pre-export failed', error);
      setStatus('Image export is unavailable for this card.', 'error');
      share.disabled = true;
      download.disabled = true;
    });
  }

  async function sharePrepared(button) {
    const asset = feedback.prepared;
    if (!asset) {
      setStatus('The image is still preparing. Try again in a moment.', 'info');
      return;
    }

    buttonState(button, 'Opening share…', { busy: true });
    try {
      if (navigator.share && navigator.canShare?.({ files: [asset.file] })) {
        await navigator.share({
          title: `${asset.track.title} — SHINOBIWAN`,
          text: `Listen to ${asset.track.title} on the SHINOBIWAN LaunchPAD.`,
          files: [asset.file]
        });
        buttonState(button, 'Shared ✓', { done: true, resetAfter: 1600 });
        setStatus('Visual Card shared.', 'success');
        return;
      }

      downloadBlob(asset.blob, asset.filename);
      buttonState(button, 'PNG downloaded ✓', { done: true, resetAfter: 1900 });
      setStatus('Native image sharing is unavailable here, so the PNG was downloaded instead.', 'info');
    } catch (error) {
      if (error?.name === 'AbortError') {
        restoreButton(button);
        setStatus('Share cancelled.', 'info');
        return;
      }
      console.error('Unable to share Visual Card', error);
      restoreButton(button);
      setStatus('Unable to open image sharing on this device.', 'error');
    }
  }

  async function downloadPrepared(button) {
    buttonState(button, 'Preparing…', { busy: true });
    try {
      const asset = feedback.prepared || await prepareAsset();
      if (!asset) throw new Error('Visual Card is not ready.');
      downloadBlob(asset.blob, asset.filename);
      buttonState(button, 'Downloaded ✓', { done: true, resetAfter: 1700 });
      setStatus('PNG downloaded.', 'success');
    } catch (error) {
      console.error('Unable to download Visual Card', error);
      restoreButton(button);
      setStatus('Unable to download this image.', 'error');
    }
  }

  async function copyTrackLink(button) {
    const track = currentApi()?.getActiveTrack?.();
    if (!track) return;
    const url = routeFor(track);
    buttonState(button, 'Copying…', { busy: true });
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
      } else {
        const input = document.createElement('textarea');
        input.value = url;
        input.setAttribute('readonly', '');
        input.style.position = 'fixed';
        input.style.opacity = '0';
        document.body.appendChild(input);
        input.select();
        document.execCommand('copy');
        input.remove();
      }
      buttonState(button, 'Copied ✓', { done: true, resetAfter: 1500 });
      setStatus('Track link copied.', 'success');
    } catch (error) {
      console.error('Unable to copy Visual Card track link', error);
      restoreButton(button);
      setStatus('Unable to copy the track link.', 'error');
    }
  }

  document.addEventListener('click', event => {
    const button = event.target.closest?.('#visual-card-modal [data-visual-card-action]');
    if (!button) return;
    const action = button.dataset.visualCardAction;
    if (!['share', 'download', 'copy'].includes(action)) return;

    // The legacy Visual Card listener runs in bubble phase. Build 102 owns
    // these export actions in capture phase so each click executes exactly
    // once and receives deterministic user feedback.
    event.preventDefault();
    event.stopImmediatePropagation();

    if (action === 'share') sharePrepared(button);
    else if (action === 'download') downloadPrepared(button);
    else copyTrackLink(button);
  }, true);

  const observer = new MutationObserver(scheduleSync);
  const startObserver = () => {
    if (!document.documentElement) return;
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['hidden', 'class', 'data-track-id']
    });
    scheduleSync();
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startObserver, { once: true });
  } else {
    startObserver();
  }
})();
