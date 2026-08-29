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

const read = file => fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
assert.equal(AUDIO_LAB_DEFAULT_MODE, 'neon-ribbon');
for (const required of ['neon-shatter', 'spectrum', 'neon-ribbon', 'liquid-chrome', 'pulse-reactor', 'bass-fracture', 'gravity-lens', 'bio-structure', 'void-bloom', 'creep-signal']) {
  assert.ok(AUDIO_LAB_PRESET_IDS.includes(required), `Sanctioned Audio Lab registry is missing ${required}.`);
}
assert.equal(AUDIO_LAB_PRESET_IDS.length, 10);
assert.deepEqual(AUDIO_LAB_SANCTUARY_IDS, ['spectrum']);
for (const mode of AUDIO_LAB_PRESET_IDS) assert.equal(isSanctionedAudioLabMode(mode), true);
assert.equal(normalizeAudioLabMode('unknown'), 'neon-ribbon');

function collectFiles(root, extensions) {
  if (!fs.existsSync(root)) return [];
  const files = [];
  const visit = target => {
    const stat = fs.statSync(target);
    if (stat.isDirectory()) return fs.readdirSync(target).forEach(name => visit(path.join(target, name)));
    if (extensions.some(extension => target.endsWith(extension))) files.push(target);
  };
  visit(root);
  return files;
}
const productionFiles = ['index.html', 'sw.js', ...collectFiles('js/features/visual', ['.js']), ...collectFiles('css', ['.css'])];
const productionSource = productionFiles.map(file => `\n/* ${file} */\n${read(file)}`).join('\n');
for (const slug of ['cyber-rain','quantum-grid','tesla-veins','hyperdrive','wave-cathedral','hex-reactor']) {
  assert.ok(!productionSource.toLowerCase().includes(slug), `Retired Audio Lab preset leaked into production source: ${slug}.`);
}

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

const premiumFiles = [
  ['js/features/visual/prism-tunnel.js', 'drawPrismTunnelMode('],
  ['js/features/visual/pulse-line.js', 'drawPulseLineMode('],
  ['js/features/visual/chroma-spectrum.js', 'drawChromaSpectrumMode(']
];
for (const [file, marker] of premiumFiles) {
  const source = read(file);
  assert.ok(source.includes(marker), `${file} missing ${marker}`);
  for (const forbidden of ['Math.random(', 'requestAnimationFrame(', 'setInterval(', 'fillText(']) assert.ok(!source.includes(forbidden), `${file} contains ${forbidden}`);
}

const live = read('js/features/visual/visual-engine-live.js');
for (const required of [
  "{ id: 'gravity-lens', label: 'Prism Tunnel', renderer: drawPrismTunnelMode }",
  "{ id: 'void-bloom', label: 'Pulse Line', renderer: drawPulseLineMode }",
  "{ id: 'creep-signal', label: 'Chroma Spectrum', renderer: drawChromaSpectrumMode }",
  'base.readSpectrum?.(raw)', 'reading = readAudioLabSpectrum(raw)',
  'function createAdaptiveLowPunchTracker()', 'function createDirectVisualImpactTracker()',
  "dataset.audioLabRenderer = 'ten-core-v1'", "dataset.audioLabPresetCount = '10'"
]) assert.ok(live.includes(required), `Live Audio Lab integration is missing ${required}.`);

const sanctuary = read('js/features/visual/audio-lab-sanctuary.js');
for (const required of ['AUDIO_LAB_PRESET_IDS','isSanctionedAudioLabMode','function normalizePresetControls(', "controls.dataset.audioLabRegistry = 'sanctioned-v1'", 'export function initAudioLabSanctuary']) {
  assert.ok(sanctuary.includes(required), `Audio Lab sanctuary enforcement is missing ${required}.`);
}

const worker = read('sw.js');
for (const required of ["'./js/features/visual/prism-tunnel.js'", "'./js/features/visual/pulse-line.js'", "'./js/features/visual/chroma-spectrum.js'"]) assert.ok(worker.includes(required));

const build = assertCurrentBuild('Milestone 7/current release');
assert.ok(build.number >= 126, `Milestone 7 premium visual pack requires Build 126 or newer, got ${build.display}.`);
console.log(`Milestone 7 protects ${AUDIO_LAB_PRESET_IDS.length} sanctioned Audio Lab presets with Prism Tunnel and the polished premium pack under Build ${build.number}.`);
