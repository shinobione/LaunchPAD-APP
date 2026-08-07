import assert from 'node:assert/strict';
import fs from 'node:fs';

const retiredPaths = [
  'docs/BRANCH-CLEANUP-V40.md',
  'R2-CLEANUP-AUDIT.md',
  'scripts/audit-r2-cleanup-readiness.mjs',
  'assets/ShinoBiWan-Golden-LOGO.jpeg',
  'assets/ShinoBiWan-Golden-LOGO.png',
  'assets/logo1.png',
  'assets/pwa-icon-192.svg',
  'assets/pwa-icon-512.svg',
  'assets/pwa-icon-512.png'
];

for (const path of retiredPaths) {
  assert.ok(!fs.existsSync(path), `Retired repository artifact returned: ${path}`);
}

const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
assert.ok(!packageJson.scripts?.['audit:r2'], 'The completed one-time R2 cleanup audit command must stay retired.');

const expectedWorkflows = [
  'deploy-cloudflare.yml',
  'deploy-github-pages.yml',
  'rollback-cloudflare.yml',
  'validate-catalog.yml',
  'validate-cloudflare.yml',
  'validate-horizontal-overflow.yml'
].sort();
const workflows = fs.readdirSync('.github/workflows').filter(name => name.endsWith('.yml') || name.endsWith('.yaml')).sort();
assert.deepEqual(workflows, expectedWorkflows, 'Unexpected legacy or duplicate GitHub Actions workflow detected.');

for (const name of workflows) {
  const source = fs.readFileSync(`.github/workflows/${name}`, 'utf8').toLowerCase();
  assert.ok(!source.includes('lovable'), `${name} must not deploy or depend on Lovable.`);
}

// These filenames look historical but are still active runtime/deployment entry points.
for (const activePath of [
  'js/app-engine-recovery.js',
  'js/navigation-stability-v39.js',
  'css/ui-stability-v39.css',
  'cloudflare/public-worker-v26.js',
  'cloudflare/migration-manifest.json'
]) {
  assert.ok(fs.existsSync(activePath), `Active compatibility/deployment artifact must not be removed blindly: ${activePath}`);
}

console.log('Repository cleanup guard passed: dead assets/audits are gone and only canonical workflows remain.');
