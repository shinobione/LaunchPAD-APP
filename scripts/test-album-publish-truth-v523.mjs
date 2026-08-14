import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import { spawnSync } from 'node:child_process';

const builtPath = path.join(os.tmpdir(), 'launchpad-r2-admin-worker-v523-publish-truth.js');
const build = spawnSync(process.execPath, ['scripts/build-admin-worker-v523.mjs', builtPath], { encoding: 'utf8' });
if (build.status !== 0) {
  process.stdout.write(build.stdout || '');
  process.stderr.write(build.stderr || '');
  process.exit(build.status || 1);
}

const built = fs.readFileSync(builtPath, 'utf8');
for (const required of [
  'version: "5.23"',
  'trackManagerVersion: "5.23"',
  'const STUDIO_BRIDGE_VERSION = "1.13";',
  'code: "ALBUM_QUALITY_BLOCKED"',
  'function studioAlbumMetadataRereadMismatch(proposed, reread)',
  'metadataMismatch = studioAlbumMetadataRereadMismatch(proposed, reread)',
  'verificationDetail:',
]) assert.ok(built.includes(required), `TM 5.23 publish-truth bundle missing: ${required}`);

const qualityMatch = built.match(/async function inspectCanonicalAlbumQuality\(bucket, manifest\) \{[\s\S]*?\n\}(?=\n\nfunction studioAlbumTrackCacheManifest)/);
if (!qualityMatch) throw new Error('Unable to isolate inspectCanonicalAlbumQuality from TM 5.23 bundle.');

const tracks = new Map();
const context = {
  listAllObjects: async () => [],
  albumPrefix: id => `albums/${id}/`,
  albumAssetStateFromObjects: (_objects, manifest) => ({
    cover: manifest.assets?.cover ? { present: true } : null,
    thumbnail: manifest.assets?.thumbnail ? { present: true } : null,
  }),
  readManifest: async (_bucket, id) => tracks.get(id) || null,
};
vm.createContext(context);
vm.runInContext(`${qualityMatch[0]}\nglobalThis.__inspectAlbumQuality = inspectCanonicalAlbumQuality;`, context);

const manifest = {
  id: 'pulse-dominion',
  title: 'Pulse Dominion',
  status: 'published',
  trackIds: ['neon-swagger', 'pulse-drive'],
  assets: { cover: 'cover/pulse.webp', thumbnail: null },
};

tracks.set('neon-swagger', { slug: 'neon-swagger', title: 'Neon Swagger', status: 'draft' });
tracks.set('pulse-drive', { slug: 'pulse-drive', title: 'Pulse Drive', status: 'published' });
let quality = await context.__inspectAlbumQuality({}, manifest);
assert.equal(quality.publishable, false, 'Album must stay blocked while one member Track is Draft.');
assert.equal(quality.checks.find(check => check.id === 'publishedTracks')?.ok, false);
assert.equal(quality.tracks.find(track => track.trackId === 'neon-swagger')?.status, 'draft');

tracks.set('neon-swagger', { slug: 'neon-swagger', title: 'Neon Swagger', status: 'published' });
quality = await context.__inspectAlbumQuality({}, manifest);
assert.equal(quality.publishable, true, 'Album must be publishable once cover, references and all member Track statuses are valid.');
assert.equal(quality.checks.every(check => check.ok), true);

const noCover = await context.__inspectAlbumQuality({}, { ...manifest, assets: { cover: null, thumbnail: null } });
assert.equal(noCover.publishable, false, 'Album must stay blocked without a cover.');
assert.equal(noCover.checks.find(check => check.id === 'cover')?.ok, false);

console.log('TM 5.23 Album publish truth regression passed: exact quality blockers + strict canonical status verification are preserved.');
