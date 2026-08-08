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
for (const required of ['neon-shatter', 'spectrum', 'liquid-chrome', 'pulse-reactor', 'bass-fracture', 'gravity-lens', 'bio-structure']) {
  assert.ok(AUDIO_LAB_PRESET_IDS.includes(required), `Sanctioned Audio Lab registry is missing ${required}.`);
}
assert.equal(AUDIO_LAB_PRESET_IDS.length, 7);
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
for (const required of ['function readSpectrum(target)', 'analyser.getByteFrequencyData(target)', 'return { resume, setMode, readSpectrum }']) {
  assert.ok(base.includes(required), `Spectrum reference contract changed: ${required}`);
}

const core = read('js/features/visual/visual-engine-core-modes.js');
for (const required of ['export function drawNeonShatterV2Mode(', 'export function drawLiquidChromeV2Mode(', 'const gatedDrift = time * activity * .16', 'const phase = time * activity * .2']) {
  assert.ok(core.includes(required), `Validated core visual calibration is missing ${required}.`);
}

const motion = read('js/features/visual/motion-spring.js');
for (const required of ['const FRAME_STATES = new WeakMap()', 'export function beginMotionFrame(', 'export function springChannel(', 'export function motionPhase(']) {
  assert.ok(motion.includes(required), `Shared motion system is missing ${required}.`);
}

const reactor = read('js/features/visual/pulse-reactor.js');
for (const required of ['export function drawPulseReactorMode(', 'const ringCount = mobile ? 3 : 4', 'const segmentCount = mobile ? 14 : 24', "springChannel(motion, 'impact'", 'const elasticWobble = Math.sin(']) {
  assert.ok(reactor.includes(required), `Pulse Reactor contract is missing ${required}.`);
}

const fracture = read('js/features/visual/bass-fracture.js');
for (const required of ['export function drawBassFractureMode(', 'const motionScale = mobile ? 1.58 : 1.18', 'const sectorCount = mobile ? 12 : 16', 'const crackCount = mobile ? 8 : 12', "springChannel(motion, 'rupture'", 'const crackPropagation = clamp(']) {
  assert.ok(fracture.includes(required), `Bass Fracture contract is missing ${required}.`);
}

const lens = read('js/features/visual/gravity-lens.js');
for (const required of ['export function drawGravityLensMode(', 'const bandCount = mobile ? 4 : 6', 'const arcCount = mobile ? 12 : 20', 'const streamCount = mobile ? 8 : 14', "springChannel(motion, 'warp'", 'const streamDrift = Math.sin(']) {
  assert.ok(lens.includes(required), `Gravity Lens contract is missing ${required}.`);
}

const bio = read('js/features/visual/bio-structure.js');
for (const required of ['export function drawBioStructureMode(', 'const ribCount = mobile ? 5 : 8', 'const veinCount = mobile ? 8 : 14', 'const nodeCount = mobile ? 6 : 9', "springChannel(motion, 'breath'", 'const membranePulse = Math.sin(']) {
  assert.ok(bio.includes(required), `Bio Structure contract is missing ${required}.`);
}

for (const isolated of [reactor, fracture, lens, bio]) {
  assert.ok(!isolated.includes('Math.random('));
  assert.ok(!isolated.includes('requestAnimationFrame('));
  assert.ok(!isolated.includes('setInterval('));
}

const live = read('js/features/visual/visual-engine-live.js');
for (const required of [
  "{ id: 'spectrum', label: 'Spectrum' }", "{ id: 'neon-shatter', label: 'Neon Shatter', renderer: drawNeonShatterV2Mode }",
  "{ id: 'liquid-chrome', label: 'Liquid Chrome', renderer: drawLiquidChromeV2Mode }",
  "{ id: 'pulse-reactor', label: 'Pulse Reactor', renderer: drawPulseReactorMode }",
  "{ id: 'bass-fracture', label: 'Bass Fracture', renderer: drawBassFractureMode }",
  "{ id: 'gravity-lens', label: 'Gravity Lens', renderer: drawGravityLensMode }",
  "{ id: 'bio-structure', label: 'Bio Structure', renderer: drawBioStructureMode }",
  'base.readSpectrum?.(raw)', 'reading = readAudioLabSpectrum(raw)',
  "dataset.audioLabRenderer = 'seven-core-v1'", "dataset.audioLabPresetCount = '7'",
  "mode === 'bass-fracture' || mode === 'gravity-lens' || mode === 'bio-structure' ? 1.05",
  'const CUSTOM_FRAME_INTERVAL = 1000 / 60'
]) assert.ok(live.includes(required), `Live Audio Lab integration is missing ${required}.`);

const sanctuary = read('js/features/visual/audio-lab-sanctuary.js');
for (const required of ['AUDIO_LAB_PRESET_IDS','isSanctionedAudioLabMode','function normalizePresetControls(', "controls.dataset.audioLabRegistry = 'sanctioned-v1'", 'video.loop = true', "video.setAttribute('webkit-playsinline', '')", 'export function initAudioLabSanctuary']) {
  assert.ok(sanctuary.includes(required), `Audio Lab sanctuary enforcement is missing ${required}.`);
}

const worker = read('sw.js');
for (const required of [
  "'./js/features/visual/audio-lab-registry.js'", "'./js/features/visual/audio-lab-sanctuary.js'",
  "'./js/features/visual/motion-spring.js'", "'./js/features/visual/pulse-reactor.js'",
  "'./js/features/visual/bass-fracture.js'", "'./js/features/visual/gravity-lens.js'",
  "'./js/features/visual/bio-structure.js'"
]) assert.ok(worker.includes(required));

const build = assertCurrentBuild('Milestone 7/current release');
assert.equal(build.display, '2026.08.08.55');
assert.equal(build.release, 'motion-bio-20260808');
console.log(`Milestone 7 protects ${AUDIO_LAB_PRESET_IDS.length} sanctioned Audio Lab presets with shared FFT + spring motion under Build ${build.number}.`);
