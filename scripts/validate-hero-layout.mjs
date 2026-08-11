import fs from 'node:fs';

function read(path) {
  return fs.readFileSync(path, 'utf8');
}

function requirePattern(source, pattern, message) {
  if (!pattern.test(source)) throw new Error(message);
}

const desktop = read('css/desktop-hero-wide.css');
const mobile = read('css/mobile-top-cleanup.css');
const finalArtwork = read('css/content-v4.css');
const feature11 = read('css/feature-11.css');
const buildConfig = read('js/build-config.js');

for (const [label, source] of [['desktop', desktop], ['mobile', mobile]]) {
  requirePattern(
    source,
    /\.launchpad-hero\s+\.hero-profile-card\s*>\s*img\s*\{[\s\S]*?height:\s*auto\s*!important;[\s\S]*?aspect-ratio:\s*4\s*\/\s*5\s*!important;/,
    `${label}: the hero profile image must ignore intrinsic HTML height and keep a 4:5 ratio.`
  );
}

requirePattern(
  desktop,
  /\.launchpad-banner-rail\s*\{[\s\S]*?aspect-ratio:\s*2\.08\s*\/\s*1\s*!important;[\s\S]*?overflow:\s*hidden\s*!important;/,
  'Desktop Home must frame the visible Shino LaunchPAD artwork rather than its transparent PNG canvas.'
);

requirePattern(
  desktop,
  /\.hero-banner-art\s*\{[\s\S]*?height:\s*auto\s*!important;[\s\S]*?transform:\s*translate\(-50%,\s*-50%\)\s*!important;/,
  'Desktop Home must center-crop only the transparent vertical padding around the new logo artwork.'
);

requirePattern(
  finalArtwork,
  /\.hero-banner-art\s*\{[\s\S]*?opacity:\s*1\s*!important;[\s\S]*?visibility:\s*visible\s*!important;/,
  'The LAUNCHPAD artwork must remain visible in the final cascade.'
);

requirePattern(
  feature11,
  /@media\s*\(max-width:\s*760px\)[\s\S]*?\.launchpad-hero\s+\.launchpad-banner-rail\s*\{[\s\S]*?order:\s*1[\s\S]*?\.launchpad-hero\s+\.hero-body\s*\{[\s\S]*?order:\s*2/,
  'The LAUNCHPAD banner must remain above the artist photo and identity on mobile.'
);

requirePattern(
  buildConfig,
  /revision:\s*'[a-z0-9][a-z0-9-]*'/i,
  'The build config must expose a stable non-empty revision slug so cached shell assets can refresh.'
);

console.log('Hero profile sizing, desktop logo framing, artwork visibility, LAUNCHPAD-first mobile ordering and generic build revision metadata are guarded.');
