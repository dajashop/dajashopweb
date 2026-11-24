import { isPreferenceStorageAllowed } from './consentStorage.js';

export function persistentCatalogKey(key) {
  if (/^product:public:[^:]+$/.test(key)) return 'product';
  if (key === 'listing:home') return 'listing';
  if (!key.startsWith('listing:page?')) return null;
  const query = new URLSearchParams(key.slice('listing:page?'.length));
  if (!['', '/catalog', '/muski-satovi', '/zenski-satovi', '/naocare', '/baterije', '/daljinski'].includes(query.get('pathname') || '') || query.get('page') !== '1' || !['', 'sort=newest'].includes(query.get('params') || '')) return null;
  return 'listing';
}

let database;
let connection;
let generation = 0;
let expiryTimer;
const DATABASE_NAME = 'daja-public-catalog-v2';

// Revocation also cancels transactions already waiting for IndexedDB to open.
export function clearCatalogDisk() {
  generation++;
  clearTimeout(expiryTimer);
  connection?.close();
  connection = undefined;
  database = undefined;
  if (typeof indexedDB === 'undefined') return;
  try {
    const request = indexedDB.deleteDatabase(DATABASE_NAME);
    request.onerror = () => { /* Browser storage may be blocked. */ };
  } catch { /* No persistent storage is required to browse the shop. */ }
}

if (typeof window !== 'undefined') window.addEventListener('daja:consent-state', event => {
  if (event.detail.ready && !event.detail.preferences) clearCatalogDisk();
});

function allowed() {
  return isPreferenceStorageAllowed() && import.meta.env.VITE_DAJA_CATALOG_LOCAL_V2 !== 'false';
}

function openCache() {
  if (typeof indexedDB === 'undefined' || !allowed()) return Promise.resolve(null);
  const current = generation;
  database ??= new Promise(resolve => {
    const request = indexedDB.open(DATABASE_NAME, 1);
    request.onupgradeneeded = () => {
      if (!allowed() || current !== generation) { request.transaction.abort(); return; }
      request.result.createObjectStore('entries', { keyPath: 'key' });
      request.result.createObjectStore('index', { keyPath: 'key' });
    };
    request.onsuccess = () => {
      if (!allowed() || current !== generation) { request.result.close(); resolve(null); return; }
      connection = request.result;
      request.result.onversionchange = () => { request.result.close(); connection = undefined; database = undefined; };
      resolve(request.result);
      // Sweep retained entries after reopening a browser, even on a read-only
      // visit. Expiry timers cannot run while the browser is closed.
      queueMicrotask(() => void invalidateCatalogDisk(() => false));
    };
    request.onerror = request.onblocked = () => resolve(null);
  }).catch(() => null);
  return database;
}

export async function readCatalogDisk(key) {
  try {
    if (!persistentCatalogKey(key)) return null;
    const db = await openCache();
    if (!db || !allowed()) return null;
    const current = generation;
    return await new Promise(resolve => {
      const request = db.transaction('entries').objectStore('entries').get(key);
      request.onsuccess = () => resolve(allowed() && current === generation && request.result?.retainUntil > Date.now() ? request.result : null);
      request.onerror = () => resolve(null);
    });
  } catch { return null; }
}

export async function writeCatalogDisk(key, entry, isCurrent) {
  try {
    const kind = persistentCatalogKey(key);
    if (!kind || !entry.value?._catalogCache || entry.value._catalogStale) return;
    const db = await openCache();
    if (!db || !allowed() || !isCurrent() || entry.retainUntil <= Date.now()) return;
    // Reviews can contain names and other personal data. Keep detail pages in
    // memory when they include reviews, preserving their full online display.
    if (kind === 'product' && ((entry.value.reviews?.length || 0) > 0 || (entry.value.publishedReviews?.length || 0) > 0)) return;
    const current = generation;
    const record = { ...entry, key, kind, touchedAt: Date.now() };
    record.bytes = new Blob([JSON.stringify(record)]).size;
    if (record.bytes > 256 * 1024) return;
    const tx = db.transaction(['entries', 'index'], 'readwrite');
    const store = tx.objectStore('entries');
    const index = tx.objectStore('index');
    const list = index.getAll();
    list.onsuccess = () => {
      if (!allowed() || current !== generation || !isCurrent()) { tx.abort(); return; }
      const existingEntry = list.result.find(existing => existing.key === key);
      if (existingEntry?.generatedAt > entry.value._catalogCache.generatedAt) return;
      const item = entry.value;
      const summary = { key, kind, bytes: record.bytes, touchedAt: record.touchedAt, retainUntil: entry.retainUntil,
        generatedAt: item._catalogCache.generatedAt, product: kind === 'product' ? { id: item.id, productId: item.productId, slug: item.slug } : null };
      store.put(record);
      index.put(summary);
      const candidates = [summary, ...list.result.filter(item => item.key !== key)].sort((a, b) => b.touchedAt - a.touchedAt);
      const counts = { listing: 0, product: 0 };
      let bytes = 0;
      for (const candidate of candidates) {
        if (candidate.retainUntil <= Date.now() || counts[candidate.kind] === (candidate.kind === 'listing' ? 3 : 40) ||
            bytes + candidate.bytes > 4 * 1024 * 1024) {
          store.delete(candidate.key);
          index.delete(candidate.key);
        } else {
          counts[candidate.kind]++;
          bytes += candidate.bytes;
        }
      }
      clearTimeout(expiryTimer);
      const nextExpiry = Math.min(...candidates.filter(item => item.retainUntil > Date.now()).map(item => item.retainUntil));
      if (Number.isFinite(nextExpiry)) expiryTimer = setTimeout(() => void invalidateCatalogDisk(() => false), Math.max(0, nextExpiry - Date.now()) + 50);
    };
  } catch { /* Private browsing or storage pressure leaves the memory cache available. */ }
}

export async function invalidateCatalogDisk(matches) {
  try {
    const db = await openCache();
    if (!db || !allowed()) return;
    const current = generation;
    const tx = db.transaction(['entries', 'index'], 'readwrite');
    const store = tx.objectStore('entries');
    const request = tx.objectStore('index').openCursor();
    let nextExpiry = Infinity;
    tx.oncomplete = () => {
      clearTimeout(expiryTimer);
      if (allowed() && current === generation && Number.isFinite(nextExpiry))
        expiryTimer = setTimeout(() => void invalidateCatalogDisk(() => false), Math.max(0, nextExpiry - Date.now()) + 50);
    };
    request.onsuccess = () => {
      const cursor = request.result;
      if (!cursor) return;
      if (!allowed() || current !== generation) { tx.abort(); return; }
      if (cursor.value.retainUntil <= Date.now() || matches(cursor.key, cursor.value.product)) {
        cursor.delete();
        store.delete(cursor.key);
      } else nextExpiry = Math.min(nextExpiry, cursor.value.retainUntil);
      cursor.continue();
    };
  } catch { /* Public catalog remains available without persistent storage. */ }
}
