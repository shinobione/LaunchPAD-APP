import { readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import migration from '../cloudflare/migration-manifest.json' with { type: 'json' };

const DEFAULT_API = 'https://launchpad-media.jerryquinet.workers.dev';
const apiBase = String(process.env.LAUNCHPAD_MEDIA_API || DEFAULT_API).replace(/\/$/, '');
const inventoryOnly = process.argv.includes('--inventory-only');
const fullAudio = process.argv.includes('--full-audio');
const jsonOutput = process.argv.includes('--json');

function fail(message) {
  throw new Error(message);
}

async function fetchChecked(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    signal: AbortSignal.timeout(20_000)
  });
  if (!response.ok) fail(`${url}: HTTP ${response.status}`);
  return response;
}

async function fetchJson(path) {
  const response = await fetchChecked(`${apiBase}${path}`, {
    headers: { Accept: 'application/json' }
  });
  return response.json();
}

async function inventory(paths) {
  const unique = [...new Set(paths.filter(Boolean))];
  const existing = (await Promise.all(unique.map(async resourcePath => {
    try {
      return { path: resourcePath, size: (await stat(resourcePath)).size };
    } catch (error) {
      if (error?.code === 'ENOENT') return null;
      throw error;
    }
  }))).filter(Boolean);
  return {
    count: existing.length,
    bytes: existing.reduce((sum, item) => sum + item.size, 0),
    paths: existing.map(item => item.path)
  };
}

async function inventoryDirectory(rootPath) {
  try {
    const entries = await readdir(rootPath, { recursive: true, withFileTypes: true });
    const paths = entries
      .filter(entry => entry.isFile())
      .map(entry => path.join(entry.parentPath || entry.path || rootPath, entry.name));
    return inventory(paths);
  } catch (error) {
    if (error?.code === 'ENOENT') return { count: 0, bytes: 0, paths: [] };
    throw error;
  }
}

function migrationSourcePath(sourceUrl) {
  if (!sourceUrl) return null;
  const url = new URL(sourceUrl);
  const marker = `/${migration.source.ref}/`;
  const offset = url.pathname.indexOf(marker);
  if (offset < 0) fail(`Migration source is not pinned to ${migration.source.ref}: ${sourceUrl}`);
  return decodeURIComponent(url.pathname.slice(offset + marker.length));
}

async function verifyRange(url, label, expectedType) {
  if (!url?.startsWith(`${apiBase}/media/`)) fail(`${label}: URL is not served by ${apiBase}.`);
  const response = await fetch(url, {
    headers: { Range: 'bytes=0-1' },
    signal: AbortSignal.timeout(20_000)
  });
  const contentRange = response.headers.get('content-range') || '';
  const contentType = response.headers.get('content-type') || '';
  await response.arrayBuffer();
  if (response.status !== 206) fail(`${label}: expected HTTP 206, received ${response.status}.`);
  if (!contentRange.startsWith('bytes 0-1/')) fail(`${label}: invalid Content-Range ${contentRange || '<missing>'}.`);
  if (!contentType.startsWith(expectedType)) fail(`${label}: invalid Content-Type ${contentType || '<missing>'}.`);
  const totalBytes = Number(contentRange.match(/^bytes 0-1\/(\d+)$/)?.[1]);
  if (!Number.isSafeInteger(totalBytes) || totalBytes < 2) fail(`${label}: invalid total size in ${contentRange}.`);
  return totalBytes;
}

async function verifyFullAudioTransfer(url, label, expectedBytes) {
  const response = await fetch(url, {
    headers: { Accept: 'audio/*' },
    signal: AbortSignal.timeout(120_000)
  });
  const contentType = response.headers.get('content-type') || '';
  if (response.status !== 200) fail(`${label}: expected HTTP 200, received ${response.status}.`);
  if (!contentType.startsWith('audio/')) fail(`${label}: invalid Content-Type ${contentType || '<missing>'}.`);
  if (!response.body) fail(`${label}: response body is missing.`);

  const declaredBytes = Number(response.headers.get('content-length'));
  if (Number.isSafeInteger(declaredBytes) && declaredBytes !== expectedBytes) {
    fail(`${label}: Content-Length ${declaredBytes} differs from Range total ${expectedBytes}.`);
  }

  let receivedBytes = 0;
  const reader = response.body.getReader();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    receivedBytes += value.byteLength;
  }
  if (receivedBytes !== expectedBytes) {
    fail(`${label}: received ${receivedBytes} bytes, expected ${expectedBytes}.`);
  }
  return receivedBytes;
}

