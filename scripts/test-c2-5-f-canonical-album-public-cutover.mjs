import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  albums,
  canonicalAlbums,
  getAlbum,
  getAlbumAuthority,
  getAlbumTracks,
  mergeRemoteAlbums,
  mergeRemoteTracks,
} from '../js/core/catalog-store.js';

mergeRemoteTracks([
  {
    id: 'neon-a', title: 'Neon A', file: '/neon-a.mp3', cover: '/neon-a.webp',
    albumId: 'neon-heartbreaks', album: 'Neon Heartbreaks', languages: ['English'], remote: true,
  },
  {
    id: 'coal-cache-orphan', title: 'Coal cache orphan', file: '/coal.mp3', cover: '/coal.webp',
    albumId: 'coal-to-diamond', album: 'Coal to Diamond', languages: ['English'], remote: true,
  },
  {
    id: 'single-a', title: 'Single A', file: '/single-a.mp3', cover: '/single-a.webp',
    albumId: 'singles', album: 'Singles', languages: ['English'], remote: true,
  },
]);

let result = mergeRemoteAlbums([
  {
    id: 'neon-heartbreaks', title: 'Neon Heartbreaks canonical', type: 'album', status: 'published',
    cover: '/neon.webp', trackIds: ['neon-a'], accent: '#21d4fd', accent2: '#8c52ff',
  },
], { authoritative: false });

assert.equal(result.authority, 'legacy-fallback', 'C2.5-B transitional hydration must remain available when no authoritative public signal exists.');
assert.ok(getAlbum('love-letters-from-saigon'), 'Legacy fallback must remain available in degraded/transitional mode.');

result = mergeRemoteAlbums([
  {
    id: 'neon-heartbreaks', title: 'Neon Heartbreaks canonical', type: 'album', status: 'published',
    cover: 'https://media.test/albums/neon-heartbreaks/cover.webp', trackIds: ['neon-a'], accent: '#21d4fd', accent2: '#8c52ff',
  },
  {
    id: 'coal-to-diamond', title: 'Coal to Diamond canonical', type: 'album', status: 'published',
    cover: 'https://media.test/albums/coal-to-diamond/cover.webp', trackIds: [],
  },
], { authoritative: true });

assert.equal(result.authority, 'canonical-r2');
assert.equal(getAlbumAuthority(), 'canonical-r2');
assert.equal(canonicalAlbums.length, 2);
assert.equal(getAlbum('neon-heartbreaks').title, 'Neon Heartbreaks canonical');
assert.equal(getAlbum('neon-heartbreaks').accent, '#21d4fd');
assert.equal(getAlbum('neon-heartbreaks').accent2, '#8c52ff');
assert.equal(getAlbum('love-letters-from-saigon'), null, 'A stale catalog.js Album must disappear once canonical R2 authority is active.');
assert.equal(getAlbum('singles')?.source, 'virtual-singles', 'Singles must become a virtual collection, not a canonical R2 Album.');
assert.deepEqual(getAlbumTracks('neon-heartbreaks').map(track => track.id), ['neon-a']);
assert.deepEqual(
  getAlbumTracks('singles').map(track => track.id),
  ['coal-cache-orphan', 'single-a'],
  'Virtual Singles must be derived from tracks not claimed by canonical album.trackIds, not from the transitional track album cache.',
);
assert.deepEqual(albums.map(album => album.id), ['neon-heartbreaks', 'coal-to-diamond', 'singles']);

result = mergeRemoteAlbums([], { authoritative: false });
assert.equal(result.authority, 'legacy-fallback');
assert.equal(getAlbumAuthority(), 'legacy-fallback');
assert.ok(getAlbum('love-letters-from-saigon'), 'Offline/degraded fallback must restore legacy catalog.js Albums.');

