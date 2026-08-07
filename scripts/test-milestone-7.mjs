import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { assertCurrentBuild } from './lib/build-metadata.mjs';
import {
  AUDIO_LAB_DEFAULT_MODE,
  AUDIO_LAB_PRESET_IDS,
  AUDIO_LAB_SANCTUARY_IDS,
  isSanctionedAudioLabMode,
  normalizeAudioLabMode
} from '../js/features/visual/audio-lab-registry.js';

const read = file => fs.readFileSync(file, 'utf8');

assert.equal(AUDIO_LAB_DEFAULT_MODE, 'neon-shatter');
assert.deepEqual(AUDIO_LAB_PRESET_IDS, ['neon-shatter', 'spectrum', 'liquid-chrome', 'aurora-glass', 'nebula', 'singularity']);
assert.deepEqual(AUDIO_LAB_SANCTUARY_IDS, ['spectrum', 'liquid-chrome']);
for (const mode of AUDIO_LAB_PRESET_IDS) assert.equal(isSanctionedAudioLabMode(mode), true);
assert.equal(isSanctionedAudioLabMode('retired-mode'), false);
assert.equal(normalizeAudioLabMode('unknown'), 'neon-shatter');

function collectFiles(root, extensions) {
  if (!fs.existsSync(root)) return [];
  const files = [];
  const visit = target => {
    const stat = fs.statSync(target);
    if (stat.isDirectory()) {
      fs.readdirSync(target).forEach(name => visit(path.join(target, name)));
      return;
    }
    if (extensions.some(extension => target.endsWith(extension))) files.push(target);
  };
  visit(root);
  return files;
}

const productionFiles = ['index.html', 'sw.js', ...collectFiles('js/features/visual', ['.js']), ...collectFiles('css', ['.css'])];
const productionSource = productionFiles.map(file => `\n/* ${file} */\n${read(file)}`).join('\n');
for (const slug of ['cyber-rain','quantum-grid','prism-tunnel','tesla-veins','hyperdrive','wave-cathedral','hex-reactor']) {
  assert.ok(!productionSource.toLowerCase().includes(slug), `Retired Audio Lab preset leaked into production source: ${slug}.`);
}
for (const pattern of [
  /\bid\s*:\s*['"]orbit['"]/i,
  /\bcase\s+['"]orbit['"]/i,
  /data-(?:mode|visual)\s*=\s*['"]orbit['"]/i,
  /(?:setMode|renderMode|normalizeAudioLabMode)\s*\(\s*['"]orbit['"]/i
]) assert.ok(!pattern.test(productionSource), `Retired Audio Lab Orbit preset binding leaked into production source: ${pattern}.`);

const base = read('js/features/visual/visual-engine-v2.js');
function extractFunction(source, name) {
  const start = source.indexOf(`  function ${name}(`);
  assert.ok(start >= 0, `Protected renderer ${name} is missing.`);
  const brace = source.indexOf('{', start);
  let depth = 0;
  for (let index = brace; index < source.length; index += 1) {
    if (source[index] === '{') depth += 1;
    if (source[index] === '}' && --depth === 0) return source.slice(start, index + 1).replace(/^  /gm, '');
  }
  throw new Error(`Protected renderer ${name} is malformed.`);
}
const protectedHashes = {
  drawLiquidChrome: 'bc171075042d4fe881a781ba0206482d721f8e1de6fada4357c7b2d944a23967',
  drawSpectrum: '25a86e3763b668fc69734d48439a2c93745ef927a3fcbdddaf2d0f29e0371813'
};
for (const [name, expected] of Object.entries(protectedHashes)) {
  const actual = crypto.createHash('sha256').update(extractFunction(base, name)).digest('hex');
  assert.equal(actual, expected, `${name} is sanctuary-protected and must not change.`);
}
for (const binding of [
  "case 'liquid-chrome': drawLiquidChrome(ctx, width, height, data, accent, accent2); break;",
  'default: drawSpectrum(ctx, width, height, data, accent, accent2);'
]) assert.ok(base.includes(binding), `Protected Audio Lab binding changed: ${binding}`);

const core = read('js/features/visual/visual-engine-core-modes.js');
for (const required of [
  'export function drawAuroraGlassMode(',
  'export function drawNeonShatterAdaptiveMode(',
  'const transient = clamp(Math.max(kick, peak))',
  'const spectralIndex = Math.min(',
  'const spectralRipple = Math.sin(',
  'const spectralDeformation = (spectral - bandValue)',
  'const fragments = mobile ? 20 : 52'
]) assert.ok(core.includes(required), `Build 42 visual calibration is missing ${required}.`);

const live = read('js/features/visual/visual-engine-live.js');
for (const required of [
  "const DEFAULT_MODE = 'neon-shatter'",
  "{ id: 'spectrum', label: 'Spectrum' }",
  'readAudioLabSpectrum(raw)',
  'readAudioLabAmplitude(waveform)',
  'createAmplitudeDynamicsTracker',
  'shapeReactiveSpectrum(raw, shaped, features)',
  "homeTitle.textContent = 'Neon Shatter'",
  'CUSTOM_MOBILE_FRAME_INTERVAL = 1000 / 60'
]) assert.ok(live.includes(required), `Live Audio Lab integration is missing ${required}.`);
assert.ok(!live.includes("'bars'"), 'Legacy bars alias must not survive Spectrum restoration.');

const sanctuary = read('js/features/visual/audio-lab-sanctuary.js');
for (const required of [
  'AUDIO_LAB_PRESET_IDS','isSanctionedAudioLabMode','function normalizePresetControls(',
  "controls.dataset.audioLabRegistry = 'sanctioned-v1'",'setTextIfChanged(button, VIEW_LABELS.video)',
  'setTextIfChanged(button, VIEW_LABELS.player)',
  "root.querySelectorAll?.('.track-detail-canvas-badge, .lyrics-studio-canvas-badge').forEach(badge => badge.remove())",
  'video.loop = true',"video.setAttribute('webkit-playsinline', '')","video.addEventListener('timeupdate'",'export function initAudioLabSanctuary'
]) assert.ok(sanctuary.includes(required), `Audio Lab sanctuary enforcement is missing ${required}.`);

const engine = read('js/app-engine.js');
assert.ok(engine.includes("import(versioned('./features/visual/audio-lab-sanctuary.js'))"));
assert.ok(engine.includes('initAudioLabSanctuary({ audio })'));
const worker = read('sw.js');
assert.ok(worker.includes("'./js/features/visual/audio-lab-registry.js'"));
assert.ok(worker.includes("'./js/features/visual/audio-lab-sanctuary.js'"));

const build = assertCurrentBuild('Milestone 7');
console.log(`Milestone 7 Spectrum restoration, adaptive Neon, reactive Aurora and sanctuary hashes remain valid under Build ${build.number}.`);
