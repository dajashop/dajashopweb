import { invalidateCatalogDisk, readCatalogDisk, writeCatalogDisk } from './catalogDiskCache.js';
import { onStaffAccessTokenChange } from './apiClient.js';

// Bounded, in-memory cache; public and staff resources use separate keys.
const entries = new Map();
const requests = new Map();
let diskGeneration = 0;
const TTL = 60_000;
const RETAIN = 5 * 60_000;
const updates = 'daja:catalog-cache-invalidated';

export function staleCatalog(value) {
  return value?._catalogStale === true;
}
export function currentCatalogPrice(product) {
  if (!product?.salePrice || !(Date.parse(product.saleValidUntil) <= Date.now())) return product;
  return { ...product, price: product.regularPrice ?? product.price, salePrice: null, saleValidUntil: null };
}
export function cachedResource(key, fresh = false) {
  const entry = entries.get(key);
  if (!entry || Date.now() >= (fresh ? entry.freshUntil : entry.retainUntil)) return null;
  return entry.value;
}
export function rememberResource(key, value, persist = true) {
  if (typeof window === 'undefined' || value == null || value.redirectTo) return;
  const meta = value._catalogCache;
  const items = Array.isArray(value) ? value : Array.isArray(value.items) ? value.items : [value];
  const saleExpiry = Math.min(...items.map(item => Date.parse(item?.saleValidUntil)).filter(Number.isFinite));
  const now = Date.now();
  const confirmed = Number.isFinite(meta?.generatedAt) && Number.isFinite(meta?.freshUntil) && Number.isFinite(meta?.staleUntil);
  const freshUntil = confirmed ? Math.min(meta.freshUntil, saleExpiry) : Math.min(now + TTL, saleExpiry);
  const retainUntil = confirmed ? Math.min(meta.staleUntil, meta.generatedAt + RETAIN) : Math.min(now + RETAIN, saleExpiry);
  if (entries.get(key)?.value?._catalogCache?.generatedAt > meta?.generatedAt) return;
  const entry = { value, freshUntil: staleCatalog(value) ? 0 : freshUntil, retainUntil };
  entries.delete(key);
  entries.set(key, entry);
  if (key.startsWith('listing:') || key.startsWith('admin:')) {
    const listings = [...entries.keys()].filter(candidate => candidate.startsWith('listing:') || candidate.startsWith('admin:'));
    if (listings.length > 24) entries.delete(listings[0]);
  }
  while (entries.size > 100) entries.delete(entries.keys().next().value);
  if (persist && confirmed && freshUntil > now) void writeCatalogDisk(key, entry, () => entries.get(key) === entry);
}

export function catalogAffected(key, value, detail = {}) {
  if (detail.scope === 'staff') return key.startsWith('admin:') || key.startsWith('product:staff:');
  if (detail.scope === 'filters') return key.startsWith('listing:') || key.startsWith('admin:');
  if (detail.scope === 'variants') return key.startsWith('variants:') || key.startsWith('listing:');
  const slugs = [detail.slug, detail.previousSlug].filter(Boolean);
  const ids = [detail.id, detail.productId].filter(Boolean);
  const matches = product => slugs.includes(product?.slug) || ids.includes(product?.id) || ids.includes(product?.productId);
  if (key.startsWith('product:')) {
    if (slugs.some(slug => key.endsWith(':' + slug)) || matches(value)) return true;
    return !value && ids.length > 0 || (!slugs.length && !ids.length);
  }
  if (key.startsWith('variants:') || key.startsWith('related:')) {
    return !slugs.length && !ids.length || !value || slugs.some(slug => key.endsWith(':' + slug)) ||
      (Array.isArray(value) ? value : value.items || []).some(matches);
  }
  // Additions, visibility and price changes can change membership, order and
  // facet counts even when the affected card was on a different page.
  return key.startsWith('listing:') || key.startsWith('admin:') || key.startsWith('collections:');
}

