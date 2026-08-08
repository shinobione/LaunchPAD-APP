import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import { assertCurrentBuild } from './lib/build-metadata.mjs';

const read = path => fs.readFileSync(path, 'utf8');
const includesAll = (source, required, label) => required.forEach(value => assert.ok(source.includes(value), `${label} is missing ${value}.`));

// Routing, legal, catalog, Track Manager deployment and theme contracts.
includesAll(read('js/features/feature-11.js'), ['normalizeLaunchRoute', 'SHAREABLE_ROUTE_PATTERN', 'installRouteTransitions', "window.addEventListener('shinobi:route-change', replayRouteTransition)"], 'Routing');
includesAll(read('js/features/about/about-controller.js'), ['new Date().getFullYear()', 'All Rights Reserved.', 'Unauthorized copying, reproduction, or reverse engineering is strictly prohibited.'], 'Legal notice');
includesAll(read('js/core/catalog-schema.js'), ['normalizeCatalogTrack', 'releaseDate', 'createdAt', 'updatedAt'], 'Catalog schema');
includesAll(read('js/core/catalog-ordering.js'), ['latestActiveTrackEntries', 'recentlyAddedTrackEntries', 'releaseDateUnavailable'], 'Catalog ordering');
const deploy = read('.github/workflows/deploy-cloudflare.yml');
includesAll(deploy, ['workflow_dispatch:', "if: github.ref == 'refs/heads/main'", "test \"${{ inputs.confirm }}\" = 'DEPLOY'", "EXPECTED_PUBLIC_VERSION: '2.6'", "EXPECTED_ADMIN_VERSION: '5.7'"], 'Cloudflare deployment');
assert.ok(!deploy.includes('\n  push:'), 'Production Cloudflare Worker deployment must remain manual-only.');
includesAll(read('js/features/theme-scope.js'), ['trackFromRoute', 'playingTrack(audio)', 'applyPagePalette(viewed, played)', 'applyPlayerPalette(played)'], 'Theme scoping');

// Discography/Home contracts.
includesAll(read('js/features/discography-experience.js'), ["const FILTER_GROUP_ORDER = ['genre', 'language', 'content', 'energy', 'era', 'type', 'media', 'year', 'mood']", 'mini-equalizer', 'track-card-loader'], 'Discography');
includesAll(read('js/features/home-editorial.js'), ["const DEFAULT_VISUAL_MODE = 'neon-shatter'", 'latestActiveTrackEntries(tracks, 1)', 'installVisualSwitcher'], 'Home editorial');

