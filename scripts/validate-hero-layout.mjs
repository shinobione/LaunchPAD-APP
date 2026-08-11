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
  /\.launchpad-banner-rail\s*\{[\s\S]*?aspect-ratio:\s*2\.08\s*\/\s*1\s*!important;[\s\S]*?overflow:\s*hidden\s*!important;[\s\S]*?border:\s*0\s*!important;[\s\S]*?background:\s*transparent\s*!important;[\s\S]*?box-shadow:\s*none\s*!important;/,
  'Desktop Home logo framing window must remain visually borderless and transparent.'
);

requirePattern(
  desktop,
  /\.hero-banner-art\s*\{[\s\S]*?height:\s*100%\s*!important;[\s\S]*?object-fit:\s*cover\s*!important;[\s\S]*?mix-blend-mode:\s*screen\s*!important;[\s\S]*?transform:\s*none\s*!important;[\s\S]*?transition:\s*none\s*!important;/,
  'Desktop Home must crop the logo without drift and neutralize the dark bitmap plate with screen blending.'
);

requirePattern(
  desktop,
  /\.launchpad-hero:hover\s+\.hero-banner-art\s*\{[\s\S]*?mix-blend-mode:\s*screen\s*!important;[\s\S]*?transform:\s*none\s*!important;[\s\S]*?filter:\s*drop-shadow/,
  'Desktop Home hover must preserve the same static logo blend, position and filter.'
);

if (/transform:\s*translate\(\s*-50%\s*,\s*-50%\s*\)\s*!important;/.test(desktop)) {
  throw new Error('Desktop Home must not reintroduce transform-based logo centering; it conflicts with historical hover rules.');
}

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

console.log('Hero profile sizing, borderless transform-free desktop logo framing, artwork visibility, LAUNCHPAD-first mobile ordering and generic build revision metadata are guarded.');
