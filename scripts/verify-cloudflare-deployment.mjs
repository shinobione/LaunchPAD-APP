const target = process.argv[2];

if (!['public', 'admin'].includes(target)) {
  throw new Error('Usage: node scripts/verify-cloudflare-deployment.mjs <public|admin>');
}

const PUBLIC_URL = process.env.PUBLIC_WORKER_URL || 'https://launchpad-media.jerryquinet.workers.dev';
const ADMIN_URL = process.env.ADMIN_WORKER_URL || 'https://launchpad-r2-api.jerryquinet.workers.dev';
const TIMEOUT_MS = Number(process.env.CLOUDFLARE_SMOKE_TIMEOUT_MS || 20000);
const PUBLIC_VERIFY_ATTEMPTS = Number(process.env.CLOUDFLARE_PUBLIC_VERIFY_ATTEMPTS || 60);
const PUBLIC_VERIFY_DELAY_MS = Number(process.env.CLOUDFLARE_PUBLIC_VERIFY_DELAY_MS || 3000);

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const sleep = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));

const fetchChecked = async (url, init = {}) => {
  const response = await fetch(url, {
    ...init,
    headers: {
      'cache-control': 'no-cache',
      pragma: 'no-cache',
      ...(init.headers || {}),
    },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  return response;
};

const readJson = async (response, label) => {
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`${label} did not return JSON: ${text.slice(0, 240)}`);
  }
};

function cacheBustedUrl(base, path, attempt = 0) {
  const url = new URL(path, base);
  url.searchParams.set('_launchpad_verify', `${Date.now()}-${attempt}`);
  return url.href;
}

function assertAudioLabCors(response, label) {
  assert(response.headers.get('access-control-allow-origin') === '*', `${label} is missing Access-Control-Allow-Origin: *`);
  assert(response.headers.get('timing-allow-origin') === '*', `${label} is missing Timing-Allow-Origin: *`);
  assert(response.headers.get('cross-origin-resource-policy') === 'cross-origin', `${label} is missing Cross-Origin-Resource-Policy: cross-origin`);
  const exposed = response.headers.get('access-control-expose-headers') || '';
  assert(/Content-Range/i.test(exposed), `${label} does not expose Content-Range`);
  assert(/X-LaunchPAD-Media-Version/i.test(exposed), `${label} does not expose the Worker version header`);
}

async function waitForPublicHealth() {
  const expectedVersion = process.env.EXPECTED_PUBLIC_VERSION;
  let lastError = null;
  let lastObservation = null;

  for (let attempt = 1; attempt <= PUBLIC_VERIFY_ATTEMPTS; attempt += 1) {
    try {
      const response = await fetchChecked(cacheBustedUrl(PUBLIC_URL, '/health', attempt));
      const workerHeader = response.headers.get('x-launchpad-media-version');
      assert(response.status === 200, `Public /health returned ${response.status}`);
      assertAudioLabCors(response, 'Public /health');
      const health = await readJson(response, 'Public /health');
      lastObservation = {
        attempt,
        status: response.status,
        workerHeader,
        version: health?.version ?? null,
        albumAuthority: health?.albumAuthority ?? null,
        canonicalAlbums: health?.canonicalAlbums ?? null,
      };
      assert(health.ok === true, 'Public /health did not report ok=true');
      assert(health.service === 'launchpad-media', `Unexpected public service: ${health.service}`);
      assert(Number(health.canonicalTracks) > 0, 'Public /health reported no canonical tracks');
      assert(health.audioLabCors === true, 'Public /health did not report audioLabCors=true');
      assert(health.crossOriginResourcePolicy === 'cross-origin', 'Public /health did not report crossOriginResourcePolicy=cross-origin');
      if (expectedVersion) {
        assert(String(health.version) === String(expectedVersion), `Public version ${health.version ?? 'missing'} does not match ${expectedVersion}`);
        assert(String(workerHeader) === String(expectedVersion), `Public Worker header ${workerHeader || 'missing'} does not match ${expectedVersion}`);
      }
      assert(health.albumAuthority === 'canonical-r2', `Public /health Album authority is ${health.albumAuthority || 'missing'}`);
      assert(Number(health.canonicalAlbums) > 0, 'Public /health reported no canonical Albums');
      return health;
    } catch (error) {
      lastError = error;
      if (attempt < PUBLIC_VERIFY_ATTEMPTS) await sleep(PUBLIC_VERIFY_DELAY_MS);
    }
  }

  const observation = lastObservation ? ` Last observation: ${JSON.stringify(lastObservation)}.` : '';
  throw new Error(
    `Public Worker did not become ready after ${PUBLIC_VERIFY_ATTEMPTS} attempts ` +
    `(${PUBLIC_VERIFY_ATTEMPTS * PUBLIC_VERIFY_DELAY_MS}ms retry window): ${lastError?.message || lastError}.${observation}`
  );
}

