const base = process.env.PUBLIC_WORKER_URL || 'https://launchpad-media.jerryquinet.workers.dev';
const paths = ['/health', '/tracks', '/albums'];

for (const path of paths) {
  const url = new URL(path, base);
  url.searchParams.set('_c2_5_f_diag', `${Date.now()}-${Math.random().toString(16).slice(2)}`);
  try {
    const response = await fetch(url, {
      headers: { 'cache-control': 'no-cache', pragma: 'no-cache' },
      signal: AbortSignal.timeout(20000),
    });
    const text = await response.text();
    let body = null;
    try { body = JSON.parse(text); } catch {}
    console.log(JSON.stringify({
      path,
      status: response.status,
      workerHeader: response.headers.get('x-launchpad-media-version'),
      contentType: response.headers.get('content-type'),
      bodyVersion: body?.version ?? null,
      ok: body?.ok ?? null,
      albumAuthority: body?.albumAuthority ?? null,
      canonicalAlbums: body?.canonicalAlbums ?? null,
      albumCount: body?.albumCount ?? body?.count ?? null,
      albumsLength: Array.isArray(body?.albums) ? body.albums.length : null,
      tracksLength: Array.isArray(body?.tracks) ? body.tracks.length : null,
      error: body?.error ?? null,
      details: body?.details ?? null,
      bodyPreview: body ? null : text.slice(0, 240),
    }));
  } catch (error) {
    console.log(JSON.stringify({ path, fetchError: error instanceof Error ? error.message : String(error) }));
  }
}

console.log('C2.5-F live public Worker diagnostic completed (read-only, non-blocking).');
