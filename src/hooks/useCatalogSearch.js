import { useCallback, useEffect, useState } from 'react';
import { catalogApi, subscribePublicCatalogRealtime } from '../services/dajaPlatform.js';
import { useConsent } from '../context/ConsentContext.jsx';

const cache = new Map();
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
  while (cache.size > 32) cache.delete(cache.keys().next().value);
}

export default function useCatalogSearch({ q = '', mode = 'suggestions', department, sort = 'relevance', cursor, seed = 'catalog', enabled = true, literal = false }) {
  const { hasDecision } = useConsent();
  const [state, setState] = useState({ data: null, loading: false, error: null });
  const [attempt, setAttempt] = useState(0);
  const retry = useCallback(() => { cache.clear(); setAttempt((value) => value + 1); }, []);
  const query = q.trim().slice(0, 120);
  const effectiveQuery = query.length >= 2 ? query : '';
  const key = JSON.stringify([effectiveQuery, mode, department, sort, cursor, seed, literal]);
  useEffect(() => {
    if (!enabled) { setState({ data: null, loading: false, error: null }); return; }
    const controller = new AbortController();
    const stored = cached(key);
    if (stored) { setState({ key, data: stored, loading: false, error: null }); return undefined; }
    setState({ key, data: null, loading: true, error: null });
    const timer = window.setTimeout(async () => {
      try {
        const data = await catalogApi.search({ q: effectiveQuery, mode, department, sort, cursor, seed, literal: literal ? 'yes' : 'no' }, { signal: controller.signal });
        if (controller.signal.aborted) return;
        remember(key, data);
        setState({ key, data, loading: false, error: null });
      } catch (error) {
        if (controller.signal.aborted || error.name === 'AbortError') return;
        setState({ key, data: null, loading: false, error });
      }
    }, mode === 'suggestions' && effectiveQuery ? 200 : 0);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [enabled, key, effectiveQuery, mode, department, sort, cursor, seed, literal, attempt]);
  useEffect(() => {
    if (!enabled) return undefined;
    const onFocus = () => { if (document.visibilityState === 'visible' && !cached(key)) setAttempt(value => value + 1); };
    const refresh = () => { cache.clear(); setAttempt(value => value + 1); };
    const events = ['daja:products-changed', 'daja:filters-changed', 'daja:variant-groups-changed'];
    events.forEach(event => window.addEventListener(event, refresh));
    window.addEventListener('focus', onFocus);
    const unsubscribe = hasDecision ? subscribePublicCatalogRealtime(event => {
      if (['product.updated', 'catalog.variant-groups.updated'].includes(event.event)) refresh();
    }) : null;
    return () => {
      events.forEach(event => window.removeEventListener(event, refresh));
      window.removeEventListener('focus', onFocus);
      unsubscribe?.();
    };
  }, [enabled, key, hasDecision]);
  const current = enabled && state.key === key;
  const stored = enabled ? cached(key) : null;
  return { data: (current ? state.data : null) || stored, loading: enabled && !stored && (!current || state.loading), error: current ? state.error : null, retry };
}
