export function persistentCatalogKey(key) {
  if (/^product:public:[^:]+$/.test(key)) return 'product';
  if (key === 'listing:home') return 'listing';
  if (!key.startsWith('listing:page?')) return null;
  const query = new URLSearchParams(key.slice('listing:page?'.length));
  if (!['', '/catalog', '/muski-satovi', '/zenski-satovi', '/naocare', '/baterije', '/daljinski'].includes(query.get('pathname') || '') || query.get('page') !== '1' || !['', 'sort=newest'].includes(query.get('params') || '')) return null;
  return 'listing';
}

let database;
function openCache() {
  if (typeof indexedDB === 'undefined' || import.meta.env.VITE_DAJA_CATALOG_LOCAL_V2 === 'false') return Promise.resolve(null);
  database ??= new Promise(resolve => {
    const request = indexedDB.open('daja-public-catalog-v2', 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore('entries', { keyPath: 'key' });
      request.result.createObjectStore('index', { keyPath: 'key' });
    };
    request.onsuccess = () => {
      request.result.onversionchange = () => { request.result.close(); database = undefined; };
      resolve(request.result);
    };
    request.onerror = request.onblocked = () => resolve(null);
  }).catch(() => null);
  return database;
}

export async function readCatalogDisk(key) {
  try {
    if (!persistentCatalogKey(key)) return null;
    const db = await openCache();
    if (!db) return null;
    return await new Promise(resolve => {
      const request = db.transaction('entries').objectStore('entries').get(key);
      request.onsuccess = () => resolve(request.result?.retainUntil > Date.now() ? request.result : null);
      request.onerror = () => resolve(null);
    });
  } catch { return null; }
}

export async function writeCatalogDisk(key, entry, isCurrent) {
  try {
    const kind = persistentCatalogKey(key);
    if (!kind || !entry.value?._catalogCache || entry.value._catalogStale) return;
    const db = await openCache();
    if (!db || !isCurrent() || entry.retainUntil <= Date.now()) return;
    const record = { ...entry, key, kind, touchedAt: Date.now() };
    record.bytes = new Blob([JSON.stringify(record)]).size;
    if (record.bytes > 256 * 1024) return;
    const tx = db.transaction(['entries', 'index'], 'readwrite');
    const store = tx.objectStore('entries');
    const index = tx.objectStore('index');
    const list = index.getAll();
    list.onsuccess = () => {
      if (!isCurrent()) return;
      const current = list.result.find(existing => existing.key === key);
      if (current?.generatedAt > entry.value._catalogCache.generatedAt) return;
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
    };
  } catch { /* Private browsing or storage pressure leaves the memory cache available. */ }
}

export async function invalidateCatalogDisk(matches) {
  try {
    const db = await openCache();
    if (!db) return;
    const tx = db.transaction(['entries', 'index'], 'readwrite');
    const store = tx.objectStore('entries');
    const request = tx.objectStore('index').openCursor();
    request.onsuccess = () => {
      const cursor = request.result;
      if (!cursor) return;
      if (matches(cursor.key, cursor.value.product)) {
        cursor.delete();
        store.delete(cursor.key);
      }
      cursor.continue();
    };
  } catch { /* Public catalog remains available without persistent storage. */ }
}
