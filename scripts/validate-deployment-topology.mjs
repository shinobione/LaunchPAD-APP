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
  'node scripts/build-cloudflare-pages.mjs',
  'node scripts/validate-cloudflare-pages-build.mjs',
  'cmp js/build-config.js dist/cloudflare-pages/js/build-config.js',
  'actions/upload-pages-artifact@v4',
  'actions/deploy-pages@v4'
]) assert.ok(pages.includes(required), `GitHub Pages topology is missing ${required}.`);
assert.ok(!/ref:\s*gh-pages/.test(pages), 'GitHub Pages must never deploy application source from gh-pages.');
assert.ok(!pages.includes("display: '2026."), 'GitHub Pages workflow must derive release metadata from build-config instead of pinning a build number.');
assert.ok(!pages.includes("release: 'unified-"), 'GitHub Pages workflow must not pin a release string.');

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
  'Lovable is treated as an external prototyping/experimentation environment only'
]) assert.ok(topology.includes(required), `Deployment topology documentation is missing ${required}.`);

const architecture = read('ARCHITECTURE.md');
assert.ok(architecture.includes('GitHub `main`'), 'Architecture must identify GitHub main as source authority.');
assert.ok(architecture.includes('R2 manifests/media are the only production track/media authority.'), 'Architecture must identify R2 data authority.');

const readme = read('README.md');
assert.ok(readme.includes('**Source of truth:** `main`'), 'README must identify main as the application source of truth.');
assert.ok(readme.includes('docs/DEPLOYMENT-TOPOLOGY.md'), 'README must link the canonical deployment topology.');

console.log('Deployment topology is coherent: one GitHub source, two mirrored web hosts, separate Workers/R2 state.');
