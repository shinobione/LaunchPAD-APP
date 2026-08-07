import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = path => fs.readFileSync(path, 'utf8');
const exists = path => fs.existsSync(path);

const pagesWorkflow = '.github/workflows/deploy-github-pages.yml';
assert.ok(exists(pagesWorkflow), 'Canonical GitHub Pages workflow is missing.');
assert.ok(!exists('.github/workflows/deploy-pages-custom.yml'), 'Obsolete recovery-named Pages workflow must stay deleted.');

const pages = read(pagesWorkflow);
for (const required of [
  'branches:\n      - main',
  'actions/checkout@v4',
  'npm run build:web',
  'npm run check:web-build',
  'cmp js/build-config.js dist/cloudflare-pages/js/build-config.js',
  'actions/upload-pages-artifact@v4',
  'actions/deploy-pages@v4'
]) assert.ok(pages.includes(required), `GitHub Pages topology is missing ${required}.`);
assert.ok(!/ref:\s*gh-pages/.test(pages), 'GitHub Pages must never deploy application source from gh-pages.');
assert.ok(!pages.includes("display: '2026."), 'GitHub Pages workflow must derive release metadata from build-config instead of pinning a build number.');
assert.ok(!pages.includes("release: 'unified-"), 'GitHub Pages workflow must not pin a release string.');

const workerDeploy = read('.github/workflows/deploy-cloudflare.yml');
assert.ok(workerDeploy.includes('workflow_dispatch:'), 'Production Worker deployment must be explicitly dispatched.');
assert.ok(!workerDeploy.includes('\n  push:'), 'Production Worker deployment must not run automatically on a main push.');
assert.ok(workerDeploy.includes("test \"${{ inputs.confirm }}\" = 'DEPLOY'"), 'Production Worker deployment must require explicit DEPLOY confirmation.');
assert.ok(workerDeploy.includes("if: github.ref == 'refs/heads/main'"), 'Production Worker deployment must be restricted to main.');

const packageJson = JSON.parse(read('package.json'));
assert.equal(packageJson.scripts['build:web'], 'node scripts/build-cloudflare-pages.mjs', 'Host-neutral web build command must wrap the compatibility builder.');
assert.equal(packageJson.scripts['check:web-build'], 'node scripts/validate-cloudflare-pages-build.mjs', 'Host-neutral web validation command must wrap the compatibility validator.');
assert.ok(packageJson.scripts.validate.includes('check:deployment-topology'), 'Full validation must guard deployment topology.');
assert.ok(packageJson.scripts.validate.includes('check:build-docs'), 'Full validation must guard documentation/build coherence.');

const builder = read('scripts/build-cloudflare-pages.mjs');
for (const required of [
  "mode: 'verbatim-github-runtime'",
  'process.env.CF_PAGES_COMMIT_SHA || process.env.GITHUB_SHA',
  'process.env.CF_PAGES_BRANCH',
  'process.env.GITHUB_REF_NAME',
  "|| 'main'",
  'No application runtime patches were applied.'
]) assert.ok(builder.includes(required), `Static web builder is missing ${required}.`);
assert.ok(!builder.includes("|| 'migration/cloudflare-pages'"), 'Generated web artifacts must not fall back to the retired migration branch.');

const validator = read('scripts/validate-cloudflare-pages-build.mjs');
for (const required of [
  "mode !== 'verbatim-github-runtime'",
  'Runtime file was modified during build',
  'Full feature initializers are present.'
]) assert.ok(validator.includes(required), `Static artifact validator is missing ${required}.`);

const build = read('js/build-config.js');
const configBlock = build.match(/const config = Object\.freeze\(\{([\s\S]*?)\n  \}\);/)?.[1] || '';
for (const field of ['id', 'cache', 'revision', 'display', 'release']) {
  assert.match(configBlock, new RegExp(`${field}:\\s*'[^']+'`), `Central build config is missing ${field}.`);
}
assert.ok(build.includes('globalThis.SHINOBIWAN_BUILD = config;'), 'Central build config must expose the active release.');

const topology = read('docs/DEPLOYMENT-TOPOLOGY.md');
for (const required of [
  '`main` is the only authoritative application source',
  'GitHub Pages',
  'Cloudflare Pages',
  'Cloudflare R2',
  'Lovable is prototype-only'
]) assert.ok(topology.includes(required), `Deployment topology documentation is missing ${required}.`);

const architecture = read('ARCHITECTURE.md');
assert.ok(architecture.includes('GitHub `main`'), 'Architecture must identify GitHub main as source authority.');
assert.ok(architecture.includes('R2 manifests/media are the production track/media authority.'), 'Architecture must identify R2 data authority.');

const readme = read('README.md');
assert.ok(readme.includes('GitHub `main` is the only application-code authority'), 'README must identify main as the application source of truth.');
assert.ok(readme.includes('docs/DEPLOYMENT-TOPOLOGY.md'), 'README must link the canonical deployment topology.');
assert.ok(readme.includes('check:build-docs'), 'README must document build-synchronized Markdown validation.');

console.log('Deployment topology is coherent: one GitHub source, mirrored web hosts, manual Workers, separate R2 state, synchronized docs.');
