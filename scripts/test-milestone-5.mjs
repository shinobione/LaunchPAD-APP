import assert from 'node:assert/strict';
import fs from 'node:fs';
import { assertCurrentBuild } from './lib/build-metadata.mjs';

const read = path => fs.readFileSync(path, 'utf8');

const feature = read('js/features/discography-experience.js');
for (const required of [
  "const FILTER_GROUP_ORDER = ['genre', 'language', 'content', 'energy', 'era', 'type', 'media', 'year', 'mood']",
  "const ERA_PARAMETER = 'cf_era'",
  'function erasFromCatalog()',
  "track?.remoteMetadata?.era || track?.era",
  'function installEraTimeline()',
  'data-era-value',
  'function orderFilterGroups()',
  'function enrichCard(card)',
  "signalGroup('Moods', signals.moods)",
  "signalGroup('Themes', signals.themes)",
  'function synchronizeNowPlaying(audio, loading = false)',
  "delete button.dataset.playIndex",
  "button.dataset.action = 'toggle'",
  'mini-equalizer',
  'track-card-loader',
  "audio?.addEventListener(type, () =>",
  'export function initDiscographyExperience'
]) assert.ok(feature.includes(required), `Milestone 5 discography module is missing ${required}.`);

const styles = read('css/discography-experience.css');
for (const required of [
  '.era-timeline',
  '.era-timeline-item.active',
  '.track-card-signals',
  '.track-card-signal-group',
  '.album-card.is-current',
  '@keyframes track-card-active-border',
  '.mini-equalizer',
  '.track-card-loader',
  '@media(prefers-reduced-motion:reduce)'
]) assert.ok(styles.includes(required), `Milestone 5 styles are missing ${required}.`);

const engine = read('js/app-engine.js');
for (const required of [
  "'css/discography-experience.css'",
  "import(versioned('./features/discography-experience.js'))",
  'initDiscographyExperience({ audio })'
]) assert.ok(engine.includes(required), `Milestone 5 boot wiring is missing ${required}.`);

const worker = read('sw.js');
assert.ok(worker.includes("'./css/discography-experience.css'"));
assert.ok(worker.includes("'./js/features/discography-experience.js'"));

const build = assertCurrentBuild('Milestone 5');
console.log(`Milestone 5 Discography hierarchy, dynamic Eras and now-playing cards remain valid under Build ${build.number}.`);
