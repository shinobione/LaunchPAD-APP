import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

const ROOT = process.cwd();
const OUT = path.join(ROOT, 'dist', 'cloudflare-pages');
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

const REQUIRED = [
  'index.html',
  'js/app-main.js',
  'js/app-engine-recovery.js',
  'js/features/lyrics-studio.js',
  'js/features/track-detail.js',
  'js/features/track-videos.js',
  'js/features/smart-canvas.js',
  'js/features/library-memory.js',
  'js/features/player-experience.js',
  'js/features/visual/audio-lab-registry.js',
  'js/features/visual/audio-lab-sanctuary-v2.js',
  'manifest.webmanifest',
  'sw.js'
];

async function exists(target) {
  try {
    await fs.access(target);
    return true;
  } catch {
    return false;
  }
}

async function walk(target, relative = '') {
  const result = [];
  const full = path.join(target, relative);
  const stat = await fs.stat(full);
  if (stat.isFile()) return [relative];
  for (const entry of await fs.readdir(full, { withFileTypes: true })) {
    const child = path.join(relative, entry.name);
    if (entry.isDirectory()) result.push(...await walk(target, child));
    else if (entry.isFile()) result.push(child);
  }
  return result;
}

async function digest(file) {
  return crypto.createHash('sha256').update(await fs.readFile(file)).digest('hex');
}

async function assertVerbatim(entry) {
  const source = path.join(ROOT, entry);
  if (!(await exists(source))) return;
  const stat = await fs.stat(source);
  if (stat.isFile()) {
    const output = path.join(OUT, entry);
    if (!(await exists(output))) throw new Error(`Missing output file: ${entry}`);
    if (await digest(source) !== await digest(output)) {
      throw new Error(`Runtime file was modified during build: ${entry}`);
    }
    return;
  }

  const sourceFiles = (await walk(source)).sort();
  const outputFiles = (await walk(path.join(OUT, entry))).sort();
  if (JSON.stringify(sourceFiles) !== JSON.stringify(outputFiles)) {
    throw new Error(`Runtime directory differs from GitHub checkout: ${entry}`);
  }
  for (const relative of sourceFiles) {
    const sourceFile = path.join(source, relative);
    const outputFile = path.join(OUT, entry, relative);
    if (await digest(sourceFile) !== await digest(outputFile)) {
      throw new Error(`Runtime file was modified during build: ${path.join(entry, relative)}`);
    }
  }
}

async function main() {
  for (const file of REQUIRED) {
    if (!(await exists(path.join(OUT, file)))) throw new Error(`Required runtime file missing: ${file}`);
  }

  for (const entry of RUNTIME_ENTRIES) await assertVerbatim(entry);

  const engine = await fs.readFile(path.join(OUT, 'js/app-engine-recovery.js'), 'utf8');
  const requiredInitializers = [
    'initLibraryMemory({ audio })',
    'initTrackDetail({ audio })',
    'initTrackVideos({ audio })',
    'initSmartCanvasManager()',
    'initVisualCard({ audio })',
    'feature11.initFeature11({ audio })',
    'initPhase12()',
    'initPhase13({ audio })',
    'initThemeScoping({ audio })',
    'initDiscographyExperience({ audio })',
    'initHomeEditorial()',
    'initAudioLabSanctuary({ audio })',
    'pwa.initPWA()'
  ];
  for (const marker of requiredInitializers) {
    if (!engine.includes(marker)) throw new Error(`Full runtime initializer missing: ${marker}`);
  }

  const appMain = await fs.readFile(path.join(OUT, 'js/app-main.js'), 'utf8');
  if (!appMain.includes('initLyricsStudio()')) throw new Error('Lyrics Studio is not enabled in full runtime.');

  const metadata = JSON.parse(await fs.readFile(path.join(OUT, 'cloudflare-build.json'), 'utf8'));
  if (metadata.mode !== 'verbatim-github-runtime') throw new Error('Unexpected Cloudflare build mode.');

  console.log('Cloudflare Pages validation passed: runtime is verbatim GitHub source.');
  console.log('Full feature initializers are present.');
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
