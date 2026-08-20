import { useCallback, useEffect, useState, useMemo } from 'react';
import { applyPublicProductRealtimeEvent, subscribeProducts } from '../services/products';
import { subscribePublicCatalogRealtime } from '../services/dajaPlatform';

export default function useProducts(params = {}) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // Stabilizujemo parametre da ne bi izazivali re-render petlju
  // Mentor napomena: Ovo je odlično rešeno sa JSON.stringify
  const memoizedParams = useMemo(() => params, [JSON.stringify(params)]);
  // A public page can be viewed by an administrator, but that must not turn
  // off the storefront's live catalog updates.
  const usePublicRealtime = memoizedParams.publicRealtime ?? !memoizedParams.admin;

  useEffect(() => {
    setLoading(true);
    setErr(null);

    const { publicRealtime: _publicRealtime, ...requestParams } = memoizedParams;
    const unsub = subscribeProducts({
      onData: (arr) => {
        setItems(arr);
        setLoading(false);
      },
      onError: (e) => {
        setErr(e);
        setLoading(false);
      },
      // Prosleđujemo SVE parametre servisu (limit, category, itd.), a ne samo order
      order: requestParams.order || 'name',
      limit: requestParams.limit || 32, // Default limit ako nije naveden
      ...requestParams,
    });

    return () => unsub?.();
  }, [memoizedParams, refreshKey]);

  useEffect(() => {
    const applyProductChange = (event) => {
      const change = event.detail;
      // Compatibility with events from an older bundle. Only those events
      // require a complete refresh because they do not identify a product.
      if (!change?.type) {
        setRefreshKey((key) => key + 1);
        return;
      }
      if (change.type === 'delete' && change.id) {
        setItems((current) => current.filter((item) => item.id !== change.id));
        return;
      }
      if (change.type === 'deleteBySlug' && change.slug) {
        // This event comes from the public endpoint returning null for a
        // hidden product. A staff-only list may keep hidden products, but an
        // admin view that explicitly opted into public realtime must mirror
        // the published catalog deletion as well.
        if (memoizedParams.admin && !usePublicRealtime) return;
        setItems((current) => current.filter((item) => item.slug !== change.slug));
        return;
      }
      if (change.type === 'upsert' && change.product?.id) {
        setItems((current) => {
          const index = current.findIndex((item) => item.id === change.product.id);
          if (index === -1) {
            // A newly created product can be shown immediately without
            // downloading every other product again.
            return change.created ? [change.product, ...current] : current;
          }
          const next = [...current];
          next[index] = { ...next[index], ...change.product };
          return next;
        });
      }
    };
    window.addEventListener('daja:products-changed', applyProductChange);
    return () => window.removeEventListener('daja:products-changed', applyProductChange);
  }, [memoizedParams.admin, usePublicRealtime]);

  useEffect(() => {
    if (!usePublicRealtime) return undefined;
    return subscribePublicCatalogRealtime(
      (event) => { void applyPublicProductRealtimeEvent(event); },
      () => {},
    );
  }, [usePublicRealtime]);

  // A timed sale can end without an admin request. Refresh only the affected
  // product at that exact time; never reload the whole catalog.
  useEffect(() => {
    if (!usePublicRealtime) return undefined;
    const timers = items
      .filter((item) => item.salePrice && item.saleValidUntil && item.slug)
      .map((item) => {
        const delay = new Date(item.saleValidUntil).getTime() - Date.now();
        if (!Number.isFinite(delay) || delay <= 0) return null;
        return window.setTimeout(() => {
          void applyPublicProductRealtimeEvent({ slug: item.slug });
        }, Math.min(delay + 50, 2_147_483_647));
      })
      .filter(Boolean);
    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [items, usePublicRealtime]);

  const refresh = useCallback(() => setRefreshKey((key) => key + 1), []);
  return { items, loading, err, refresh };
}