// Audio Lab registry and sanctuary reference.
const registry = read('js/features/visual/audio-lab-registry.js');
includesAll(registry, [
  "AUDIO_LAB_DEFAULT_MODE = 'neon-shatter'", "id: 'neon-shatter'", "id: 'spectrum'", "id: 'liquid-chrome'",
  "id: 'pulse-reactor'", "id: 'bass-fracture'", "id: 'gravity-lens'", "id: 'bio-structure'",
  "AUDIO_LAB_SANCTUARY_IDS = Object.freeze(['spectrum'])"
], 'Audio Lab registry');
for (const retired of ['aurora-glass', 'nebula', 'singularity']) assert.ok(!registry.includes(retired), `Retired Audio Lab preset returned: ${retired}.`);
const presetCount = (registry.match(/Object\.freeze\(\{ id:/g) || []).length;
assert.equal(presetCount, 7, 'Audio Lab must expose exactly seven sanctioned presets.');

const visualBase = read('js/features/visual/visual-engine-v2.js');
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
const actualSpectrumHash = crypto.createHash('sha256').update(extractFunction(visualBase, 'drawSpectrum')).digest('hex');
assert.equal(actualSpectrumHash, spectrumHash, 'Spectrum sanctuary hash changed.');
includesAll(visualBase, ["{ id: 'spectrum', label: 'Spectrum' }", 'function readSpectrum(target)', 'analyser.getByteFrequencyData(target)', 'return { resume, setMode, readSpectrum }'], 'Spectrum reference renderer');

const coreModes = read('js/features/visual/visual-engine-core-modes.js');
includesAll(coreModes, ['drawNeonShatterV2Mode', 'drawLiquidChromeV2Mode', 'const gatedDrift = time * activity * .16', 'const phase = time * activity * .2'], 'Validated baseline FFT modes');

// Build 56 dynamic-range system.
const motion = read('js/features/visual/motion-spring.js');
includesAll(motion, [
  'const FRAME_STATES = new WeakMap()', 'export function beginMotionFrame(', 'export function springChannel(',
  'export function shapeMotionTarget(', 'const knee = clamp(', 'const ceiling = clamp(',
  'export function motionPhase(', 'Math.pow(clamp(Number(activity) || 0, 0, 1.2), .62)', 'channel.velocity'
], 'Shared dynamic motion');

const pulse = read('js/features/visual/pulse-reactor.js');
includesAll(pulse, ['shapeMotionTarget', 'motionPhase(time, activity, .34)', 'const bassMomentum = clamp(', 'const impactMomentum = clamp(', 'const ringCount = mobile ? 3 : 4', 'const segmentCount = mobile ? 14 : 24'], 'Pulse Reactor dynamic breathing');
const fracture = read('js/features/visual/bass-fracture.js');
includesAll(fracture, ['shapeMotionTarget', 'motionPhase(time, activity, .28)', 'const ruptureMomentum = clamp(', 'const motionScale = mobile ? 1.48 : 1.12', 'const sectorCount = mobile ? 12 : 16', 'const crackCount = mobile ? 8 : 12'], 'Bass Fracture dynamic breathing');
const lens = read('js/features/visual/gravity-lens.js');
includesAll(lens, ['shapeMotionTarget', 'motionPhase(time, activity, .25)', 'const warpMomentum = clamp(', 'const shearMomentum = clamp(', 'const bandCount = mobile ? 4 : 6', 'const streamCount = mobile ? 8 : 14'], 'Gravity Lens dynamic breathing');
const bio = read('js/features/visual/bio-structure.js');
includesAll(bio, ['shapeMotionTarget', 'motionPhase(time, activity, .31)', 'const breathMomentum = clamp(', 'const flexMomentum = clamp(', 'const ribCount = mobile ? 5 : 8', 'const veinCount = mobile ? 8 : 14'], 'Bio Structure dynamic breathing');
for (const isolated of [pulse, fracture, lens, bio]) {
  assert.ok(!isolated.includes('requestAnimationFrame('), 'Isolated visual must use the shared renderer scheduler.');
  assert.ok(!isolated.includes('setInterval('), 'Isolated visual must not self-schedule an autonomous loop.');
  assert.ok(!isolated.includes('Math.random('), 'Isolated visual geometry must remain deterministic.');
}

const live = read('js/features/visual/visual-engine-live.js');
includesAll(live, [
  "{ id: 'bio-structure', label: 'Bio Structure', renderer: drawBioStructureMode }",
  'base.readSpectrum?.(raw)', 'reading = readAudioLabSpectrum(raw)',
  "dataset.audioLabRenderer = 'seven-core-v2'", `dataset.audioLabPresetCount = '${presetCount}'`,
  "mode === 'bass-fracture' || mode === 'gravity-lens' || mode === 'bio-structure' ? 1.05",
  'const CUSTOM_FRAME_INTERVAL = 1000 / 60'
], 'Live Audio Lab visuals');
for (const retired of ['aurora-glass', 'nebula', 'singularity', 'synthesizePlaybackSpectrum', "'bars'"]) assert.ok(!live.includes(retired), `Retired Audio Lab path returned: ${retired}.`);

const signal = read('js/features/audio-lab-signal.js');
includesAll(signal, ['createDecodedSourceProxy', 'context.decodeAudioData(bytes.slice(0))', 'context.createBufferSource()', "audio.dataset.audioPlaybackPath = 'html5-direct'", "audio.dataset.audioAnalysisPath = 'decoded-buffer'"], 'Isolated Audio Lab graph');
assert.ok(!signal.includes('captureStream('));
assert.ok(!signal.includes('createMediaStreamSource('));

// Mobile Studio/admin/PWA contracts.
includesAll(read('js/features/lyrics-studio.js'), ["video.setAttribute('webkit-playsinline', '')", "routeToHash({ type: 'studio', id: trackId })", "canvasVideo.addEventListener('canplay'"], 'Mobile Lyrics Studio');
includesAll(read('js/features/admin-access.js'), ['resolveLrcMakerAccess', 'https://shinobione.github.io/lrc-maker/', "label: 'LRC Maker'"], 'Admin access');
const worker = read('sw.js');
includesAll(worker, ["'./js/features/visual/motion-spring.js'", "'./js/features/visual/pulse-reactor.js'", "'./js/features/visual/bass-fracture.js'", "'./js/features/visual/gravity-lens.js'", "'./js/features/visual/bio-structure.js'"], 'PWA shell');

const build = assertCurrentBuild('Master specification/current release');
assert.equal(build.id, '20260808-dynamic-breathing-v56');
assert.equal(build.cache, 'shinobi-launchpad-v56');
assert.equal(build.display, '2026.08.08.56');
assert.equal(build.release, 'dynamic-breathing-20260808');
assert.equal(build.revision, 'dynamic-breathing-1');

console.log(`LaunchPAD master specification is regression-protected under ${build.display} (${build.release}) with ${presetCount} sanctioned Audio Lab presets.`);
