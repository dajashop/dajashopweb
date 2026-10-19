import { apiRequest } from './apiClient.js';
import { requestResource } from './catalogResourceCache.js';

const warmedImages = new Map();
const plans = new Map();
const planKey = (route, admin) => `catalog-plan:${admin ? 'admin' : 'public'}:${route}`;
export function backgroundCatalogAllowed() {
  const connection = navigator.connection;
  return !connection?.saveData && !['slow-2g', '2g'].includes(connection?.effectiveType);
}
export async function prepareCatalogRoutes(routes, admin, signal) {
  const missing = [...new Set(routes)].filter(route => (plans.get(planKey(route, admin))?.expires || 0) <= Date.now());
  for (let offset = 0; offset < missing.length; offset += 32) {
    if (signal.aborted) return;
    const batch = missing.slice(offset, offset + 32);
    const key = `catalog-plans:${admin}:${JSON.stringify(batch)}`;
    const result = await requestResource(key, requestSignal => apiRequest(
      admin ? '/admin/catalog/prepare' : '/public/catalog/prepare', {
        ...(admin ? { staff: true } : { auth: false }), method: 'POST', signal: requestSignal,
        body: { requests: batch.map(route => Object.fromEntries(new URLSearchParams(route.slice(5)))) },
      }), { signal, cacheResult: false });
    if (signal.aborted) return;
    if (!Array.isArray(result?.plans) || result.plans.length !== batch.length) return;
    result.plans.forEach((plan, index) => {
      const key = planKey(batch[index], admin);
      plans.delete(key); plans.set(key, { plan, expires: Date.now() + 10_000 });
      while (plans.size > 128) plans.delete(plans.keys().next().value);
    });
  }
}
// Native images paint independently in the UI. These low-priority requests
// only warm the next page and never gate rendering of any current card.
export async function preloadCatalogImages(items, signal) {
  const urls = [...new Set(items.map(item => item.thumbnailUrl || item.images?.[0]?.thumb
    || item.images?.[0]?.url || item.primaryImageUrl || item.mainImageUrl || item.image).filter(url => url && (warmedImages.get(url) || 0) < Date.now()))];
  let cursor = 0;
  const worker = async () => {
    while (!signal.aborted && cursor < urls.length) {
      const src = urls[cursor++];
      await new Promise(resolve => {
        const img = new Image();
        const done = () => {
          if (!signal.aborted && img.naturalWidth > 0) {
            warmedImages.delete(src); warmedImages.set(src, Date.now() + 5 * 60_000);
            while (warmedImages.size > 192) warmedImages.delete(warmedImages.keys().next().value);
          }
          img.onload = null; img.onerror = null; signal.removeEventListener('abort', abort); resolve();
        };
        const abort = () => { done(); img.src = ''; };
        signal.addEventListener('abort', abort, { once: true });
        img.onload = done; img.onerror = done;
        img.decoding = 'async'; img.fetchPriority = 'low'; img.src = src;
        if (img.complete) done();
      });
    }
  };
  await Promise.all(Array.from({ length: Math.min(3, urls.length) }, worker));
}
export async function waitForVisibleCatalogImages(route, signal) {
  const root = document.querySelector('[data-catalog-listing]');
  if (!root || root.dataset.listingKey !== route) return;
  const images = [...root.querySelectorAll('img')].filter(img => {
    const rect = img.getBoundingClientRect();
    return img.loading !== 'lazy' || (rect.top < window.innerHeight && rect.bottom > 0);
  });
  await Promise.all(images.map(img => new Promise(resolve => {
    if (img.complete || signal.aborted) { resolve(); return; }
    const done = () => {
      img.removeEventListener('load', done); img.removeEventListener('error', done);
      signal.removeEventListener('abort', done); resolve();
    };
    img.addEventListener('load', done, { once: true }); img.addEventListener('error', done, { once: true });
    signal.addEventListener('abort', done, { once: true });
  })));
}

if (typeof window !== 'undefined') {
  ['daja:products-changed', 'daja:variant-groups-changed', 'daja:filters-changed']
    .forEach(event => window.addEventListener(event, () => plans.clear()));
}
