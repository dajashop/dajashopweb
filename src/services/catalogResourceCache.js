// Bounded, in-memory cache; public and staff resources use separate keys.
const entries = new Map();
const requests = new Map();
let generation = 0;
const TTL = 60_000;
const RETAIN = 5 * 60_000;
export function cachedResource(key, fresh = false) {
  const entry = entries.get(key);
  return entry && Date.now() < (fresh ? entry.freshUntil : entry.retainUntil) ? entry.value : null;
}
export function rememberResource(key, value) {
  if (typeof window === 'undefined' || value == null) return;
  const items = Array.isArray(value) ? value : Array.isArray(value.items) ? value.items : [value];
  const saleExpiry = Math.min(...items.filter(item => item.salePrice && item.saleValidUntil)
    .map(item => Date.parse(item.saleValidUntil)).filter(Number.isFinite));
  entries.delete(key);
  entries.set(key, { value, freshUntil: Math.min(Date.now() + TTL, saleExpiry),
    retainUntil: Math.min(Date.now() + RETAIN, saleExpiry) });
  while (entries.size > 100) entries.delete(entries.keys().next().value);
}
export function invalidateCatalogResources() {
  generation++;
  entries.clear();
  for (const entry of requests.values()) entry.controller.abort();
  requests.clear();
}
export function requestResource(key, loader, { signal, force = false, cacheResult = true } = {}) {
  if (signal?.aborted) return Promise.reject(new DOMException('Aborted', 'AbortError'));
  const stored = cacheResult && !force && cachedResource(key, true);
  if (stored) return Promise.resolve(stored);
  let entry = requests.get(key);
  if (!entry) {
    const controller = new AbortController();
    const started = generation;
    entry = { controller, consumers: 0, settled: false };
    entry.promise = Promise.resolve().then(() => loader(controller.signal)).then(value => {
      if (cacheResult && !controller.signal.aborted && generation === started) rememberResource(key, value);
      return value;
    }).finally(() => {
      entry.settled = true;
      if (requests.get(key) === entry) requests.delete(key);
    });
    requests.set(key, entry);
  }
  entry.consumers++;
  return new Promise((resolve, reject) => {
    let released = false;
    const release = () => {
      if (released) return;
      released = true;
      signal?.removeEventListener('abort', abort);
      entry.consumers--;
      if (!entry.consumers && !entry.settled) {
        entry.controller.abort();
        if (requests.get(key) === entry) requests.delete(key);
      }
    };
    const abort = () => { release(); reject(new DOMException('Aborted', 'AbortError')); };
    signal?.addEventListener('abort', abort, { once: true });
    entry.promise.then(value => { if (!released) { release(); resolve(value); } },
      error => { if (!released) { release(); reject(error); } });
  });
}
if (typeof window !== 'undefined') {
  ['daja:products-changed', 'daja:variant-groups-changed', 'daja:filters-changed']
    .forEach(event => window.addEventListener(event, invalidateCatalogResources));
}
