import { useCallback, useEffect, useState, useMemo } from 'react';
import { subscribeProducts } from '../services/products';

export default function useProducts(params = {}) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // Stabilizujemo parametre da ne bi izazivali re-render petlju
  // Mentor napomena: Ovo je odlično rešeno sa JSON.stringify
  const memoizedParams = useMemo(() => params, [JSON.stringify(params)]);

  useEffect(() => {
    setLoading(true);
    setErr(null);

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
      order: memoizedParams.order || 'name',
      limit: memoizedParams.limit || 32, // Default limit ako nije naveden
      ...memoizedParams,
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
  }, []);

  const refresh = useCallback(() => setRefreshKey((key) => key + 1), []);
  return { items, loading, err, refresh };
}