async function verifyLiveTrack(track) {
  if (track.status !== 'published') fail(`${track.slug}: track is not published.`);
  if (!track.assets?.cover?.optimized) fail(`${track.slug}: optimized cover flag is missing.`);
  if (!track.assets?.audio?.url || !track.assets?.thumbnail?.url || !track.assets?.cover?.fullUrl) {
    fail(`${track.slug}: audio, thumbnail and original cover are required.`);
  }
  const [audioBytes] = await Promise.all([
    verifyRange(track.assets.audio.url, `${track.slug} audio`, 'audio/'),
    verifyRange(track.assets.thumbnail.url, `${track.slug} thumbnail`, 'image/webp')
  ]);
  const transferredAudioBytes = fullAudio
    ? await verifyFullAudioTransfer(track.assets.audio.url, `${track.slug} full audio`, audioBytes)
    : null;
  return { slug: track.slug, audioBytes, transferredAudioBytes };
}

async function main() {
  const candidates = {
    audio: await inventoryDirectory('audio'),
    covers: await inventory(migration.tracks.map(track => migrationSourcePath(track.sources?.cover))),
    lyrics: await inventory(migration.tracks.map(track => migrationSourcePath(track.sources?.lyrics)))
  };
  const candidateBytes = Object.values(candidates).reduce((sum, item) => sum + item.bytes, 0);
  const report = {
    apiBase,
    inventory: { ...candidates, candidateBytes },
    live: null,
    fullAudioRequested: fullAudio,
    cleanupAuthorized: true,
    manualValidationRequired: false
  };

  if (!inventoryOnly) {
    const [health, catalog] = await Promise.all([fetchJson('/health'), fetchJson('/tracks')]);
    const liveTracks = Array.isArray(catalog.tracks) ? catalog.tracks : [];
    if (health.ok !== true || Number(health.version) < 2.4) fail('Public Worker v2.4 or newer is required.');
    if (health.canonicalTracks !== liveTracks.length) fail('Health and catalog track counts disagree.');
    if (liveTracks.length !== 16) fail(`Expected 16 canonical R2 tracks, received ${liveTracks.length}.`);

    const liveBySlug = new Map(liveTracks.map(track => [track.slug, track]));
    for (const legacy of migration.tracks) {
      if (!liveBySlug.has(legacy.slug)) fail(`${legacy.slug}: legacy track is missing from R2.`);
    }

    const beforeTheNoise = liveBySlug.get('before-the-noise');
    if (beforeTheNoise.genres?.join('|') !== 'Hip-hop|Boom Bap|Lo-fi') {
      fail('before-the-noise: the corrected genres did not persist.');
    }
    if (beforeTheNoise.accent !== '#ef9542' || beforeTheNoise.accent2 !== '#7f8c83') {
      fail('before-the-noise: the corrected theme colors did not persist.');
    }
    if (beforeTheNoise.duration !== 237) fail('before-the-noise: canonical duration must be 237 seconds.');

    const verifiedTracks = [];
    const batchSize = fullAudio ? 2 : 4;
    for (let offset = 0; offset < liveTracks.length; offset += batchSize) {
      verifiedTracks.push(...await Promise.all(liveTracks.slice(offset, offset + batchSize).map(verifyLiveTrack)));
    }

    report.live = {
      workerVersion: health.version,
      canonicalTracks: liveTracks.length,
      publishedTracks: liveTracks.filter(track => track.status === 'published').length,
      rangeAudio: liveTracks.length,
      fullAudioTransfers: fullAudio ? verifiedTracks.length : 0,
      fullAudioBytes: fullAudio
        ? verifiedTracks.reduce((sum, track) => sum + track.transferredAudioBytes, 0)
        : 0,
      optimizedThumbnails: liveTracks.filter(track => track.assets?.cover?.optimized).length,
      timestampedLyrics: liveTracks.filter(track => track.timestampsAvailable === true).length,
      legacyTracksPresent: migration.tracks.length,
      beforeTheNoise: {
        genres: beforeTheNoise.genres,
        accent: beforeTheNoise.accent,
        accent2: beforeTheNoise.accent2,
        duration: beforeTheNoise.duration
      }
    };
  }

  if (jsonOutput) {
    console.log(JSON.stringify(report, null, 2));
    return;
  }

  console.log(`Cleanup candidates: ${candidates.audio.count} audio, ${candidates.covers.count} covers, ${candidates.lyrics.count} lyrics (${candidateBytes} bytes).`);
  if (report.live) {
    console.log(`R2 ready: ${report.live.canonicalTracks} published tracks, ${report.live.rangeAudio} range audio streams, ${report.live.optimizedThumbnails} optimized thumbnails.`);
    console.log(`Timestamped lyrics reported by R2: ${report.live.timestampedLyrics}.`);
    if (fullAudio) {
      console.log(`Full R2 audio transfer: ${report.live.fullAudioTransfers}/${report.live.canonicalTracks} files (${report.live.fullAudioBytes} bytes).`);
    } else {
      console.log('Full audio transfer was not requested; use --full-audio for the pre-cleanup transport pass.');
    }
  }
  console.log('Android validation is accepted; cleanup candidates must still be removed through reviewed, recoverable PRs.');
}

main().catch(error => {
  console.error(`R2 cleanup audit failed: ${error.message}`);
  process.exitCode = 1;
});

