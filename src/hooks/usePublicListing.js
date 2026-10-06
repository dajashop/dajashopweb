import { useEffect, useState, useRef } from 'react';
import { catalogApi, subscribePublicCatalogRealtime } from '../services/dajaPlatform.js';
import { usePageData } from '../ssr/PageData.jsx';
import { useConsent } from '../context/ConsentContext.jsx';

const cache = new Map();
const TTL = 60_000;
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
async function prefetch(route, signal) {
  if (cached(route)) return;
  const data = await catalogApi.listing(route, signal);
  if (!signal.aborted) {
    remember(route, data);
    // Warm only the card thumbnails, never every gallery image.
    data.items.forEach(item => { const image = new Image(); image.src = item.thumbnailUrl || item.image; });
  }
}
export default function usePublicListing(route, seedField, enabled = true) {
  const page = usePageData();
  const { hasDecision } = useConsent();
  const seed = page?.data?.[seedField];
  const initial = seed?.requestKey === route ? seed : null;
  const [state, setState] = useState(() => ({ route, data: initial, error: null }));
  const [revision, setRevision] = useState(0);
  const first = useRef(true);
  const data = state.route === route ? state.data : cached(route) || state.data;
  useEffect(() => {
    if (!enabled) return undefined;
    const controller = new AbortController();
    const stored = cached(route) || (first.current && initial);
    first.current = false;
    if (stored) { remember(route, stored); setState({ route, data: stored, error: null }); }
    let sequence = 0;
    const load = async () => {
      const requestSequence = ++sequence;
      try {
        const result = await catalogApi.listing(route, controller.signal);
        if (controller.signal.aborted || requestSequence !== sequence) return;
        remember(route, result);
        setState({ route, data: result, error: null });
      } catch (error) {
        if (!controller.signal.aborted && requestSequence === sequence) setState(current => ({ ...current, error }));
      }
    };
    // SSR and prefetched pages already contain complete results; revalidate
    // on focus or catalog events instead of replacing them on hydration.
    if (!stored) void load();
    const refresh = () => { cache.clear(); void load(); };
    const onFocus = () => { if (document.visibilityState === 'visible') refresh(); };
    window.addEventListener('focus', onFocus);
    window.addEventListener('daja:products-changed', refresh);
    window.addEventListener('daja:variant-groups-changed', refresh);
    return () => {
      controller.abort();
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('daja:products-changed', refresh);
      window.removeEventListener('daja:variant-groups-changed', refresh);
    };
  }, [route, enabled, revision]);
  useEffect(() => {
    if (!enabled || !hasDecision) return undefined;
    return subscribePublicCatalogRealtime(event => {
      if (['product.updated', 'catalog.variant-groups.updated'].includes(event.event)) {
        cache.clear(); setRevision(value => value + 1);
      }
    });
  }, [enabled, hasDecision]);
  useEffect(() => {
    if (!enabled || !data || state.route !== route || !route.startsWith('page?')) return undefined;
    const controller = new AbortController();
    const pages = Math.max(1, Math.ceil(data.total / data.perPage));
    const timer = window.setTimeout(() => {
      [data.page - 1, data.page + 1].filter(number => number >= 1 && number <= pages).forEach(number => {
        const params = new URLSearchParams(route.slice(5));
        params.set('page', String(number));
        void prefetch(`page?${params}`, controller.signal).catch(() => {});
      });
    }, 150);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [route, data, state.route, enabled]);
  useEffect(() => {
    if (!enabled || !data) return undefined;
    const expiries = data.items.filter(item => item.salePrice && item.saleValidUntil)
      .map(item => Date.parse(item.saleValidUntil) - Date.now()).filter(delay => Number.isFinite(delay) && delay > 0);
    if (!expiries.length) return undefined;
    const timer = window.setTimeout(() => {
      cache.clear(); setRevision(value => value + 1);
    }, Math.min(Math.min(...expiries) + 50, 2_147_483_647));
    return () => window.clearTimeout(timer);
  }, [enabled, data]);
  const retry = () => { cache.clear(); setRevision(value => value + 1); };
  return { data, retry, loading: enabled && !data && !state.error, updating: enabled && state.route !== route, error: state.error };
}
