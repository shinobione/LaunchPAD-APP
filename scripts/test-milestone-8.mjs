import assert from 'node:assert/strict';
import fs from 'node:fs';
import { assertCurrentBuild } from './lib/build-metadata.mjs';

const read = path => fs.readFileSync(path, 'utf8');

const icons = read('js/features/svg-icon-system.js');
for (const required of [
  "const SVG_NS = 'http://www.w3.org/2000/svg'",
  "svg.setAttribute('stroke', 'currentColor')",
  "svg.setAttribute('stroke-width', '1.8')",
  'const VIEW_ICONS = Object.freeze({',
  "home: 'home'",
  "library: 'grid'",
  "favorites: 'heart'",
  "lab: 'waveform'",
  'function iconizeNavigation(',
  'function iconizeControls(',
  "if (button.querySelector('.mini-equalizer,.track-card-loader')) return",
  'export function initSvgIconSystem()'
]) assert.ok(icons.includes(required), `SVG icon system is missing ${required}.`);

const iconStyles = read('css/svg-icon-system.css');
for (const required of [
  '.ui-icon',
  'color:currentColor',
  'min-width:40px',
  'min-height:40px',
  '@media(max-width:760px)',
  'min-width:44px',
  'min-height:44px'
]) assert.ok(iconStyles.includes(required), `SVG icon styles are missing ${required}.`);

const badges = read('js/features/badge-hierarchy.js');
for (const required of [
  "const STATUS_LABELS = new Set(['CLEAN', 'EXPLICIT', 'LYRICS', 'LYRICS SYNCED', 'VIDEO', 'UPCOMING', 'DRAFT'])",
  'function statusBadges(track, { admin = false } = {})',
  "statuses.push(synchronized ? 'LYRICS SYNCED' : 'LYRICS')",
  "if (status === 'upcoming') statuses.push('UPCOMING')",
  "if (admin && status === 'draft') statuses.push('DRAFT')",
  'function parentGenre(track)',
  'function secondaryTags(track, genre, statuses)',
  'secondary.slice(0, 3)',
  'secondary.length - 3',
  'TECHNICAL_TAG.test(label)',
  'export function initBadgeHierarchy()'
]) assert.ok(badges.includes(required), `Badge hierarchy is missing ${required}.`);
assert.ok(!/^\s*if\s*\(status === 'draft'\) statuses\.push\('DRAFT'\)/m.test(badges), 'DRAFT must remain Track Manager-only.');

const badgeStyles = read('css/badge-hierarchy.css');
for (const required of [
  '.catalog-badge.level-1',
  '.catalog-badge.level-2',
  '.catalog-badge.level-3',
  '.catalog-badge.status-explicit',
  '.catalog-badge.status-clean',
  '.catalog-badge.secondary-overflow'
]) assert.ok(badgeStyles.includes(required), `Badge hierarchy styles are missing ${required}.`);

const manager = read('cloudflare/admin-worker.parts/21-m8-svg-badges.inject.part');
for (const required of [
  "TRACK_MANAGER_MILESTONE_8_VERSION='5.7'",
  "svg.setAttribute('stroke','currentColor')",
  'function milestone8InstallIcon(control)',
  'function milestone8Statuses(track)',
  "if(status==='draft')result.push('DRAFT')",
  'function milestone8ParentGenre(value)',
  'function milestone8Secondary(track,genre,statuses)',
  'tags.slice(0,3)',
  "milestone8Badge('+'+(tags.length-3),3,'secondary-overflow')",
  "pill.textContent='v5.7'"
]) assert.ok(manager.includes(required), `Track Manager Milestone 8 is missing ${required}.`);

const builder = read('scripts/build-admin-worker.mjs');
for (const required of [
  "'5.6'",
  "'5.7'",
  'version: "5.8"',
  '<span class="version-pill">v5.8</span>',
  "TRACK_MANAGER_MILESTONE_8_VERSION='5.7'",
  'function milestone8Hydrate()',
  'function milestone8RenderBadges(card)'
]) assert.ok(builder.includes(required), `Track Manager builder is missing ${required}.`);

const deployment = read('.github/workflows/deploy-cloudflare.yml');
assert.ok(deployment.includes("EXPECTED_ADMIN_VERSION: '5.8'"));
assert.ok(deployment.includes("EXPECTED_PUBLIC_VERSION: '2.6'"));
assert.ok(deployment.includes('workflow_dispatch:'));
assert.ok(!deployment.includes('\n  push:'), 'Production Worker deployment must remain manual-only.');

const engine = read('js/app-engine.js');
for (const required of [
  "'css/svg-icon-system.css'",
  "'css/badge-hierarchy.css'",
  "import(versioned('./features/svg-icon-system.js'))",
  "import(versioned('./features/badge-hierarchy.js'))",
  'initSvgIconSystem()',
  'initBadgeHierarchy()'
]) assert.ok(engine.includes(required), `Milestone 8 boot wiring is missing ${required}.`);

const worker = read('sw.js');
for (const required of [
  "'./css/svg-icon-system.css'",
  "'./css/badge-hierarchy.css'",
  "'./js/features/svg-icon-system.js'",
  "'./js/features/badge-hierarchy.js'"
]) assert.ok(worker.includes(required), `Milestone 8 offline shell is missing ${required}.`);

const build = assertCurrentBuild('Milestone 8');
console.log(`Milestone 8 historical v5.7 SVG/badge layer remains intact while the current Track Manager assembles/deploys as v5.8 under Build ${build.number}.`);
