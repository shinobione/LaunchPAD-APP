import worker from './public-worker.js';

const PUBLIC_WORKER_VERSION = 2.5;

function hardenedHeaders(source) {
  const headers = new Headers(source);
  headers.set('Access-Control-Allow-Origin', '*');
  headers.set('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  headers.set('Access-Control-Allow-Headers', 'Range, If-None-Match, Content-Type');
  headers.set('Access-Control-Expose-Headers', 'Accept-Ranges, Content-Length, Content-Range, Content-Type, ETag, X-LaunchPAD-Media-Version');
  headers.set('Access-Control-Max-Age', '86400');
  headers.set('Cross-Origin-Resource-Policy', 'cross-origin');
  headers.set('Timing-Allow-Origin', '*');
  headers.set('X-LaunchPAD-Media-Version', String(PUBLIC_WORKER_VERSION));
  return headers;
}

async function versionedHealth(response) {
  try {
    const payload = await response.clone().json();
    payload.version = PUBLIC_WORKER_VERSION;
    payload.audioLabCors = true;
    return new Response(JSON.stringify(payload, null, 2), {
      status: response.status,
      statusText: response.statusText,
      headers: hardenedHeaders(response.headers)
    });
  } catch {
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: hardenedHeaders(response.headers)
    });
  }
}

export default {
  async fetch(request, env, ctx) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: hardenedHeaders() });
    }

    const response = await worker.fetch(request, env, ctx);
    const pathname = new URL(request.url).pathname;
    if (pathname === '/' || pathname === '/health') return versionedHealth(response);

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: hardenedHeaders(response.headers)
    });
  }
};