function invalidate(matches, disk = false) {
  for (const [key, entry] of requests) {
    if (!matches(key, entries.get(key)?.value)) continue;
    requests.delete(key);
    entry.controller.abort();
  }
  for (const [key, entry] of entries) if (matches(key, entry.value)) entries.delete(key);
  if (disk) {
    diskGeneration++;
    void invalidateCatalogDisk(matches);
  }
}
export function invalidateCatalogResource(key) {
  invalidate(candidate => key === candidate, true);
}
export function handleCatalogInvalidation(detail, broadcast = true) {
  invalidate((key, value) => catalogAffected(key, value, detail), true);
  window.dispatchEvent(new CustomEvent(updates, { detail }));
  if (broadcast) channel?.postMessage(detail);
}

export const catalogInvalidationEvent = updates;
export async function restoreCatalogResource(key) {
  const start = diskGeneration;
  let timer;
  const stored = await Promise.race([
    readCatalogDisk(key),
    new Promise(resolve => { timer = setTimeout(() => resolve(null), 45); }),
  ]).finally(() => clearTimeout(timer));
  if (!stored || start !== diskGeneration) return null;
  if (!cachedResource(key, true)) rememberResource(key, stored.value, false);
  return cachedResource(key);
}

export function catalogFallback(key, error, value = cachedResource(key)) {
  if (!value?._catalogCache || value._catalogCache.staleUntil <= Date.now() ||
      (error?.status && error.status < 500) || error?.name === 'AbortError') return null;
  return { ...value, _catalogStale: true };
}

let channel;
export function catalogRequestPending(key) {
  const entry = requests.get(key);
  return Boolean(entry && !entry.controller.signal.aborted);
}

export function requestResource(key, loader, { signal, force = false, cacheResult = true } = {}) {
  if (signal?.aborted) return Promise.reject(new DOMException('Aborted', 'AbortError'));
  const stored = cacheResult && !force && cachedResource(key, true);
  if (stored) return Promise.resolve(stored);
  let entry = requests.get(key);
  if (!entry || (force && !entry.force)) {
    // A known catalog change cannot join a read that began before it.
    if (entry) entry.controller.abort();
    const controller = new AbortController();
    entry = { controller, consumers: 0, settled: false, force };
    entry.promise = Promise.resolve().then(() => loader(controller.signal)).then(value => {
      if (cacheResult && !controller.signal.aborted && requests.get(key) === entry) {
        if (value == null || value.redirectTo) {
          entries.delete(key);
          diskGeneration++;
          void invalidateCatalogDisk(candidate => candidate === key);
        } else if (!staleCatalog(value)) rememberResource(key, value);
      }
      return value;
    }).catch(error => {
      if (requests.get(key) === entry && (error.status === 404 || error.status === 410)) {
        entries.delete(key);
        diskGeneration++;
        void invalidateCatalogDisk(candidate => candidate === key);
      }
      throw error;
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
        // A route transition releases the prefetch just before the next page subscribes.
        setTimeout(() => {
          if (entry.consumers || entry.settled || requests.get(key) !== entry) return;
          entry.controller.abort();
          requests.delete(key);
        }, 0);
      }
    };
    const abort = () => { release(); reject(new DOMException('Aborted', 'AbortError')); };
    signal?.addEventListener('abort', abort, { once: true });
    entry.promise.then(value => { if (!released) { release(); resolve(value); } },
      error => { if (!released) { release(); reject(error); } });
  });
}
if (typeof window !== 'undefined') {
  onStaffAccessTokenChange(() => invalidate(key => catalogAffected(key, null, { scope: 'staff' })));
  if (typeof BroadcastChannel !== 'undefined') {
    channel = new BroadcastChannel('daja-public-catalog-v2');
    channel.onmessage = event => { if (event.data) handleCatalogInvalidation(event.data, false); };
  }
  window.addEventListener('daja:products-changed', event => {
    const { type, product, slug, id, previousSlug, staff, cacheInvalidated } = event.detail || {};
    if (cacheInvalidated && !previousSlug) return;
    handleCatalogInvalidation({ type, slug: slug || product?.slug, id: id || product?.id,
      productId: product?.productId, previousSlug, ...(staff ? { staff: true } : {}) });
  });
  window.addEventListener('daja:variant-groups-changed', () => handleCatalogInvalidation({ scope: 'variants' }));
  window.addEventListener('daja:filters-changed', () => handleCatalogInvalidation({ scope: 'filters' }));
}
