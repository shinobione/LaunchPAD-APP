import { stat } from 'node:fs/promises';
import { tracks as bundledTracks } from '../js/catalog.js';
import migration from '../cloudflare/migration-manifest.json' with { type: 'json' };

const DEFAULT_API = 'https://launchpad-media.jerryquinet.workers.dev';
const apiBase = String(process.env.LAUNCHPAD_MEDIA_API || DEFAULT_API).replace(/\/$/, '');
const inventoryOnly = process.argv.includes('--inventory-only');
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
  const sizes = await Promise.all(unique.map(async path => (await stat(path)).size));
  return { count: unique.length, bytes: sizes.reduce((sum, size) => sum + size, 0), paths: unique };
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
}

async function verifyLiveTrack(track) {
  if (track.status !== 'published') fail(`${track.slug}: track is not published.`);
  if (!track.assets?.cover?.optimized) fail(`${track.slug}: optimized cover flag is missing.`);
  if (!track.assets?.audio?.url || !track.assets?.thumbnail?.url || !track.assets?.cover?.fullUrl) {
    fail(`${track.slug}: audio, thumbnail and original cover are required.`);
  }
  await Promise.all([
    verifyRange(track.assets.audio.url, `${track.slug} audio`, 'audio/'),
    verifyRange(track.assets.thumbnail.url, `${track.slug} thumbnail`, 'image/webp')
  ]);
}

async function main() {
  const candidates = {
    audio: await inventory(bundledTracks.map(track => track.file)),
    covers: await inventory(bundledTracks.map(track => track.cover)),
    lyrics: await inventory(bundledTracks.map(track => track.lyrics))
  };
  const candidateBytes = Object.values(candidates).reduce((sum, item) => sum + item.bytes, 0);
  const report = {
    apiBase,
    inventory: { ...candidates, candidateBytes },
    live: null,
    cleanupAuthorized: false,
    manualValidationRequired: true
  };

  if (!inventoryOnly) {
    const [health, catalog] = await Promise.all([fetchJson('/health'), fetchJson('/tracks')]);
    const liveTracks = Array.isArray(catalog.tracks) ? catalog.tracks : [];
    if (health.ok !== true || Number(health.version) < 2.3) fail('Public Worker v2.3 or newer is required.');
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

    for (let offset = 0; offset < liveTracks.length; offset += 4) {
      await Promise.all(liveTracks.slice(offset, offset + 4).map(verifyLiveTrack));
    }

    report.live = {
      workerVersion: health.version,
      canonicalTracks: liveTracks.length,
      publishedTracks: liveTracks.filter(track => track.status === 'published').length,
      rangeAudio: liveTracks.length,
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
  }
  console.log('Cleanup remains locked until explicit mobile validation and approval.');
}

main().catch(error => {
  console.error(`R2 cleanup audit failed: ${error.message}`);
  process.exitCode = 1;
});

