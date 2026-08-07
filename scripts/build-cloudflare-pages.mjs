import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();
const OUT = path.join(ROOT, 'dist', 'cloudflare-pages');

// Cloudflare Pages is only the host. The application runtime is copied
// verbatim from the GitHub checkout: no JS/CSS/HTML/PWA patching here.
const RUNTIME_ENTRIES = [
  'index.html',
  'css',
  'js',
  'assets',
  'manifest.webmanifest',
  'sw.js',
  'robots.txt',
  'sitemap.xml',
  '.nojekyll'
];

async function exists(target) {
  try {
    await fs.access(target);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  await fs.rm(OUT, { recursive: true, force: true });
  await fs.mkdir(OUT, { recursive: true });

  for (const entry of RUNTIME_ENTRIES) {
    const source = path.join(ROOT, entry);
    if (!(await exists(source))) continue;
    await fs.cp(source, path.join(OUT, entry), {
      recursive: true,
      force: true,
      preserveTimestamps: true
    });
  }

  await fs.writeFile(
    path.join(OUT, 'cloudflare-build.json'),
    `${JSON.stringify({
      mode: 'verbatim-github-runtime',
      sourceSha: process.env.CF_PAGES_COMMIT_SHA || process.env.GITHUB_SHA || 'checkout',
      sourceBranch: process.env.CF_PAGES_BRANCH || 'migration/cloudflare-pages',
      generatedAt: new Date().toISOString()
    }, null, 2)}\n`,
    'utf8'
  );

  console.log('Cloudflare Pages build: verbatim GitHub runtime copy.');
  console.log(`Output: ${path.relative(ROOT, OUT)}`);
  console.log('No application runtime patches were applied.');
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