const publicWorker = fs.readFileSync('cloudflare/public-worker-v28.js', 'utf8');
const wrangler = fs.readFileSync('cloudflare/wrangler.public.jsonc', 'utf8');
const remoteCatalog = fs.readFileSync('js/core/remote-catalog.js', 'utf8');
const catalogStore = fs.readFileSync('js/core/catalog-store.js', 'utf8');
const albumDetail = fs.readFileSync('js/features/album-detail.js', 'utf8');
const buildConfig = fs.readFileSync('js/build-config.js', 'utf8');
const deployVerifier = fs.readFileSync('scripts/verify-cloudflare-deployment.mjs', 'utf8');

for (const marker of [
  'PUBLIC_WORKER_VERSION = 2.8',
  "CATALOG_INDEX_KEY = 'catalog/index.json'",
  "ALBUMS_PREFIX = 'albums/'",
  'canonicalAlbumVisibilityState',
  "owner.status === 'published'",
  "pathname === '/tracks'",
  '/media\\/([a-z0-9][a-z0-9-]{0,119})',
  "parentAlbumVisibility = 'canonical-trackIds-v1'",
]) assert.ok(publicWorker.includes(marker), `Public Worker v2.8 is missing ${marker}.`);

assert.ok(!publicWorker.includes('MEDIA_BUCKET.put('), 'Public parent-Album visibility gate must remain read-only.');
assert.ok(!publicWorker.includes('MEDIA_BUCKET.delete('), 'Public parent-Album visibility gate must not delete R2 objects.');
assert.ok(wrangler.includes('"main": "public-worker-v28.js"'), 'Wrangler public entry point must use v2.8.');

for (const marker of [
  "albumAuthority: payload.albumAuthority === 'canonical-r2' ? 'canonical-r2' : null",
  "authoritative: remote.albumAuthority === 'canonical-r2'",
  'remoteAlbumCount: remote.albums.length',
]) assert.ok(remoteCatalog.includes(marker), `Remote Album hydration is missing ${marker}.`);

for (const marker of [
  "const VIRTUAL_SINGLES_ID = 'singles'",
  "source: 'virtual-singles'",
  'let canonicalAlbumAuthority = false',
  'export function getAlbumAuthority()',
  'canonicalAlbumAuthority ? canonicalAlbums : legacyAlbums',
]) assert.ok(catalogStore.includes(marker), `Catalog authority cutover is missing ${marker}.`);

for (const marker of [
  'normalizeAlbumThemeColor',
  "view.style.setProperty('--album-accent', primary)",
  "view.style.setProperty('--album-accent2', secondary)",
  "view.dataset.albumPalette = primary || secondary ? 'canonical' : 'fallback'",
  '--album-accent2',
  'linear-gradient(135deg,color-mix(in srgb,var(--album-accent)',
]) assert.ok(albumDetail.includes(marker), `Canonical Album palette theming is missing ${marker}.`);

for (const marker of [
  'globalThis.SHINOBIWAN_BUILD = config',
  'const stylesheetVersion = config.id',
  'ensureBuildStylesheet',
]) assert.ok(buildConfig.includes(marker), `Build config contract is missing ${marker}.`);

for (const marker of [
  'CLOUDFLARE_PUBLIC_VERIFY_ATTEMPTS || 60',
  'CLOUDFLARE_PUBLIC_VERIFY_DELAY_MS || 3000',
  'let lastObservation = null',
  'Public Worker header',
  'Last observation:',
]) assert.ok(deployVerifier.includes(marker), `C2.5-F deployment propagation guard is missing ${marker}.`);

const versionAssertionIndex = deployVerifier.indexOf('Public version ${health.version');
const authorityAssertionIndex = deployVerifier.indexOf('Public /health Album authority');
assert.ok(versionAssertionIndex >= 0, 'Public deployment verifier must assert the expected Worker version.');
assert.ok(authorityAssertionIndex > versionAssertionIndex, 'Worker version must be validated before canonical Album authority so stale edge propagation is diagnosed correctly.');

await import('./test-public-v28-parent-album-visibility.mjs');

console.log('Canonical Album public authority + parent visibility guard passed: R2 album.trackIds remains authoritative, virtual Singles stays isolated, and draft/archived Album members are withheld from public Track/list/detail/media surfaces.');