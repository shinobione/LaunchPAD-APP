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
  /revision:\s*'(?:audio-buffer-audiolab-admin-1|visual-card-cors-mobile-layout-1|cloudflare-main-reconciliation-1|routing-video-sorting-1|phase12-ui-hotfixes-1|phase13-visuals-palette-filters-1|phase13-mobile-about-layout-1|audiolab-signal-recovery-1|mobile-hero-order-1)'/,
  'The build config must refresh cached routing, video, mobile hero and current phase assets.'
);

console.log('Hero profile sizing, artwork visibility and LAUNCHPAD-first mobile ordering are guarded.');
