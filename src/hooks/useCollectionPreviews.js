import { useEffect, useMemo, useRef, useState } from 'react';
import { apiRequest } from '../services/apiClient';
import { normalizeProduct } from '../services/dajaPlatform.js';
import { usePageData } from '../ssr/PageData.jsx';

const refreshInterval = 30_000;
let cached;
let pending;
let revision = 0;
let lastChange;

function nextSaleExpiry(data, now) {
  const items = (data?.groups || []).flatMap(group => group.items || []);
  const expiries = items.map(item => Date.parse(item.saleValidUntil || item.sale_valid_until));
  return Math.min(...expiries.filter(expiry => expiry > now));
}

function load() {
  if (cached?.expires > Date.now()) return Promise.resolve(cached.data);
  if (!pending) {
    const requestRevision = revision;
    pending = apiRequest('/public/catalog/collections', { auth: false, signal: AbortSignal.timeout(15_000) })
      .then(data => {
        if (requestRevision !== revision) return null;
        const now = Date.now();
        cached = { data, expires: Math.min(now + refreshInterval, nextSaleExpiry(data, now)) };
        return data;
      }).finally(() => { pending = null; });
  }
  return pending;
}

export default function useCollectionPreviews(enabled = true) {
  const page = usePageData();
  const seed = page?.data?.collectionPreviews;
  const [state, setState] = useState(() => ({
    data: seed || (cached?.expires > Date.now() ? cached.data : null),
    error: false,
  }));
  const latest = useRef(state.data);
  const [now, setNow] = useState(Date.now);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!enabled) return;
    let stopped = false;
    let refreshing = false;
    let timer;
    async function refresh() {
      clearTimeout(timer);
      if (stopped || document.hidden || refreshing) return;
      refreshing = true;
      setNow(Date.now());
      let invalidated = false;
      try {
        const data = await load();
        if (stopped) return;
        invalidated = data === null;
        if (!invalidated) {
          latest.current = data;
          setState({ data, error: false });
        }
      } catch {
        if (!stopped) setState(current => ({ ...current, error: true }));
      } finally {
        refreshing = false;
        if (!stopped && !document.hidden) {
          const time = Date.now();
          const cacheExpiry = cached?.expires > time ? cached.expires : Infinity;
          const due = Math.min(time + refreshInterval, nextSaleExpiry(latest.current, time), cacheExpiry);
          timer = setTimeout(refresh, invalidated ? 0 : Math.max(1, due - time));
        }
      }
    }
    const invalidate = event => {
      if (event !== lastChange) {
        lastChange = event;
        revision++;
        cached = null;
      }
      void refresh();
    };
    void refresh();
    window.addEventListener('daja:products-changed', invalidate);
    document.addEventListener('visibilitychange', refresh);
    window.addEventListener('online', refresh);
    return () => {
      stopped = true;
      clearTimeout(timer);
      window.removeEventListener('daja:products-changed', invalidate);
      document.removeEventListener('visibilitychange', refresh);
      window.removeEventListener('online', refresh);
    };
  }, [enabled, attempt]);
  const groups = useMemo(() => (state.data?.groups || []).map(group => ({
    ...group,
    items: group.items.map(item => {
      const product = normalizeProduct(item);
      if (product.salePrice && Date.parse(product.saleValidUntil) <= now) {
        return { ...product, price: product.regularPrice ?? product.price, salePrice: null };
      }
      return product;
    }),
  })), [state.data, now]);
  return { groups, loading: !state.data && !state.error, error: state.error, retry: () => setAttempt(value => value + 1) };
}
