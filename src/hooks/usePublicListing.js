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
  cache.set(key, { data, expires: Math.min(Date.now() + TTL, saleExpiry) });
  while (cache.size > 24) cache.delete(cache.keys().next().value);
}
function cached(key) {
  const entry = cache.get(key);
  return entry?.expires > Date.now() ? entry.data : null;
}
function invalidate() {
  generation++;
  cache.clear();
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
  entry.consumers++;
  return new Promise((resolve, reject) => {
    let released = false;
    const release = () => {
      if (released) return;
      released = true;
      signal.removeEventListener('abort', abort);
      entry.consumers--;
      if (!entry.consumers && !entry.settled) {
        entry.controller.abort();
        if (requests.get(key) === entry) requests.delete(key);
      }
    };
    const abort = () => { release(); reject(new DOMException('Aborted', 'AbortError')); };
    entry.promise.then(data => { if (!released) { release(); resolve(data); } }, error => { if (!released) { release(); reject(error); } });
    if (signal.aborted) abort(); else signal.addEventListener('abort', abort, { once: true });
  });
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
  const [state, setState] = useState(() => ({ route: cacheKey, request: cacheKey, scope, data: initial, error: null, pending: !initial }));
  const [revision, setRevision] = useState(0);
  const first = useRef(true);
  const current = state.route === cacheKey ? state.data : cached(cacheKey);
  const data = current || (state.scope === scope ? state.data : null);
  const error = state.request === cacheKey ? state.error : null;
  const busy = enabled && !error && (state.request !== cacheKey || state.pending || !current);
  useEffect(() => {
    if (!enabled) return undefined;
    const controller = new AbortController();
    const stored = cached(cacheKey) || (first.current && initial);
    first.current = false;
    if (stored) {
      if (!cached(cacheKey)) remember(cacheKey, stored);
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
    if (!stored) void load();
    const refresh = () => { invalidate(); void load(); };
    const onFocus = () => { if (document.visibilityState === 'visible' && !cached(cacheKey)) void load(); };
    window.addEventListener('focus', onFocus);
    const events = ['daja:products-changed', 'daja:variant-groups-changed', 'daja:filters-changed'];
    events.forEach(event => window.addEventListener(event, refresh));
    return () => {
      controller.abort();
      window.removeEventListener('focus', onFocus);
      events.forEach(event => window.removeEventListener(event, refresh));
    };
  }, [route, cacheKey, scope, enabled, revision, includeHiddenForAdmin, initial]);
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
    if (!enabled || includeHiddenForAdmin || !current || state.route !== cacheKey || !route.startsWith('page?')) return undefined;
    const connection = navigator.connection;
    if (connection?.saveData || ['slow-2g', '2g'].includes(connection?.effectiveType)) return undefined;
    const pages = Math.max(1, Math.ceil(current.total / current.perPage));
    if (current.page >= pages) return undefined;
    let idle;
    const prefetch = () => {
      if (foregroundRequests || document.visibilityState !== 'visible') return;
      const params = new URLSearchParams(route.slice(5));
      params.set('page', String(current.page + 1));
      const next = `page?${params}`;
      // Reuse an ongoing prefetch if the visitor navigates to this page.
      if (!cached(next)) void requestListing(next, false, new AbortController().signal).catch(() => {});
    };
    const timer = window.setTimeout(() => {
      if (window.requestIdleCallback) idle = window.requestIdleCallback(prefetch, { timeout: 2000 });
      else prefetch();
    }, 1000);
    return () => { window.clearTimeout(timer); if (idle !== undefined) window.cancelIdleCallback(idle); };
  }, [route, cacheKey, current, state.route, enabled, includeHiddenForAdmin]);
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
  return { data, retry, loading: enabled && !data && !error, updating: Boolean(data) && busy, error };
}
