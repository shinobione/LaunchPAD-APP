const target = process.argv[2];

if (!['public', 'admin'].includes(target)) {
  throw new Error('Usage: node scripts/verify-cloudflare-deployment.mjs <public|admin>');
}

const PUBLIC_URL = process.env.PUBLIC_WORKER_URL || 'https://launchpad-media.jerryquinet.workers.dev';
const ADMIN_URL = process.env.ADMIN_WORKER_URL || 'https://launchpad-r2-api.jerryquinet.workers.dev';
const TIMEOUT_MS = Number(process.env.CLOUDFLARE_SMOKE_TIMEOUT_MS || 20000);

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const fetchChecked = async (url, init = {}) => {
  const response = await fetch(url, {
    ...init,
    headers: {
      'cache-control': 'no-cache',
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

function assertAudioLabCors(response, label) {
  assert(response.headers.get('access-control-allow-origin') === '*', `${label} is missing Access-Control-Allow-Origin: *`);
  assert(response.headers.get('timing-allow-origin') === '*', `${label} is missing Timing-Allow-Origin: *`);
  const exposed = response.headers.get('access-control-expose-headers') || '';
  assert(/Content-Range/i.test(exposed), `${label} does not expose Content-Range`);
  assert(/X-LaunchPAD-Media-Version/i.test(exposed), `${label} does not expose the Worker version header`);
}

async function verifyPublic() {
  const healthResponse = await fetchChecked(`${PUBLIC_URL}/health`);
  assert(healthResponse.status === 200, `Public /health returned ${healthResponse.status}`);
  assertAudioLabCors(healthResponse, 'Public /health');
  const health = await readJson(healthResponse, 'Public /health');
  assert(health.ok === true, 'Public /health did not report ok=true');
  assert(health.service === 'launchpad-media', `Unexpected public service: ${health.service}`);
  assert(Number(health.canonicalTracks) > 0, 'Public /health reported no canonical tracks');
  assert(health.audioLabCors === true, 'Public /health did not report audioLabCors=true');

  const expectedVersion = process.env.EXPECTED_PUBLIC_VERSION;
  if (expectedVersion) {
    assert(String(health.version) === String(expectedVersion), `Public version ${health.version} does not match ${expectedVersion}`);
  }

  const tracksResponse = await fetchChecked(`${PUBLIC_URL}/tracks`);
  assert(tracksResponse.status === 200, `Public /tracks returned ${tracksResponse.status}`);
  assertAudioLabCors(tracksResponse, 'Public /tracks');
  const catalog = await readJson(tracksResponse, 'Public /tracks');
  assert(catalog.ok === true, 'Public /tracks did not report ok=true');
  assert(Array.isArray(catalog.tracks), 'Public /tracks did not return a tracks array');
  assert(catalog.tracks.length > 0, 'Public /tracks returned an empty catalog');
  assert(Number(catalog.count) === catalog.tracks.length, 'Public /tracks count does not match the array length');

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
    canonicalTracks: health.canonicalTracks,
    publishedTracks: catalog.tracks.length,
    rangeTrack: rangedTrack.slug,
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