async function verifyPublic() {
  const health = await waitForPublicHealth();
  const expectedVersion = process.env.EXPECTED_PUBLIC_VERSION;

  const tracksResponse = await fetchChecked(cacheBustedUrl(PUBLIC_URL, '/tracks'));
  assert(tracksResponse.status === 200, `Public /tracks returned ${tracksResponse.status}`);
  assertAudioLabCors(tracksResponse, 'Public /tracks');
  const catalog = await readJson(tracksResponse, 'Public /tracks');
  assert(catalog.ok === true, 'Public /tracks did not report ok=true');
  assert(Array.isArray(catalog.tracks), 'Public /tracks did not return a tracks array');
  assert(catalog.tracks.length > 0, 'Public /tracks returned an empty catalog');
  assert(Number(catalog.count) === catalog.tracks.length, 'Public /tracks count does not match the array length');
  assert(catalog.albumAuthority === 'canonical-r2', 'Public /tracks did not expose canonical-r2 Album authority');
  assert(Array.isArray(catalog.albums), 'Public /tracks did not return an albums array');
  assert(catalog.albums.length > 0, 'Public /tracks returned no canonical Albums');
  assert(Number(catalog.albumCount) === catalog.albums.length, 'Public /tracks albumCount does not match albums length');

  const albumsResponse = await fetchChecked(cacheBustedUrl(PUBLIC_URL, '/albums'));
  assert(albumsResponse.status === 200, `Public /albums returned ${albumsResponse.status}`);
  assertAudioLabCors(albumsResponse, 'Public /albums');
  const albumCatalog = await readJson(albumsResponse, 'Public /albums');
  assert(albumCatalog.ok === true, 'Public /albums did not report ok=true');
  assert(albumCatalog.albumAuthority === 'canonical-r2', 'Public /albums did not report canonical-r2 authority');
  assert(Array.isArray(albumCatalog.albums), 'Public /albums did not return an albums array');
  assert(albumCatalog.albums.length === catalog.albums.length, 'Public /albums disagrees with /tracks Album projection');

  const coverAlbum = catalog.albums.find(album => album?.cover);
  assert(coverAlbum, 'No canonical Album exposes a public cover URL');
  const coverHead = await fetchChecked(coverAlbum.cover, { method: 'HEAD' });
  assert(coverHead.status === 200, `Canonical Album cover HEAD returned ${coverHead.status}`);
  assertAudioLabCors(coverHead, 'Canonical Album cover response');
  assert(coverHead.headers.get('x-launchpad-media-version') === String(expectedVersion || health.version), 'Album cover Worker version header is missing or stale');

  const rangedTrack = catalog.tracks.find(track => track?.assets?.audio?.url);
  assert(rangedTrack, 'No published track exposes an audio URL');
  const audioUrl = rangedTrack.assets.audio.url;

  const rangeResponse = await fetchChecked(audioUrl, {
    headers: { range: 'bytes=0-0' },
  });
  assert(rangeResponse.status === 206, `Audio range request returned ${rangeResponse.status}`);
  assertAudioLabCors(rangeResponse, 'Audio range response');
  assert(/^bytes 0-0\/\d+$/.test(rangeResponse.headers.get('content-range') || ''), 'Audio range response is missing a valid Content-Range header');
  assert(rangeResponse.headers.get('x-launchpad-media-version') === String(expectedVersion || health.version), 'Audio response Worker version header is missing or stale');
  await rangeResponse.arrayBuffer();

  const headResponse = await fetchChecked(audioUrl, { method: 'HEAD' });
  assert(headResponse.status === 200, `Full audio HEAD request returned ${headResponse.status}`);
  assertAudioLabCors(headResponse, 'Audio HEAD response');
  assert((headResponse.headers.get('accept-ranges') || '').toLowerCase() === 'bytes', 'Audio response does not advertise byte ranges');

  console.log(JSON.stringify({
    ok: true,
    target: 'public',
    service: health.service,
    version: health.version,
    audioLabCors: health.audioLabCors,
    crossOriginResourcePolicy: health.crossOriginResourcePolicy,
    canonicalTracks: health.canonicalTracks,
    canonicalAlbums: health.canonicalAlbums,
    publishedTracks: catalog.tracks.length,
    publishedAlbums: catalog.albums.length,
    rangeTrack: rangedTrack.slug,
    coverAlbum: coverAlbum.id,
  }));
}

async function verifyAdmin() {
  const clientId = process.env.CLOUDFLARE_ACCESS_CLIENT_ID || '';
  const clientSecret = process.env.CLOUDFLARE_ACCESS_CLIENT_SECRET || '';

  if (Boolean(clientId) !== Boolean(clientSecret)) {
    throw new Error('Both CLOUDFLARE_ACCESS_CLIENT_ID and CLOUDFLARE_ACCESS_CLIENT_SECRET must be provided together');
  }

  if (clientId && clientSecret) {
    const response = await fetchChecked(ADMIN_URL, {
      redirect: 'manual',
      headers: {
        'CF-Access-Client-Id': clientId,
        'CF-Access-Client-Secret': clientSecret,
      },
    });
    assert(response.status === 200, `Authenticated Track Manager request returned ${response.status}`);
    const body = await response.text();
    assert(/Track Manager/i.test(body), 'Authenticated admin response does not contain Track Manager');
    const expectedVersion = process.env.EXPECTED_ADMIN_VERSION;
    if (expectedVersion) {
      assert(body.includes(String(expectedVersion)), `Admin response does not contain expected version ${expectedVersion}`);
    }
    console.log(JSON.stringify({ ok: true, target: 'admin', access: 'service-token', status: response.status }));
    return;
  }

  const response = await fetchChecked(ADMIN_URL, { redirect: 'manual' });
  assert(response.status !== 200, 'Track Manager is publicly reachable without Cloudflare Access');
  assert([301, 302, 303, 307, 308, 401, 403].includes(response.status), `Unexpected unauthenticated admin status ${response.status}`);
  const location = response.headers.get('location') || '';
  if ([301, 302, 303, 307, 308].includes(response.status)) {
    assert(/cloudflareaccess\.com|cdn-cgi\/access/i.test(location), `Admin redirect does not look like Cloudflare Access: ${location}`);
  }
  console.log(JSON.stringify({ ok: true, target: 'admin', access: 'protected', status: response.status }));
}

await (target === 'public' ? verifyPublic() : verifyAdmin());
