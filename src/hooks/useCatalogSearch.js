import { useCallback, useEffect, useRef, useState } from 'react';
import { catalogApi, subscribePublicCatalogRealtime } from '../services/dajaPlatform.js';
import { useConsent } from '../context/ConsentContext.jsx';

const cache = new Map();
const requests = new Map();
const invalidationListeners = new Set();
let generation = 0;
function invalidate() { generation += 1; cache.clear(); invalidationListeners.forEach(notify => notify()); }
function cached(key) {
  const entry = cache.get(key);
  return entry?.expires > Date.now() ? entry.data : null;
}
function remember(key, data) {
  const cards = [...data.items, ...(data.similar || []).map(item => item.product), ...(data.recommendations || [])];
  const saleExpiry = Math.min(...cards.map(item => Date.parse(item.saleValidUntil)).filter(Number.isFinite));
  const serverExpiry = Number.isFinite(data.cacheUntil) ? data.cacheUntil : Infinity;
  cache.delete(key);
  cache.set(key, { data, expires: Math.min(Date.now() + 8000, saleExpiry, serverExpiry) });
  while (cache.size > 64) cache.delete(cache.keys().next().value);
}
// Share identical requests across the header and results page. Abort only when
// the last consumer leaves, including React's immediate effect remount.
function acquire(key, params) {
  const requestKey = `${generation}:${key}`;
  let entry = requests.get(requestKey);
  if (!entry) {
    const controller = new AbortController();
    const revision = generation;
    entry = { controller, users: 0, cancel: null };
    entry.promise = catalogApi.search(params, { signal: controller.signal }).then(data => {
      if (!controller.signal.aborted && generation === revision) remember(key, data);
      return data;
    }).finally(() => { if (requests.get(requestKey) === entry) requests.delete(requestKey); });
    requests.set(requestKey, entry);
  }
  window.clearTimeout(entry.cancel);
  entry.users += 1;
  return { promise: entry.promise, release() {
    entry.users -= 1;
    if (!entry.users) entry.cancel = window.setTimeout(() => {
      if (!entry.users) {
        entry.controller.abort();
        if (requests.get(requestKey) === entry) requests.delete(requestKey);
      }
    }, 0);
  } };
}

export default function useCatalogSearch({ q = '', mode = 'suggestions', department, sort = 'relevance', cursor, enabled = true, literal = false }) {
  const { hasDecision } = useConsent();
  const [state, setState] = useState({ data: null, loading: false, error: null });
  const [attempt, setAttempt] = useState(0);
  const previousQuery = useRef('');
  const retry = useCallback(invalidate, []);
  const effectiveQuery = q.trim().slice(0, 120);
  const active = enabled && effectiveQuery.length >= 2;
  const context = JSON.stringify([mode, department, sort, cursor, literal]);
  const key = JSON.stringify([effectiveQuery.toLowerCase(), context]);
  useEffect(() => {
    if (!active) { previousQuery.current = ''; setState({ data: null, loading: false, error: null }); return undefined; }
    const stored = cached(key);
    const previous = previousQuery.current;
    previousQuery.current = effectiveQuery;
    if (stored) { setState({ key, context, revision: generation, data: stored, loading: false, error: null }); return undefined; }
    const revision = generation;
    // Keep a stable set of cards while the next query is in flight.
    setState(current => ({ key, context, revision,
      data: mode === 'suggestions' && current.context === context && current.revision === revision ? current.data : null,
      loading: true, error: null }));
    let cancelled = false;
    let request;
    const delay = mode === 'suggestions' && Math.abs(effectiveQuery.length - previous.length) <= 1 ? 120 : 0;
    const timer = window.setTimeout(async () => {
      request = acquire(key, { q: effectiveQuery, mode, department, sort, cursor, literal: literal ? 'yes' : 'no' });
      try {
        const data = await request.promise;
        if (!cancelled && revision === generation) setState({ key, context, revision, data, loading: false, error: null });
      } catch (error) {
        if (!cancelled && error.name !== 'AbortError') setState({ key, context, revision, data: null, loading: false, error });
      }
    }, delay);
    return () => { cancelled = true; window.clearTimeout(timer); request?.release(); };
  }, [active, key, context, effectiveQuery, mode, department, sort, cursor, literal, attempt]);
  useEffect(() => {
    if (!active) return undefined;
    const notify = () => setAttempt(value => value + 1);
    invalidationListeners.add(notify);
    const onFocus = () => { if (document.visibilityState === 'visible' && !cached(key)) setAttempt(value => value + 1); };
    const refresh = invalidate;
    const events = ['daja:products-changed', 'daja:filters-changed', 'daja:variant-groups-changed'];
    events.forEach(event => window.addEventListener(event, refresh));
    window.addEventListener('focus', onFocus);
    const unsubscribe = hasDecision ? subscribePublicCatalogRealtime(event => {
      if (['product.updated', 'catalog.variant-groups.updated'].includes(event.event)) refresh();
    }) : null;
    return () => {
      invalidationListeners.delete(notify);
      events.forEach(event => window.removeEventListener(event, refresh));
      window.removeEventListener('focus', onFocus);
      unsubscribe?.();
    };
  }, [active, key, hasDecision]);
  const current = active && state.key === key && state.revision === generation;
  const stored = active ? cached(key) : null;
  const retained = active && mode === 'suggestions' && state.context === context && state.revision === generation ? state.data : null;
  return { data: stored || (current ? state.data : retained),
    loading: active && !stored && (!current || state.loading), error: current ? state.error : null, retry };
}
