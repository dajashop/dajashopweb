import { catalogImageSrcSet } from '../utils/catalogImages.js';
import { apiRequest } from './apiClient.js';
import { requestResource } from './catalogResourceCache.js';

let foreground = 0;
let lastForeground = 0;
export function beginCatalogForeground() {
  foreground += 1;
  lastForeground = Date.now();
  let ended = false;
  return () => { if (!ended) { ended = true; foreground -= 1; lastForeground = Date.now(); } };
}
function pause(signal, delay = 150) {
  return new Promise((resolve, reject) => {
    if (signal.aborted) { reject(new DOMException('Aborted', 'AbortError')); return; }
    const abort = () => { window.clearTimeout(timer); reject(new DOMException('Aborted', 'AbortError')); };
    const timer = window.setTimeout(() => { signal.removeEventListener('abort', abort); resolve(); }, delay);
    signal.addEventListener('abort', abort, { once: true });
  });
}
// Every speculative batch/image yields to current navigation, filters and photos.
export async function waitForCatalogPriority(signal) {
  while (!signal.aborted) {
    const root = document.querySelector('[data-catalog-listing]');
    if (foreground || document.visibilityState !== 'visible' || !root || root.getAttribute('aria-busy') === 'true'
        || root.querySelector('[data-catalog-skeleton]') || Date.now() - lastForeground < 180) {
      await pause(signal); continue;
    }
    const key = root.dataset.listingKey;
    if (document.fonts?.status === 'loading') await document.fonts.ready;
    await waitForVisibleCatalogImages(key, signal);
    // Two frames let decoded images and the final card layout reach the screen.
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    if (!foreground && !signal.aborted && root.isConnected && root.dataset.listingKey === key
        && root.getAttribute('aria-busy') !== 'true' && Date.now() - lastForeground >= 180) return;
  }
  throw new DOMException('Aborted', 'AbortError');
}

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
    await waitForCatalogPriority(signal);
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
// warm page covers and extra gallery photos without gating any current card.
export async function preloadCatalogImages(items, signal, { gallery = false, concurrency = 3 } = {}) {
  const candidates = [];
  if (gallery) {
    // Round-robin: load each card's second photo before anyone's third photo.
    const depth = Math.max(0, ...items.map(item => item.images?.length || 0));
    for (let index = 1; index < depth; index++) {
      for (const item of items) {
        const image = item.images?.[index];
        candidates.push({ src: typeof image === 'string' ? image : image?.url });
      }
    }
  } else {
    candidates.push(...items.map(item => ({ src: item.thumbnailUrl || item.images?.[0]?.thumb
      || item.images?.[0]?.url || item.primaryImageUrl || item.mainImageUrl || item.image,
      srcSet: catalogImageSrcSet(item.images?.[0]) })));
  }
  const urls = [...new Map(candidates.filter(item => item.src).map(item => [item.src, item])).values()].filter(item => (warmedImages.get(item.src) || 0) < Date.now());
  let cursor = 0;
  const worker = async () => {
    while (!signal.aborted && cursor < urls.length) {
      await waitForCatalogPriority(signal);
      if (signal.aborted || cursor >= urls.length) return;
      const { src, srcSet } = urls[cursor++];
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
        img.decoding = 'async'; img.fetchPriority = 'low';
        if (srcSet) { img.srcset = srcSet; img.sizes = '320px'; }
        img.src = src;
        if (img.complete) done();
      });
    }
  };
  await Promise.all(Array.from({ length: Math.min(concurrency, urls.length) }, worker));
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
  if (!signal.aborted) await Promise.all(images.filter(img => img.naturalWidth > 0).map(img => img.decode?.().catch(() => {})));
}

if (typeof window !== 'undefined') {
  ['daja:products-changed', 'daja:variant-groups-changed', 'daja:filters-changed']
    .forEach(event => window.addEventListener(event, () => plans.clear()));
}
