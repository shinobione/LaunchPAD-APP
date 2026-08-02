import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const ORIGIN = 'https://launchpad.test/';
const source = await fs.readFile(new URL('../sw.js', import.meta.url), 'utf8');
const listeners = new Map();
let offline = false;
let networkRequests = [];

class TestRequest {
  constructor(input, options = {}) {
    const sourceRequest = input instanceof TestRequest ? input : null;
    this.url = new URL(sourceRequest?.url || String(input), ORIGIN).href;
    this.method = options.method || sourceRequest?.method || 'GET';
    this.mode = options.mode || sourceRequest?.mode || 'cors';
    this.destination = options.destination || sourceRequest?.destination || '';
    this.headers = new Headers(options.headers || sourceRequest?.headers || undefined);
    this.cache = options.cache || sourceRequest?.cache || 'default';
  }
}

function comparableUrl(request, ignoreSearch = false) {
  const url = new URL(request instanceof TestRequest ? request.url : String(request), ORIGIN);
  url.hash = '';
  if (ignoreSearch) url.search = '';
  return url.href;
}

class TestCache {
  entries = new Map();

  async put(request, response) {
    this.entries.set(comparableUrl(request), response.clone());
  }

  async match(request, options = {}) {
    const target = comparableUrl(request, options.ignoreSearch);
    for (const [key, response] of this.entries) {
      const candidate = comparableUrl(key, options.ignoreSearch);
      if (candidate === target) return response.clone();
    }
    return undefined;
  }

  async keys() {
    return [...this.entries.keys()].map(url => new TestRequest(url));
  }

  async delete(request) {
    return this.entries.delete(comparableUrl(request));
  }
}

class TestCacheStorage {
  stores = new Map();

  async open(name) {
    if (!this.stores.has(name)) this.stores.set(name, new TestCache());
    return this.stores.get(name);
  }

  async keys() {
    return [...this.stores.keys()];
  }

  async delete(name) {
    return this.stores.delete(name);
  }
}

const caches = new TestCacheStorage();

async function fetchMock(request) {
  const resolved = request instanceof TestRequest ? request : new TestRequest(request);
  networkRequests.push(resolved.url);
  if (offline) throw new TypeError('Network unavailable');

  const pathname = new URL(resolved.url).pathname;
  return new Response(`NETWORK:${pathname}`, {
    status: 200,
    headers: { 'Content-Type': 'text/plain; charset=utf-8' }
  });
}

const self = {
  location: { origin: new URL(ORIGIN).origin },
  clients: { claim: async () => {} },
  skipWaiting: async () => {},
  addEventListener(type, listener) {
    listeners.set(type, listener);
  }
};

const context = vm.createContext({
  self,
  caches,
  fetch: fetchMock,
  Request: TestRequest,
  Response,
  Headers,
  URL,
  Set,
  Promise,
  console
});
context.globalThis = context;
context.importScripts = (...paths) => {
  for (const resource of paths) {
    const normalized = String(resource).replace(/^\.\//, '');
    const imported = readFileSync(new URL(`../${normalized}`, import.meta.url), 'utf8');
    vm.runInContext(imported, context, { filename: normalized });
  }
};
vm.runInContext(source, context, { filename: 'sw.js' });

async function dispatchLifecycle(type) {
  const listener = listeners.get(type);
  assert.ok(listener, `Missing ${type} listener.`);
  let work;
  listener({ waitUntil(promise) { work = Promise.resolve(promise); } });
  assert.ok(work, `${type} did not register lifecycle work.`);
  await work;
}

async function dispatchFetch(request) {
  const listener = listeners.get('fetch');
  assert.ok(listener, 'Missing fetch listener.');
  let responsePromise;
  listener({
    request,
    respondWith(value) {
      responsePromise = Promise.resolve(value);
    }
  });
  assert.ok(responsePromise, `Fetch for ${request.url} was not handled.`);
  return responsePromise;
}

await dispatchLifecycle('install');
await dispatchLifecycle('activate');

const cacheNames = await caches.keys();
assert.ok(cacheNames.some(name => name.endsWith('-shell')), 'Shell cache was not created.');
assert.ok(cacheNames.some(name => name.endsWith('-images')), 'Image cache was not created.');

networkRequests = [];
offline = true;

const navigation = await dispatchFetch(new TestRequest('/#home', {
  mode: 'navigate',
  destination: 'document'
}));
assert.equal(navigation.status, 200, 'Offline navigation did not return the cached shell.');
assert.match(await navigation.text(), /NETWORK:\/(?:index\.html)?$/, 'Offline navigation returned an unexpected response.');

const versionedModule = await dispatchFetch(new TestRequest('/js/app-main.js?v=20260802-wave8', {
  destination: 'script'
}));
assert.equal(versionedModule.status, 200, 'Versioned module was not found through ignoreSearch caching.');
assert.equal(await versionedModule.text(), 'NETWORK:/js/app-main.js');

offline = false;
const cacheSizesBeforeAudio = new Map(
  await Promise.all([...caches.stores].map(async ([name, cache]) => [name, (await cache.keys()).length]))
);

const audio = await dispatchFetch(new TestRequest('/audio/singles/ghost-signal.mp3', {
  destination: 'audio'
}));
assert.equal(audio.status, 200, 'Audio request did not remain network-only.');

const range = await dispatchFetch(new TestRequest('/audio/before-the-noise.mp3', {
  headers: { Range: 'bytes=0-1023' }
}));
assert.equal(range.status, 200, 'Range request did not remain network-only.');

for (const [name, cache] of caches.stores) {
  const keys = await cache.keys();
  assert.equal(keys.length, cacheSizesBeforeAudio.get(name), `${name} changed after audio requests.`);
  assert.ok(keys.every(request => !/\.(mp3|m4a|wav|ogg|flac)$/i.test(new URL(request.url).pathname)), `${name} contains audio.`);
}

console.log('Service worker offline shell, versioned modules and network-only audio are valid.');
