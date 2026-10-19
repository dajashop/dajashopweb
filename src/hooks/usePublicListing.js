import { backgroundCatalogAllowed, prepareCatalogRoutes, preloadCatalogImages, waitForVisibleCatalogImages } from '../services/catalogPreparation.js';
import { useEffect, useRef, useState } from 'react';
import { catalogApi, subscribePublicCatalogRealtime, subscribeStaffCatalogRealtime } from '../services/dajaPlatform.js';
import { usePageData } from '../ssr/PageData.jsx';
import { useConsent } from '../context/ConsentContext.jsx';

const cache = new Map();
const requests = new Map();
const TTL = 60_000;
let generation = 0;
let foregroundRequests = 0;
function remember(key, data) {
  cache.delete(key);
  const saleExpiry = Math.min(...data.items.map(item => Date.parse(item.saleValidUntil)).filter(Number.isFinite));
  cache.set(key, { data, expires: Math.min(Date.now() + TTL, saleExpiry), retainUntil: Math.min(Date.now() + 5 * TTL, saleExpiry) });
  while (cache.size > 24) cache.delete(cache.keys().next().value);
}
function cached(key, fresh = false) {
  const entry = cache.get(key);
  return entry && (fresh ? entry.expires : entry.retainUntil) > Date.now() ? entry.data : null;
}
function invalidate() {
  generation++;
  cache.clear();
  for (const entry of requests.values()) entry.controller.abort();
  requests.clear();
}
function requestListing(route, admin, signal) {
  const key = admin ? `admin:${route}` : route;
  let entry = requests.get(key);
  if (!entry) {
    const controller = new AbortController();
    const started = generation;
    entry = { controller, consumers: 0, settled: false };
    entry.promise = (admin ? catalogApi.adminListing(route, controller.signal) : catalogApi.listing(route, controller.signal))
      .then(data => {
        if (!controller.signal.aborted && started === generation) remember(key, data);
        return data;
      }).finally(() => {
        entry.settled = true;
        if (requests.get(key) === entry) requests.delete(key);
      });
    requests.set(key, entry);
  }
  window.clearTimeout(entry.releaseTimer);
  entry.consumers++;
  return new Promise((resolve, reject) => {
    let released = false;
    const release = () => {
      if (released) return;
      released = true;
      signal.removeEventListener('abort', abort);
      entry.consumers--;
      if (!entry.consumers && !entry.settled) {
        entry.releaseTimer = window.setTimeout(() => {
          if (!entry.consumers && !entry.settled) {
            entry.controller.abort();
            if (requests.get(key) === entry) requests.delete(key);
          }
        }, 150);
      }
    };
    const abort = () => { release(); reject(new DOMException('Aborted', 'AbortError')); };
    entry.promise.then(data => { if (!released) { release(); resolve(data); } }, error => { if (!released) { release(); reject(error); } });
    if (signal.aborted) abort(); else signal.addEventListener('abort', abort, { once: true });
  });
}
if (typeof window !== 'undefined') {
  ['daja:products-changed', 'daja:variant-groups-changed', 'daja:filters-changed']
    .forEach(event => window.addEventListener(event, invalidate));
}
export default function usePublicListing(route, seedField, enabled = true, includeHiddenForAdmin = false) {
  const page = usePageData();
  const { hasDecision } = useConsent();
  const seed = page?.data?.[seedField];
  const cacheKey = includeHiddenForAdmin ? `admin:${route}` : route;
  const department = route.startsWith('page?') ? new URLSearchParams(route.slice(5)).get('department') : seedField;
  // Never carry hidden/admin cards into a public view or another department.
  const scope = `${includeHiddenForAdmin ? 'admin' : 'public'}:${department}`;
  const initial = page?.hydrating && !includeHiddenForAdmin && seed?.requestKey === route ? seed : null;
  const [state, setState] = useState(() => ({ route: cacheKey, request: cacheKey, scope, data: initial || cached(cacheKey), error: null, pending: !(initial || cached(cacheKey)) }));
  const [revision, setRevision] = useState(0);
  const first = useRef(true);
  const current = state.route === cacheKey ? state.data : cached(cacheKey);
  // Public cards may remain while the same route gains staff access. Never
  // carry hidden cards back into a public scope or another department.
  const promotingPublic = includeHiddenForAdmin && state.scope === `public:${department}` && state.route === route;
  const data = current || (state.scope === scope || promotingPublic ? state.data : null);
  const displayingPrevious = !current && Boolean(data) && !promotingPublic;
  const previousRoute = state.route.replace(/^admin:/, '');
  const changingPage = displayingPrevious && route.startsWith('page?') && previousRoute.startsWith('page?')
    && new URLSearchParams(route.slice(5)).get('page') !== new URLSearchParams(previousRoute.slice(5)).get('page');
  const error = state.request === cacheKey ? state.error : null;
  const busy = enabled && !error && (state.request !== cacheKey || state.pending || !current);
  useEffect(() => {
    if (!enabled) return undefined;
    const controller = new AbortController();
    const stored = cached(cacheKey) || (first.current && initial);
    first.current = false;
    if (stored) {
      if (stored === initial && !cached(cacheKey)) remember(cacheKey, stored);
      setState({ route: cacheKey, request: cacheKey, scope, data: stored, error: null, pending: false });
    }
    let sequence = 0;
    const load = async () => {
      const requestSequence = ++sequence;
      setState(previous => ({ ...previous, request: cacheKey, pending: true, error: null }));
      foregroundRequests++;
      try {
        const result = await requestListing(route, includeHiddenForAdmin, controller.signal);
        if (controller.signal.aborted || requestSequence !== sequence) return;
        setState({ route: cacheKey, request: cacheKey, scope, data: result, error: null, pending: false });
      } catch (failure) {
        if (!controller.signal.aborted && requestSequence === sequence && failure.name !== 'AbortError') {
          setState(previous => ({ ...previous, request: cacheKey, error: failure, pending: false }));
        }
      } finally { foregroundRequests--; }
    };
    if (!cached(cacheKey, true)) void load();
    const refresh = () => { void load(); };
    const onFocus = () => { if (document.visibilityState === 'visible' && !cached(cacheKey, true)) void load(); };
    window.addEventListener('focus', onFocus);
    const events = ['daja:products-changed', 'daja:variant-groups-changed', 'daja:filters-changed'];
    events.forEach(event => window.addEventListener(event, refresh));
    return () => {
      controller.abort();
      window.removeEventListener('focus', onFocus);
      events.forEach(event => window.removeEventListener(event, refresh));
    };
  }, [route, cacheKey, scope, enabled, revision, includeHiddenForAdmin]);
  useEffect(() => {
    if (!enabled || !hasDecision) return undefined;
    const subscribe = includeHiddenForAdmin ? subscribeStaffCatalogRealtime : subscribePublicCatalogRealtime;
    return subscribe(event => {
      if (['product.updated', 'catalog.variant-groups.updated'].includes(event.event)) {
        invalidate(); setRevision(value => value + 1);
      }
    });
  }, [enabled, hasDecision, includeHiddenForAdmin]);
  useEffect(() => {
    if (!enabled || !current || state.route !== cacheKey || state.pending || !route.startsWith('page?') || !backgroundCatalogAllowed()) return undefined;
    const pages = Math.max(1, Math.ceil(current.total / current.perPage));
    const controller = new AbortController();
    const { signal } = controller;
    let timer;
    let started = false;
    const start = async () => {
      if (signal.aborted || started) return;
      if (foregroundRequests || document.visibilityState !== 'visible') {
        timer = window.setTimeout(start, 500); return;
      }
      started = true;
      try {
        // Finish this page's images before warming exactly one full page.
        await waitForVisibleCatalogImages(cacheKey, signal);
        if (signal.aborted) return;
        await preloadCatalogImages(current.items, signal);
        if (signal.aborted) return;
        const gallery = preloadCatalogImages(current.items, signal, { gallery: true, concurrency: 2 }).catch(() => {});
        if (current.page >= pages) { await gallery; return; }
        const params = new URLSearchParams(route.slice(5));
        params.set('page', String(current.page + 1));
        const next = `page?${params}`;
        const nextKey = includeHiddenForAdmin ? `admin:${next}` : next;
        let preparation = Promise.resolve();
        if (current.page + 2 <= pages) {
          const later = new URLSearchParams(params);
          later.set('page', String(current.page + 2));
          // Only IDs and order for the page after next, in parallel with the
          // full next page. A missing preparation endpoint cannot block it.
          preparation = prepareCatalogRoutes([`page?${later}`], includeHiddenForAdmin, signal).catch(() => {});
        }
        const nextPage = cached(nextKey, true) || await requestListing(next, includeHiddenForAdmin, signal);
        if (signal.aborted) return;
        await preloadCatalogImages(nextPage.items, signal);
        await Promise.all([preparation, gallery]);
      } catch { /* Speculation must never interrupt foreground navigation. */ }
    };
    timer = window.setTimeout(start, 150);
    return () => { controller.abort(); window.clearTimeout(timer); };
  }, [route, cacheKey, current, state.route, state.pending, enabled, includeHiddenForAdmin]);
  useEffect(() => {
    if (!enabled || !current) return undefined;
    const expiries = current.items.filter(item => item.salePrice && item.saleValidUntil)
      .map(item => Date.parse(item.saleValidUntil) - Date.now()).filter(delay => Number.isFinite(delay) && delay > 0);
    if (!expiries.length) return undefined;
    const timer = window.setTimeout(() => { invalidate(); setRevision(value => value + 1); },
      Math.min(Math.min(...expiries) + 50, 2_147_483_647));
    return () => window.clearTimeout(timer);
  }, [enabled, current]);
  const retry = () => { invalidate(); setRevision(value => value + 1); };
  return { data, retry, displayingPrevious, changingPage, loading: enabled && !data && !error, updating: Boolean(data) && busy, error };
}
