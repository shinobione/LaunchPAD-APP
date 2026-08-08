import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { assertCurrentBuild } from './lib/build-metadata.mjs';
import {
  normalizeEditorialTags,
  parentEditorialTag
} from '../js/core/editorial-normalization.js';

const read = path => fs.readFileSync(path, 'utf8');

assert.equal(parentEditorialTag('Filthy Abyssal Trap'), 'Trap');
assert.equal(parentEditorialTag('Industrial Cybertrap'), 'Trap');
assert.equal(parentEditorialTag('Spotify Canvas'), null);
assert.equal(parentEditorialTag('SPOTIFY CANVA'), null);
assert.deepEqual(normalizeEditorialTags(['Filthy Abyssal Trap', 'Cybertrap', 'Spotify Canvas', 'Romantic', 'R&B'], { max: 4 }), ['Trap', 'Romantic', 'R&B']);

const engine = read('js/app-engine.js');
for (const required of ['normalizeCatalogEditorialTags','initContentAdvisoryBadges','css/feature-10.css']) {
  assert.ok(engine.includes(required), `Feature 10 engine is missing ${required}.`);
}

const advisory = read('js/features/content-advisory-badges.js');
for (const required of ['track-cover-status-stack','content-advisory-badge',"label: 'EXPLICIT'","label: 'CLEAN'",'.lyrics-card-badge','.lyrics-studio-canvas-badge']) {
  assert.ok(advisory.includes(required), `Content advisory UI is missing ${required}.`);
}

const smartParser = read('cloudflare/admin-worker.parts/08a-feature-10-smart-parsing.inject.part');
for (const required of ["TRACK_MANAGER_SMART_PARSING_VERSION='10.2'",'function feature10ParseReleaseDate(text)','RELEASE|RELEASE_DATE',"result.metadata.releaseDate=releaseDate","['STYLE PROMPT','SUNO STYLE','STYLE']",'function feature10InferSignals(payload)','async function feature10ExtractCoverColors(blob)','feature10ApplyCoverColors','feature10Recalculate','Analyser / recalculer','feature10NormalizeGenres']) {
  assert.ok(smartParser.includes(required), `Smart Track Manager parsing is missing ${required}.`);
}

const scopeFix = read('cloudflare/admin-worker.parts/08b-feature-10-parser-scope-fix.inject.part');
assert.ok(scopeFix.includes("TRACK_MANAGER_SMART_PARSING_SCOPE_VERSION='10.2.1'"));
assert.ok(scopeFix.includes('feature10MergeCurrentFormSignals'));

const colorDiversity = read('cloudflare/admin-worker.parts/08c-feature-10-color-diversity.inject.part');
for (const required of ["TRACK_MANAGER_COLOR_DIVERSITY_VERSION='10.3'",'function feature103ColorMetrics(rgb)','function feature103HueDistance(left,right)','function feature103ChooseThemeColors(candidates)','feature10ExtractCoverColors=async function(blob)','feature103HueDistance(primary.metrics.hue,candidate.metrics.hue)>=42']) {
  assert.ok(colorDiversity.includes(required), `Hue-diverse cover extraction is missing ${required}.`);
}

const colorContext = vm.createContext({
  feature10ExtractCoverColors: async () => [],
  feature10ColorDistance(left, right) { const dr=left[0]-right[0], dg=left[1]-right[1], db=left[2]-right[2]; return dr*dr+dg*dg+db*db; },
  feature10Hex(rgb) { return `#${rgb.map(value => Math.round(value).toString(16).padStart(2, '0')).join('')}`; },
  loadImageSource: async () => ({ close() {} }),
  document: {}
});
vm.runInContext(`${colorDiversity}\nglobalThis.__metrics=feature103ColorMetrics;globalThis.__score=feature103CandidateScore;globalThis.__choose=feature103ChooseThemeColors;`, colorContext);
const sampleCandidates = [{ count:300,rgb:[120,165,199] },{ count:260,rgb:[193,212,217] },{ count:115,rgb:[147,138,51] }].map(candidate => {
  candidate.metrics = colorContext.__metrics(candidate.rgb);
  candidate.score = colorContext.__score(candidate);
  return candidate;
});
const selectedColors = JSON.parse(JSON.stringify(colorContext.__choose(sampleCandidates)));
assert.deepEqual(selectedColors[0], [120,165,199]);
assert.deepEqual(selectedColors[1], [147,138,51]);

const batchColors = read('cloudflare/admin-worker.parts/09a-feature-10-batch-colors.inject.part');
assert.ok(batchColors.includes("TRACK_MANAGER_BATCH_COLOR_VERSION='10.2'"));
assert.ok(batchColors.includes('feature10ExtractCoverColors'));
assert.ok(batchColors.includes("group.metadata.accent=colors[0]"));

const managerUI = read('cloudflare/admin-worker.parts/16-feature-10-manager-ui.inject.part');
for (const required of ["TRACK_MANAGER_FEATURE_10_VERSION='5.1'","state.catalogStatusFilter='all'","state.catalogIssueFilter='all'","state.catalogLyricsFilter='all'","state.catalogContentFilter='all'","['#sTotal','all']","['#sPublished','published']","['#sDraft','draft']","['#sIncomplete','incomplete']",'function feature10StatusMatches(track,filter)','function feature10IssueMatches(track,filter)','function feature10LyricsMatches(track,filter)','function feature10ContentMatches(track,filter)','catalogAdvancedFilters','catalogIssueFilter','catalogLyricsFilter','catalogContentFilter','Complets mais sans date','DATE ABSENTE','data-content-rating','CONTENU NON VÉRIFIÉ',"feature10VersionPill.textContent='v5.1'"]) {
  assert.ok(managerUI.includes(required), `Track Manager Feature 10 UI is missing ${required}.`);
}

const pwa = read('js/features/pwa.js');
for (const required of ["window.addEventListener('beforeinstallprompt'",'pwa-install-banner','Install the app','fetchRemoteRelease','release-check',"window.addEventListener('focus'","window.addEventListener('pageshow'",'ACTIVATION_TIMEOUT_MS','completeWithReload','hide({ immediate: true })']) {
  assert.ok(pwa.includes(required), `PWA Feature 10 is missing ${required}.`);
}

const serviceWorker = read('sw.js');
for (const required of ['./css/feature-10.css','./js/core/editorial-normalization.js','./js/features/content-advisory-badges.js',"url.pathname.endsWith('/js/build-config.js')",'freshBuildMetadata']) {
  assert.ok(serviceWorker.includes(required), `Feature 10 service worker is missing ${required}.`);
}

const deployWorkflow = read('.github/workflows/deploy-cloudflare.yml');
assert.ok(deployWorkflow.includes("EXPECTED_ADMIN_VERSION: '5.8'"));
assert.ok(deployWorkflow.includes("EXPECTED_PUBLIC_VERSION: '2.6'"));
assert.ok(deployWorkflow.includes('workflow_dispatch:'));
assert.ok(!deployWorkflow.includes('\n  push:'), 'Production Worker deployment must remain manual-only.');

const build = assertCurrentBuild('Feature 10');
console.log(`Feature 10 remains valid under public Worker v2.6, current Track Manager v5.8 and Build ${build.number}.`);
