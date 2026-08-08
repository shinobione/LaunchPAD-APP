import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = path => fs.readFileSync(path, 'utf8').replace(/\r\n/g, '\n');
const guard = read('js/visual-card-export-guard.js');
const build = read('js/build-config.js');
const worker = read('sw.js');
const visualCard = read('js/features/visual-card.js');

assert.ok(guard.includes("image.crossOrigin = 'anonymous'"), 'Visual Card images must request anonymous CORS before canvas rendering.');
assert.ok(guard.indexOf("image.crossOrigin = 'anonymous'") < guard.indexOf('return image'), 'CORS mode must be applied before the Image instance is returned.');
assert.ok(build.includes('function installVisualCardExportGuard()'), 'Build bootstrap must install the Visual Card export guard.');
assert.ok(build.includes("script.addEventListener('load', () => {\n      script.dataset.loaded = 'true';\n      installAppEngine();"), 'The Visual Card export guard must hand off to application boot only after loading.');
assert.ok(build.includes("script.addEventListener('load', () => {\n      script.dataset.loaded = 'true';\n      installVisualCardExportGuard();"), 'Navigation bootstrap must hand off through the Visual Card export guard.');
assert.ok(worker.includes("'./js/visual-card-export-guard.js'"), 'The Visual Card export guard must be available in the PWA shell.');
assert.ok(visualCard.includes('canvas.toBlob'), 'Visual Card PNG export path is missing.');
assert.ok(visualCard.includes('navigator.canShare?.({ files: [file] })'), 'Visual Card file sharing path is missing.');

console.log('Visual Card export remains CORS-safe for Cloudflare/R2 artwork.');
