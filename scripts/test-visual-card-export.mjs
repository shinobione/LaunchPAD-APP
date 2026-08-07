import assert from 'node:assert/strict';
import fs from 'node:fs';

const guard = fs.readFileSync('js/visual-card-export-guard.js', 'utf8');
const build = fs.readFileSync('js/build-config.js', 'utf8');
const worker = fs.readFileSync('sw.js', 'utf8');
const visualCard = fs.readFileSync('js/features/visual-card.js', 'utf8');

assert.ok(guard.includes("image.crossOrigin = 'anonymous'"), 'Visual Card images must request anonymous CORS before canvas rendering.');
assert.ok(guard.indexOf("image.crossOrigin = 'anonymous'") < guard.indexOf('return image'), 'CORS mode must be applied before the Image instance is returned.');
assert.ok(build.includes('installVisualCardExportGuard'), 'Build bootstrap must install the Visual Card export guard.');
assert.ok(build.indexOf('installVisualCardExportGuard') < build.lastIndexOf('installAppEngine'), 'The export guard must be wired before application boot.');
assert.ok(worker.includes("'./js/visual-card-export-guard.js'"), 'The Visual Card export guard must be available in the PWA shell.');
assert.ok(visualCard.includes('canvas.toBlob'), 'Visual Card PNG export path is missing.');
assert.ok(visualCard.includes('navigator.canShare?.({ files: [file] })'), 'Visual Card file sharing path is missing.');

console.log('Visual Card export remains CORS-safe for Cloudflare/R2 artwork.');
