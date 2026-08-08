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
for (const required of ['neon-shatter', 'spectrum', 'liquid-chrome', 'pulse-reactor']) {
  assert.ok(AUDIO_LAB_PRESET_IDS.includes(required), `Sanctioned Audio Lab registry is missing ${required}.`);
}
assert.equal(new Set(AUDIO_LAB_PRESET_IDS).size, AUDIO_LAB_PRESET_IDS.length, 'Audio Lab preset ids must remain unique.');
assert.deepEqual(AUDIO_LAB_SANCTUARY_IDS, ['spectrum']);
for (const mode of AUDIO_LAB_PRESET_IDS) assert.equal(isSanctionedAudioLabMode(mode), true);
for (const mode of ['aurora-glass', 'nebula', 'singularity', 'retired-mode']) assert.equal(isSanctionedAudioLabMode(mode), false);
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
const spectrumHash = '25a86e3763b668fc69734d48439a2c93745ef927a3fcbdddaf2d0f29e0371813';
const actualSpectrumHash = crypto.createHash('sha256').update(extractFunction(base, 'drawSpectrum')).digest('hex');
assert.equal(actualSpectrumHash, spectrumHash, 'Spectrum is sanctuary-protected and must not change.');
for (const required of [
  "{ id: 'spectrum', label: 'Spectrum' }",
  'function readSpectrum(target)',
  'analyser.getByteFrequencyData(target)',
  'return { resume, setMode, readSpectrum }'
]) assert.ok(base.includes(required), `Spectrum reference contract changed: ${required}`);
for (const forbidden of ['drawLiquidChrome(', 'drawNeonShatter(', 'drawSingularity(', 'drawNebula(']) {
  assert.ok(!base.includes(forbidden), `Legacy base renderer remains: ${forbidden}`);
}

const core = read('js/features/visual/visual-engine-core-modes.js');
for (const required of [
  'export function drawNeonShatterV2Mode(',
  'export function drawLiquidChromeV2Mode(',
  'const impact = clamp(',
  'const pulse = clamp(',
  'const gatedDrift = time * activity * .16',
  'const phase = time * activity * .2',
  'localDrive * .92',
  'spectralDeform = spectral * .092'
]) assert.ok(core.includes(required), `Validated core visual calibration is missing ${required}.`);
for (const forbidden of ['drawAuroraGlassMode', 'drawSingularityLiveMode', 'drawNeonShatterAdaptiveMode', 'drawLiquidChromeLiveMode']) {
  assert.ok(!core.includes(forbidden), `Retired core renderer remains: ${forbidden}`);
}

const reactor = read('js/features/visual/pulse-reactor.js');
for (const required of [
  'export function drawPulseReactorMode(',
  'const ringCount = mobile ? 3 : 5',
  'const segmentCount = mobile ? 18 : 32',
  'const spokeCount = mobile ? 16 : 30',
  'const drift = time * activity * .075'
]) assert.ok(reactor.includes(required), `Pulse Reactor contract is missing ${required}.`);

const live = read('js/features/visual/visual-engine-live.js');
for (const required of [
  "const DEFAULT_MODE = 'neon-shatter'",
  "{ id: 'spectrum', label: 'Spectrum' }",
  "{ id: 'neon-shatter', label: 'Neon Shatter', renderer: drawNeonShatterV2Mode }",
  "{ id: 'liquid-chrome', label: 'Liquid Chrome', renderer: drawLiquidChromeV2Mode }",
  "{ id: 'pulse-reactor', label: 'Pulse Reactor', renderer: drawPulseReactorMode }",
  'base.readSpectrum?.(raw)',
  'reading = readAudioLabSpectrum(raw)',
  'renderMode(labCanvas, customRenderer, raw, getAccent, time, features, mode)',
  'dataset.audioLabRenderer =',
  `dataset.audioLabPresetCount = '${AUDIO_LAB_PRESET_IDS.length}'`,
  'const CUSTOM_FRAME_INTERVAL = 1000 / 60'
]) assert.ok(live.includes(required), `Live Audio Lab integration is missing ${required}.`);
for (const forbidden of ['aurora-glass', 'nebula', 'singularity', "'bars'", 'readAudioLabAmplitude', 'createAmplitudeDynamicsTracker', 'synthesizePlaybackSpectrum']) {
  assert.ok(!live.includes(forbidden), `Retired or parallel live path remains: ${forbidden}`);
}

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
assert.ok(worker.includes("'./js/features/visual/pulse-reactor.js'"));

const build = assertCurrentBuild('Milestone 7/current release');
console.log(`Milestone 7 protects ${AUDIO_LAB_PRESET_IDS.length} sanctioned Audio Lab presets on the shared Spectrum FFT under Build ${build.number}.`);