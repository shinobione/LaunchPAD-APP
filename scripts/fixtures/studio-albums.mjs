import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { spawnSync } from 'node:child_process';

// Synthetic public-schema fixtures only. No production catalogue data or network.
export const fixtureDate = '2026-01-01T00:00:00.000Z';
export const studioOrigin = 'https://shinobione.github.io';
export const fixtureSizes = [
  { name: 'small', albums: 7, tracks: 84 },
  { name: 'medium', albums: 50, tracks: 1000 },
  { name: 'large', albums: 120, tracks: 2400 },
];

export function makeFixture({ albums = 7, tracks = 84 } = {}) {
  const objects = new Map();
  const albumId = index => `fixture-album-${String(index).padStart(3, '0')}`;
  const trackId = index => `fixture-track-${String(index).padStart(4, '0')}`;
  function add(key, value, contentType = 'application/json') {
    const body = typeof value === 'string' ? value : JSON.stringify(value);
    objects.set(key, { key, body, size: Buffer.byteLength(body), etag: `fixture-${key}`,
      uploaded: new Date(fixtureDate), httpMetadata: { contentType }, customMetadata: {} });
  }
  for (let index = 0; index < albums; index++) {
    const id = albumId(index);
    add(`albums/${id}/manifest.json`, {
      schemaVersion: 1, id, title: `Fixture Album ${index}`, type: ['album', 'ep', 'collection'][index % 3],
      status: ['published', 'draft', 'archived'][index % 3], year: index % 2 ? null : 2026,
      releaseDate: index % 2 ? null : `2026-01-${String(1 + index % 28).padStart(2, '0')}`,
      description: 'Synthetic album metadata.', heading: 'Synthetic editorial heading',
      trackIds: Array.from({ length: tracks }, (_, i) => i).filter(i => i % albums === index).map(trackId).reverse(),
      accent: '#123456', accent2: '#abcdef', assets: { cover: 'cover/cover.webp', thumbnail: 'thumbnail/thumbnail.webp' },
      createdAt: fixtureDate, updatedAt: fixtureDate, updatedBy: 'fixture@example.invalid',
      ...(index === 0 ? { creationOperationId: '00000000-0000-4000-8000-000000000001' } : {}),
    });
    // One declared missing cover exercises honest asset evidence.
    if (index !== 1) add(`albums/${id}/cover/cover.webp`, 'synthetic-cover', 'image/webp');
    add(`albums/${id}/thumbnail/thumbnail.webp`, 'synthetic-thumbnail', 'image/webp');
    add(`albums/${id}/notes.txt`, 'unrelated synthetic object', 'text/plain');
  }
  for (let index = 0; index < tracks; index++) {
    const slug = trackId(index);
    add(`tracks/${slug}/manifest.json`, {
      schemaVersion: 1, slug, title: `Fixture Track ${index}`, status: 'published',
      album: index % 4 === 0 ? { id: 'neon-heartbreaks', title: 'Neon Heartbreaks' }
        : { id: 'singles', title: 'Singles' },
      sequence: index, assets: {}, createdAt: fixtureDate, updatedAt: fixtureDate,
    });
    for (const filename of ['audio.mp3', 'cover.webp', 'lyrics.txt', 'video.mp4', 'analysis/sonictrace/latest.json']) {
      add(`tracks/${slug}/${filename}`, 'synthetic-object', 'application/octet-stream');
    }
  }
  return objects;
}

