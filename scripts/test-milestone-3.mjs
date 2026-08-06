import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = path => fs.readFileSync(path, 'utf8');

const controls = read('cloudflare/admin-worker.parts/20-m3-track-manager-controls.inject.part');
for (const required of [
  "TRACK_MANAGER_MILESTONE_3_VERSION='5.6'",
  'function milestone3InstallReactiveFilters()',
  "panel.addEventListener('input',handler)",
  "panel.addEventListener('change',handler)",
  'state[key]=control.value',
  'renderTracks()',
  'function milestone3InstallManualPalette()',
  "button.id='manualPaletteExtract'",
  "button.textContent='Extraire les couleurs'",
  'feature10ExtractCoverColors(blob)',
  'state.milestone3ManualPalette=true',
  'function milestone3ProtectManualPalette(form)',
  "milestone3VersionPill.textContent='v5.6'"
]) assert.ok(controls.includes(required), `Milestone 3 controls are missing ${required}.`);

assert.ok(!/feature10ExtractCoverColors\([^)]*\).*addEventListener\(['"]change/s.test(controls), 'Palette extraction must not run automatically on cover change.');

const builder = read('scripts/build-admin-worker.mjs');
for (const required of [
  "'5.5'",
  "version: \"5.6\"",
  "<span class=\"version-pill\">v5.6</span>",
  "TRACK_MANAGER_MILESTONE_3_VERSION='5.6'",
  'function milestone3InstallReactiveFilters()',
  'function milestone3InstallManualPalette()'
]) assert.ok(builder.includes(required), `Track Manager builder is missing ${required}.`);

const workflow = read('.github/workflows/deploy-cloudflare.yml');
for (const required of [
  'push:',
  "- 'cloudflare/**'",
  "DEPLOY_TARGET: ${{ github.event_name == 'workflow_dispatch' && inputs.target || 'both' }}",
  "EXPECTED_ADMIN_VERSION: '5.6'",
  "if: github.event_name == 'workflow_dispatch'",
  "npm run deploy:cloudflare:admin",
  "node scripts/verify-cloudflare-deployment.mjs admin"
]) assert.ok(workflow.includes(required), `Cloudflare deployment workflow is missing ${required}.`);

console.log('Milestone 3 Track Manager filters, manual palette extraction and automatic Worker deployment are valid.');
