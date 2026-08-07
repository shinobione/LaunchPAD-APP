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
})();