export class ReadOnlyR2 {
  constructor(objects, { pageSize = 1000, missing = [], failList = false, failGet = false } = {}) {
    this.objects = objects;
    this.pageSize = pageSize;
    this.missing = new Set(missing);
    this.failList = failList;
    this.failGet = failGet;
    this.calls = { lists: [], gets: [], puts: 0, deletes: 0, heads: 0, listedObjects: 0 };
  }
  async list({ prefix, cursor, limit, include }) {
    this.calls.lists.push({ prefix, cursor: cursor || null });
    assert.deepEqual(Array.from(include), ['httpMetadata', 'customMetadata']);
    if (this.failList) throw new Error('Synthetic list failure');
    const keys = [...this.objects.keys()].filter(key => key.startsWith(prefix)).sort();
    const start = Number(cursor || 0);
    const end = Math.min(start + Math.min(limit, this.pageSize), keys.length);
    const objects = keys.slice(start, end).map(key => {
      const { body: _body, ...metadata } = this.objects.get(key);
      return structuredClone(metadata);
    });
    this.calls.listedObjects += objects.length;
    return { objects, truncated: end < keys.length, ...(end < keys.length ? { cursor: String(end) } : {}) };
  }
  async get(key) {
    this.calls.gets.push(key);
    if (this.failGet) throw new Error('Synthetic get failure');
    if (this.missing.has(key)) return null;
    const item = this.objects.get(key);
    return item ? { ...structuredClone(item), async text() { return item.body; } } : null;
  }
  async put() { this.calls.puts++; throw new Error('GET attempted an R2 write'); }
  async delete() { this.calls.deletes++; throw new Error('GET attempted an R2 delete'); }
  async head() { this.calls.heads++; throw new Error('Unexpected extra R2 asset read'); }
}

export function buildCandidate() {
  const file = path.resolve('dist/studio-albums-candidate.mjs');
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const result = spawnSync(process.execPath, ['scripts/build-admin-worker-v528.mjs', file], { encoding: 'utf8' });
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  return file;
}

// Real JWT verification with an ephemeral test key and local JWKS response.
const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
const teamDomain = 'https://access.example.invalid';
const audience = 'synthetic-albums-test';
const jwk = { ...publicKey.export({ format: 'jwk' }), kid: 'synthetic-key', alg: 'RS256', use: 'sig' };
export function token(overrides = {}) {
  const encode = value => Buffer.from(JSON.stringify(value)).toString('base64url');
  const head = encode({ alg: 'RS256', kid: jwk.kid });
  const body = encode({ iss: teamDomain, aud: [audience], exp: Math.floor(Date.now() / 1000) + 3600,
    email: 'fixture@example.invalid', ...overrides });
  const data = `${head}.${body}`;
  return `${data}.${crypto.sign('RSA-SHA256', Buffer.from(data), privateKey).toString('base64url')}`;
}

export function loadWorker(file) {
  const calls = { migration: 0, summaries: 0, stateTokens: 0, errors: [], network: [] };
  const context = vm.createContext({
    Request, Response, Headers, URL, TextEncoder, TextDecoder, Uint8Array, atob, btoa,
    crypto: crypto.webcrypto, console: { error: (...args) => calls.errors.push(args.map(String)) },
    __calls: calls,
    fetch: async url => {
      calls.network.push(String(url));
      assert.equal(String(url), `${teamDomain}/cdn-cgi/access/certs`, 'No external fetch allowed');
      return Response.json({ keys: [jwk] });
    },
  });
  const source = fs.readFileSync(file, 'utf8');
  assert.equal(source.split('export default {').length, 2);
  vm.runInContext(source.replace('export default {', 'globalThis.__worker = {') + `
    const originalMigration = buildStudioLegacyAlbumMigrationDryRun;
    buildStudioLegacyAlbumMigrationDryRun = async (...args) => { __calls.migration++; return originalMigration(...args); };
    const originalSummaries = buildCanonicalAlbumSummaries;
    buildCanonicalAlbumSummaries = async (...args) => { __calls.summaries++; return originalSummaries(...args); };
    const originalToken = studioAlbumMigrationStateToken;
    studioAlbumMigrationStateToken = async (...args) => { __calls.stateTokens++; return originalToken(...args); };
  `, context, { filename: file });
  return {
    calls,
    forbidMigration() {
      vm.runInContext('buildStudioLegacyAlbumMigrationDryRun = () => { __calls.migration++; throw new Error("Migration forbidden"); };', context);
    },
    async request(bucket, { query = '', origin = studioOrigin, jwt = token(), method = 'GET', body } = {}) {
      const headers = {};
      if (origin !== null) headers.origin = origin;
      if (jwt !== null) headers['cf-access-jwt-assertion'] = jwt;
      if (body !== undefined) headers['content-type'] = 'text/plain;charset=UTF-8';
      return context.__worker.fetch(new Request(`https://worker.example.invalid/api/studio/albums${query}`,
        { method, headers, ...(body !== undefined ? { body: JSON.stringify(body) } : {}) }),
      { MEDIA_BUCKET: bucket, TEAM_DOMAIN: teamDomain, POLICY_AUD: audience });
    },
  };
}
